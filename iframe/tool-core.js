import { networkLeaves, networkValue } from './tool-network.js';
import { C, EPS0, MU0 } from './tool-registry.js';
import { friisFactor } from './tool-stages.js';

function finite(value, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}
function formatNumber(value, unit = '', digits = 6) {
	if (Number.isNaN(value))
		return '无效';
	if (!Number.isFinite(value))
		return value < 0 ? '−∞' : '∞';
	const abs = Math.abs(value);
	const shown = abs !== 0 && (abs >= 1e6 || abs < 1e-3) ? value.toExponential(5) : Number(value.toPrecision(digits)).toLocaleString('zh-CN', { maximumSignificantDigits: digits });
	return `${shown}${unit ? ` ${unit}` : ''}`;
}
function fmt(number, unit = '') {
	return { number, unit, toString() {
		return formatNumber(number, unit);
	} };
}
function complexDiv(ar, ai, br, bi) {
	const d = br * br + bi * bi || Number.EPSILON;
	return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
}
function gammaFromZ(r, x, z0) {
	const [gr, gi] = complexDiv(r - z0, x, r + z0, x);
	const mag = Math.min(Math.hypot(gr, gi), 1);
	return { gr, gi, mag, phase: Math.atan2(gi, gr) * 180 / Math.PI, vswr: (1 + mag) / (1 - mag), rl: -20 * Math.log10(mag) };
}
function microstripModel(width, height, er, thickness = 0) {
	const correction = thickness > 0 ? thickness / Math.PI * Math.log(Math.max(2 * height / thickness, 1.000001)) : 0;
	const effectiveWidth = Math.max(width + correction, 1e-9);
	const u = Math.max(effectiveWidth / height, 1e-6);
	const fringe = u < 1 ? 0.04 * (1 - u) ** 2 : 0;
	const ee = (er + 1) / 2 + (er - 1) / 2 * (1 / Math.sqrt(1 + 12 / u) + fringe);
	const z = u <= 1 ? 60 / Math.sqrt(ee) * Math.log(8 / u + 0.25 * u) : 120 * Math.PI / (Math.sqrt(ee) * (u + 1.393 + 0.667 * Math.log(u + 1.444)));
	return { z, ee, effectiveWidth };
}
function ellipticK(k) {
	let a = 1;
	let b = Math.sqrt(Math.max(1 - k * k, 1e-15));
	for (let i = 0; i < 12; i++) {
		const next = (a + b) / 2;
		b = Math.sqrt(a * b);
		a = next;
	}
	return Math.PI / (2 * a);
}
function result(name, value) {
	return value && typeof value === 'object' && 'number' in value ? { name, value: String(value), number: value.number, unit: value.unit, status: Number.isNaN(value.number) ? 'invalid' : 'ok' } : { name, value: String(value), status: 'text' };
}
function fraction(value, maxDenominator) {
	let x = Math.abs(value);
	let h0 = 0;
	let h1 = 1;
	let k0 = 1;
	let k1 = 0;
	while (k1 <= maxDenominator) {
		const a = Math.floor(x);
		const h2 = a * h1 + h0;
		const k2 = a * k1 + k0;
		if (k2 > maxDenominator)
			break;
		[h0, h1, k0, k1] = [h1, h2, k1, k2];
		if (Math.abs(x - a) < 1e-12)
			break;
		x = 1 / (x - a);
	}
	return [value < 0 ? -h1 : h1, k1 || 1];
}
function calculateExtended(id, v, stages = [1, 2, 3]) {
	let out = [];
	if (id === 'legacy-voltage-divider') {
		const vo = v.vin * v.r2 / (v.r1 + v.r2);
		out = [result('输出电压', fmt(vo, 'V')), result('分压电流', fmt(v.vin / (v.r1 + v.r2) * 1e3, 'mA')), result('等效输出阻抗', fmt(v.r1 * v.r2 / (v.r1 + v.r2), 'Ω'))];
	}
	else if (id === 'legacy-ohm') {
		const current = v.voltage / v.resistance;
		out = [result('电流', fmt(current, 'A')), result('功率', fmt(v.voltage * current, 'W')), result('电导', fmt(1 / v.resistance, 'S'))];
	}
	else if (id === 'legacy-battery') {
		out = [result('估算续航', fmt(v.capacity * v.efficiency / 100 / v.load, 'h')), result('可用容量', fmt(v.capacity * v.efficiency / 100, 'mAh')), result('平均倍率', fmt(v.load / v.capacity, 'C'))];
	}
	else if (id === 'legacy-led') {
		const resistance = (v.supply - v.forward) / (v.current / 1000);
		out = [result('串联电阻', fmt(resistance, 'Ω')), result('电阻功耗', fmt((v.supply - v.forward) * v.current / 1000, 'W')), result('建议功率', fmt((v.supply - v.forward) * v.current / 500, 'W'))];
	}
	else if (id === 'legacy-lm317') {
		const voltage = 1.25 * (1 + v.r2 / v.r1) + v.iadj * 1e-6 * v.r2;
		out = [result('输出电压', fmt(voltage, 'V')), result('R1 电流', fmt(1.25 / v.r1 * 1e3, 'mA')), result('R2 功耗', fmt((voltage - 1.25) ** 2 / v.r2, 'W'))];
	}
	else if (id === 'legacy-555') {
		const c = v.c * 1e-9;
		const high = 0.693 * (v.ra + v.rb) * c;
		const low = 0.693 * v.rb * c;
		out = [result('频率', fmt(1 / (high + low), 'Hz')), result('高电平', fmt(high, 's')), result('低电平', fmt(low, 's')), result('占空比', fmt(high / (high + low) * 100, '%'))];
	}
	else if (id === 'legacy-resistor') {
		const values = [v.r1, v.r2, v.r3];
		const equivalent = v.topology === 'series' ? values.reduce((a, b) => a + b, 0) : 1 / values.reduce((a, b) => a + 1 / b, 0);
		out = [result('等效电阻', fmt(equivalent, 'Ω')), result('拓扑', v.topology === 'series' ? '串联' : '并联'), result('元件数量', '3')];
	}
	else if (id === 'legacy-capacitor') {
		const values = [v.c1, v.c2, v.c3];
		const equivalent = v.topology === 'parallel' ? values.reduce((a, b) => a + b, 0) : 1 / values.reduce((a, b) => a + 1 / b, 0);
		out = [result('等效电容', fmt(equivalent, 'nF')), result('拓扑', v.topology === 'series' ? '串联' : '并联'), result('元件数量', '3')];
	}
	else if (id === 'legacy-transistor') {
		const beta = v.ic / v.ib;
		const rc = (v.vcc - v.vce) / (v.ic / 1000);
		out = [result('直流电流增益 β', fmt(beta)), result('集电极电阻', fmt(rc, 'Ω')), result('晶体管功耗', fmt(v.vce * v.ic / 1000, 'W'))];
	}
	else if (id === 'legacy-rc-filter') {
		const rc = 1 / (2 * Math.PI * v.r * v.c * 1e-9);
		const rl = v.r / (2 * Math.PI * v.l * 1e-3);
		const lc = 1 / (2 * Math.PI * Math.sqrt(v.l * 1e-3 * v.c * 1e-9));
		out = [result(v.topology.startsWith('lc') ? '谐振频率' : '截止频率', fmt(v.topology.startsWith('rc') ? rc : v.topology.startsWith('rl') ? rl : lc, 'Hz')), result('类型', v.topology.toUpperCase()), result('模型', v.topology.startsWith('lc') ? '理想 LC 谐振；未定义阻尼和负载' : '一阶截止点幅度 1/√2')];
	}
	else if (id === 'legacy-rc-time') {
		const tau = v.r * v.c * 1e-6;
		out = [result('时间常数 τ', fmt(tau, 's')), result('充电比例', fmt((1 - Math.exp(-v.time / tau)) * 100, '%')), result('放电比例', fmt(Math.exp(-v.time / tau) * 100, '%'))];
	}
	else if (id === 'legacy-resistor-color') {
		const digits = v.bands > 4 ? 100 * v.d1 + 10 * v.d2 + v.d3 : 10 * v.d1 + v.d2;
		const resistance = digits * 10 ** v.multiplier;
		out = [result('标称电阻', fmt(resistance, 'Ω')), result('公差', fmt(v.tolerance, '%')), result('下限', fmt(resistance * (1 - v.tolerance / 100), 'Ω')), result('上限', fmt(resistance * (1 + v.tolerance / 100), 'Ω'))];
	}
	else if (id === 'legacy-current') {
		const areaInternal = (v.current / (0.024 * v.rise ** 0.44)) ** (1 / 0.725);
		const areaExternal = (v.current / (0.048 * v.rise ** 0.44)) ** (1 / 0.725);
		const thicknessMil = v.thickness / 25.4;
		const widthExternal = areaExternal / thicknessMil;
		const resistance = 1.724e-8 * (v.length / 1000) / (areaExternal * 0.00064516e-6);
		out = [result('外层线宽', fmt(widthExternal * 0.0254, 'mm')), result('内层线宽', fmt(areaInternal / thicknessMil * 0.0254, 'mm')), result('压降', fmt(resistance * v.current, 'V')), result('损耗', fmt(resistance * v.current ** 2, 'W'))];
	}
	else if (id === 'legacy-via') {
		const area = Math.PI * v.diameter * (v.plating / 1000);
		const resistance = 1.724e-8 * v.length * 1e-3 / (area * 1e-6);
		const current = 0.048 * (v.rise ** 0.44) * ((area / 0.00064516) ** 0.725);
		out = [result('铜截面积', fmt(area, 'mm²')), result('直流电阻', fmt(resistance, 'Ω')), result('估算载流', fmt(current, 'A'))];
	}
	else if (id === 'legacy-thermal') {
		out = [result('结温 / 热点温度', fmt(v.ambient + v.power * v.theta, '°C')), result('温升', fmt(v.power * v.theta, '°C')), result('最大允许功率 @125°C', fmt((125 - v.ambient) / v.theta, 'W'))];
	}
	else if (id === 'capacitor-discharge') {
		const c = v.capacitance * 1e-6;
		const time = v.resistance * c * Math.log(v.v0 / v.vt);
		out = [result('放电时间', fmt(time, 's')), result('初始电流', fmt(v.v0 / v.resistance, 'A')), result('初始功率', fmt(v.v0 ** 2 / v.resistance, 'W')), result('初始能量', fmt(0.5 * c * v.v0 ** 2, 'J'))];
	}
	else if (id === 'current-divider') {
		const conductances = stages.map(i => 1 / v[`r${i}`]);
		const totalG = conductances.reduce((a, b) => a + b, 0);
		out = conductances.map((g, i) => result(`支路 I${i + 1}`, fmt(v.total * g / totalG, 'A'))).concat(result('等效电阻', fmt(1 / totalG, 'Ω')));
	}
	else if (id === 'decimal-fraction') {
		const [n, d] = fraction(v.value, v.maxden);
		out = [result('最简分数', `${n}/${d}`), result('近似值', fmt(n / d)), result('绝对误差', fmt(Math.abs(v.value - n / d)))];
	}
	else if (id === 'reactance') {
		const xl = 2 * Math.PI * v.frequency * v.l * 1e-3;
		const xc = 1 / (2 * Math.PI * v.frequency * v.c * 1e-9);
		out = [result('感抗 XL', fmt(xl, 'Ω')), result('容抗 XC', fmt(xc, 'Ω')), result('感纳 |BL|', fmt(1 / xl, 'S')), result('容纳 |BC|', fmt(1 / xc, 'S'))];
	}
	else if (id === 'three-phase') {
		const apparent = Math.sqrt(3) * v.voltage * v.current;
		const real = apparent * v.pf;
		out = [result('视在功率', fmt(apparent, 'VA')), result('有功功率', fmt(real, 'W')), result('无功功率', fmt(apparent * Math.sqrt(1 - v.pf ** 2), 'var')), result('接法', v.connection === 'wye' ? '星形' : '三角形')];
	}
	else if (id === 'wire-size') {
		const diameter = 0.127 * 92 ** ((36 - v.awg) / 39);
		const area = Math.PI * diameter ** 2 / 4;
		const resistance = 1.724e-8 * v.length / (area * 1e-6);
		out = [result('导体直径', fmt(diameter, 'mm')), result('截面积', fmt(area, 'mm²')), result('铜电阻', fmt(resistance, 'Ω')), result('压降', fmt(resistance * v.current, 'V'))];
	}
	else if (id === 'number-conversion') {
		const integer = Math.trunc(v.value);
		const shifted = integer << Math.trunc(v.shift);
		out = [result('二进制', integer.toString(2)), result('八进制', integer.toString(8)), result('十六进制', integer.toString(16).toUpperCase()), result('左移结果', fmt(shifted))];
	}
	else if (id === 'smd-capacitor-code') {
		const code = String(v.code).trim();
		const valid = /^\d{3,4}$/.test(code);
		const pf = valid ? Number(code.slice(0, -1)) * 10 ** Number(code.slice(-1)) : Number.NaN;
		out = [result('电容值', fmt(pf, 'pF')), result('纳法', fmt(pf / 1000, 'nF')), result('微法', fmt(pf / 1e6, 'µF')), result('状态', valid ? `±${fmt(v.tolerance, '%')}` : '代码应为 3 或 4 位数字')];
	}
	else if (id === 'smd-resistor-code') {
		const code = String(v.code).trim().toUpperCase();
		const e96 = [100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976];
		const multipliers = { Z: 0.001, Y: 0.01, X: 0.1, A: 1, B: 10, C: 100, D: 1000, E: 10000, F: 100000 };
		let ohms = Number.NaN;
		let rule = '无法识别';
		if (/^\d{3,4}$/.test(code)) {
			const sig = code.length - 1;
			ohms = Number(code.slice(0, sig)) * 10 ** Number(code.slice(-1));
			rule = `${sig} 位有效数字 × 10^${code.slice(-1)}`;
		}
		else if (/^\d*R\d+$/.test(code)) {
			ohms = Number(code.replace('R', '.'));
			rule = 'R 表示小数点';
		}
		else if (/^\d{2}[A-Z]$/.test(code)) {
			const index = Number(code.slice(0, 2));
			const multiplier = multipliers[code.slice(-1)];
			if (index >= 1 && index <= 96 && multiplier !== undefined)
				ohms = e96[index - 1] * multiplier;
			rule = 'EIA-96 序号 × 字母倍率';
		}
		out = [result('电阻值', fmt(ohms, 'Ω')), result('代码', code || '—'), result('解析规则', Number.isFinite(ohms) ? rule : '请输入 472、4701、4R7 或 01C')];
	}
	else {
		const conversions = {
			'capacitance-conversion': { factors: { pF: 1, nF: 1e3, uF: 1e6, F: 1e12 }, labels: [['pF', 'pF'], ['nF', 'nF'], ['uF', 'µF'], ['F', 'F']] },
			'energy-conversion': { factors: { J: 1, Wh: 3600, kWh: 3.6e6, cal: 4.184, BTU: 1055.05585 }, labels: [['J', 'J'], ['Wh', 'Wh'], ['kWh', 'kWh'], ['BTU', 'BTU']] },
			'force-conversion': { factors: { N: 1, kN: 1000, kgf: 9.80665, lbf: 4.4482216, dyn: 1e-5 }, labels: [['N', 'N'], ['kgf', 'kgf'], ['lbf', 'lbf'], ['dyn', 'dyn']] },
			'inductance-conversion': { factors: { H: 1, mH: 1e-3, uH: 1e-6, nH: 1e-9, pH: 1e-12 }, labels: [['H', 'H'], ['mH', 'mH'], ['uH', 'µH'], ['nH', 'nH']] },
			'length-conversion': { factors: { m: 1, mm: 1e-3, mil: 2.54e-5, in: 0.0254, ft: 0.3048 }, labels: [['m', 'm'], ['mm', 'mm'], ['mil', 'mil'], ['in', 'in']] },
			'pressure-conversion': { factors: { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.757, atm: 101325, mmHg: 133.322 }, labels: [['Pa', 'Pa'], ['bar', 'bar'], ['psi', 'psi'], ['atm', 'atm']] },
			'volume-conversion': { factors: { L: 1, mL: 1e-3, m3: 1000, gal: 3.7854118, floz: 0.0295735 }, labels: [['L', 'L'], ['mL', 'mL'], ['m3', 'm³'], ['gal', 'US gal']] },
			'weight-conversion': { factors: { kg: 1, g: 1e-3, lb: 0.45359237, oz: 0.0283495, tonne: 1000 }, labels: [['kg', 'kg'], ['g', 'g'], ['lb', 'lb'], ['oz', 'oz']] },
		};
		if (id === 'temperature-conversion') {
			const c = v.unit === 'C' ? v.value : v.unit === 'F' ? (v.value - 32) * 5 / 9 : v.value - 273.15;
			out = [result('摄氏', fmt(c, '°C')), result('华氏', fmt(c * 9 / 5 + 32, '°F')), result('开尔文', fmt(c + 273.15, 'K'))];
		}
		else if (conversions[id]) {
			const table = conversions[id];
			const base = v.value * table.factors[v.unit];
			out = table.labels.map(([unit, label]) => result(label, fmt(base / table.factors[unit], label)));
		}
	}
	return out.length ? { out, warning: '' } : null;
}
function polar(magnitude, degrees) {
	const angle = degrees * Math.PI / 180;
	return [magnitude * Math.cos(angle), magnitude * Math.sin(angle)];
}
function calculateAdvanced(id, v, touchstone, stages = [1, 2, 3]) {
	const db = value => 10 ** (value / 10);
	let out = [];
	const warning = '';
	if (id === 'noisefig') {
		const f = stages.map(i => db(v[`nf${i}`]));
		const g = stages.map(i => db(v[`g${i}`]));
		const totalF = friisFactor(f, g);
		const nf = 10 * Math.log10(totalF);
		const gain = stages.reduce((sum, i) => sum + v[`g${i}`], 0);
		const noiseFloor = -174 + 10 * Math.log10(v.bandwidth * 1e6) + nf;
		out = [result('级联噪声系数', fmt(nf, 'dB')), result('级联噪声因子', fmt(totalF)), result('总增益', fmt(gain, 'dB')), result('输出噪声', fmt(noiseFloor + gain, 'dBm')), result('输入噪声底', fmt(noiseFloor, 'dBm')), result('灵敏度', fmt(noiseFloor + v.snr, 'dBm'))];
	}
	else if (id === 'fspl') {
		const fspl = 92.45 + 20 * Math.log10(v.frequency) + 20 * Math.log10(v.distance);
		const eirp = v.ptx + v.gtx;
		const prx = eirp + v.grx - v.losses - fspl;
		const margin = prx - v.sensitivity;
		const maxFspl = eirp + v.grx - v.losses - v.sensitivity;
		const maxRange = 10 ** ((maxFspl - 92.45 - 20 * Math.log10(v.frequency)) / 20);
		out = [result('波长', fmt(C / (v.frequency * 1e9) * 1e3, 'mm')), result('自由空间损耗', fmt(fspl, 'dB')), result('总路径损耗', fmt(fspl + v.losses, 'dB')), result('EIRP', fmt(eirp, 'dBm')), result('接收功率', fmt(prx, 'dBm')), result('链路余量', fmt(margin, 'dB')), result('灵敏度对应最大距离', fmt(maxRange, 'km'))];
	}
	else if (id === 'power-budget') {
		const eirp = v.ptx + v.gtx - v.txloss;
		const prx = eirp - v.pathloss + v.grx - v.rxloss;
		const margin = prx - v.sensitivity;
		out = [result('EIRP', fmt(eirp, 'dBm')), result('总损耗', fmt(v.txloss + v.pathloss + v.rxloss, 'dB')), result('接收功率', fmt(prx, 'dBm')), result('链路余量', fmt(margin, 'dB')), result('接收线性功率', fmt(10 ** ((prx - 30) / 10), 'W'))];
	}
	else if (id === 'mixer-spur') {
		const products = [];
		for (let m = 0; m <= v.maxOrder; m++) {
			for (let n = 0; n <= v.maxOrder; n++) {
				if ((!m && !n) || m + n > v.maxOrder)
					continue;
				for (const sign of [-1, 1])
					products.push({ label: `${m}射频${sign > 0 ? '+' : '−'}${n}LO`, frequency: Math.abs(m * v.rf + sign * n * v.lo), order: m + n });
			}
		}
		const unique = products.sort((a, b) => Math.abs(a.frequency - v.center) - Math.abs(b.frequency - v.center)).slice(0, 8);
		out = unique.map(item => result(`${item.label}（${item.order}阶）`, fmt(item.frequency, 'GHz')));
		const inBand = products.filter(item => Math.abs(item.frequency - v.center) <= v.bandwidth / 2).length;
		out.unshift(result('带内杂散数', String(inBand)), result('差频 IF', fmt(Math.abs(v.rf - v.lo), 'GHz')));
	}
	else if (id === 'adc-sampling') {
		const alias = Math.abs(((v.fin + v.fs / 2) % v.fs + v.fs) % v.fs - v.fs / 2);
		const zone = Math.floor(v.fin / (v.fs / 2)) + 1;
		const quant = 6.02 * v.bits + 1.76;
		const jitterSnr = v.jitter > 0 ? -20 * Math.log10(2 * Math.PI * v.fin * 1e9 * v.jitter * 1e-12) : Infinity;
		const total = -10 * Math.log10(10 ** (-quant / 10) + 10 ** (-jitterSnr / 10) + 10 ** (-v.analogSnr / 10));
		out = [result('混叠输出频率', fmt(alias, 'GHz')), result('奈奎斯特区', String(zone)), result('频谱方向', zone % 2 ? '正常' : '翻转'), result('量化 SNR', fmt(quant, 'dB')), result('抖动限制 SNR', fmt(jitterSnr, 'dB')), result('综合 SNR', fmt(total, 'dB')), result('理论 ENOB', fmt((total - 1.76) / 6.02, 'bit'))];
	}
	else if (id === 'eda-units') {
		const watts = 10 ** ((v.power - 30) / 10);
		const vrms = Math.sqrt(watts * v.z0);
		const factor = db(v.noiseFigure);
		out = [result('频率', fmt(v.frequency * 1e9, 'Hz')), result('波长', fmt(C / (v.frequency * 1e9), 'm')), result('功率', fmt(watts, 'W')), result('功率', fmt(watts * 1000, 'mW')), result('dBW', fmt(v.power - 30, 'dBW')), result('Vrms', fmt(vrms, 'V')), result('Vpp（正弦）', fmt(vrms * 2 * Math.sqrt(2), 'V')), result('等效噪声温度', fmt(290 * (factor - 1), 'K'))];
	}
	else if (id === 'db-power') {
		let watts = v.inputType === 'dBm' ? 10 ** ((v.value - 30) / 10) : v.inputType === 'dBW' ? 10 ** (v.value / 10) : v.inputType === 'mW' ? v.value / 1000 : v.inputType === 'Vrms' ? v.value ** 2 / v.z0 : v.value;
		if (watts < 0)
			watts = Number.NaN;
		out = [result('dBm', fmt(10 * Math.log10(watts * 1000), 'dBm')), result('dBW', fmt(10 * Math.log10(watts), 'dBW')), result('瓦', fmt(watts, 'W')), result('毫瓦', fmt(watts * 1000, 'mW')), result('Vrms', fmt(Math.sqrt(watts * v.z0), 'V')), result('Vpp（正弦）', fmt(Math.sqrt(watts * v.z0) * 2 * Math.sqrt(2), 'V'))];
	}
	else if (id === 'vswr') {
		let gamma = v.inputType === 'vswr' ? (v.value - 1) / (v.value + 1) : v.inputType === 'rl' ? 10 ** (-v.value / 20) : v.inputType === 'zl' ? Math.abs((v.value - v.z0) / (v.value + v.z0)) : v.value;
		gamma = Math.max(0, Math.min(gamma, 1));
		const ratio = (1 + gamma) / (1 - gamma);
		const reflected = gamma ** 2;
		out = [result('VSWR', fmt(ratio, ':1')), result('回波损耗', fmt(-20 * Math.log10(gamma), 'dB')), result('|Γ|', fmt(gamma)), result('|Γ| dB', fmt(20 * Math.log10(gamma), 'dB')), result('失配损耗', fmt(-10 * Math.log10(1 - reflected), 'dB')), result('反射功率', fmt(reflected * 100, '%')), result('传输功率', fmt((1 - reflected) * 100, '%')), result('等效高阻负载', fmt(v.z0 * ratio, 'Ω'))];
	}
	else if (id === 'gamma' || id === 'smith') {
		const g = gammaFromZ(v.r, v.x, v.z0);
		const normalizedR = v.r / v.z0;
		const normalizedX = v.x / v.z0;
		out = [result('Γ 实部', fmt(g.gr)), result('Γ 虚部', fmt(g.gi)), result('|Γ|', fmt(g.mag)), result('Γ 相位', fmt(g.phase, '°')), result('VSWR', fmt(g.vswr)), result('回波损耗', fmt(g.rl, 'dB')), result('失配损耗', fmt(-10 * Math.log10(1 - g.mag ** 2), 'dB')), result('归一化阻抗', `${fmt(normalizedR)} ${normalizedX >= 0 ? '+' : '−'} j${fmt(Math.abs(normalizedX))}`)];
	}
	else if (id === 'sparam-plot') {
		if (touchstone?.data.length) {
			const point = touchstone.data.reduce((best, item) => Math.abs(item.frequency - v.frequency * 1e9) < Math.abs(best.frequency - v.frequency * 1e9) ? item : best);
			const mag = Math.hypot(...point.s[v.trace || 'S11']);
			out = [result('最近频点', fmt(point.frequency / 1e9, 'GHz')), result(`|${v.trace || 'S11'}|`, fmt(mag)), result('S(dB)', fmt(20 * Math.log10(mag), 'dB')), result('数据点数', String(touchstone.data.length)), result('参考阻抗', fmt(touchstone.z0, 'Ω'))];
		}
		else {
			out = [result('|S|', fmt(v.magnitude)), result('S(dB)', fmt(20 * Math.log10(Math.max(v.magnitude, 1e-12)), 'dB')), result('相位', fmt(v.phase, '°')), result('观察频率', fmt(v.frequency, 'GHz')), result('状态', '可导入 Touchstone 数据')];
		}
	}
	else if (id === 'sparam-gen') {
		out = [['S11', v.s11db], ['S21', v.s21db], ['S12', v.s12db], ['S22', v.s22db]].flatMap(([name, value]) => [result(`${name} 幅度`, fmt(10 ** (value / 20))), result(`${name} dB`, fmt(value, 'dB'))]);
		out.push(result('S21 相位', fmt(v.phase21, '°')), result('反向隔离', fmt(-v.s12db, 'dB')));
	}
	else if (id === 'cascade') {
		const gains = stages.map(i => v[`gain${i}`]);
		const nfs = stages.map(i => db(v[`nf${i}`]));
		const linearGains = gains.map(db);
		const totalF = friisFactor(nfs, linearGains);
		out = [result('级联增益 / 插损', fmt(gains.reduce((a, b) => a + b, 0), 'dB')), result('级联噪声系数', fmt(10 * Math.log10(totalF), 'dB')), result('线性增益', fmt(linearGains.reduce((a, b) => a * b, 1)))];
		let cumulative = 1;
		linearGains.forEach((gain, i) => {
			cumulative *= gain;
			out.push(result(`第 ${i + 1} 级后功率倍率`, fmt(cumulative)));
		});
	}
	else if (id === 'stub-match') {
		const z = complexDiv(v.r, v.x, v.z0, 0);
		const y = complexDiv(1, 0, ...z);
		const [g, b] = y;
		const delta = Math.sqrt(g * ((1 - g) ** 2 + b * b));
		const ts = Math.abs(g - 1) < 1e-10 ? [b / 2, Infinity] : [(b + delta) / (g - 1), (b - delta) / (g - 1)];
		const guided = C / (v.frequency * 1e9 * Math.sqrt(v.er));
		out = ts.flatMap((t, i) => {
			const yy = Number.isFinite(t) ? complexDiv(g, b + t, 1 - b * t, g * t) : complexDiv(1, 0, g, b);
			const distance = ((Math.atan(t) + Math.PI) % Math.PI) / (2 * Math.PI);
			const open = ((Math.atan(-yy[1]) + Math.PI) % Math.PI) / (2 * Math.PI);
			const short = ((Math.atan2(1, yy[1]) + Math.PI) % Math.PI) / (2 * Math.PI);
			return [result(`解 ${i + 1} 距离`, fmt(distance * guided * 1e3, 'mm')), result(`解 ${i + 1} 开路枝节`, fmt(open * guided * 1e3, 'mm')), result(`解 ${i + 1} 短路枝节`, fmt(short * guided * 1e3, 'mm'))];
		});
	}
	else if (id === 'amp-stability') {
		const [a, b] = polar(v.s11m, v.s11p);
		const [c, d] = polar(v.s21m, v.s21p);
		const [e, f] = polar(v.s12m, v.s12p);
		const [g, h] = polar(v.s22m, v.s22p);
		const crossR = c * e - d * f;
		const crossI = c * f + d * e;
		const deltaR = a * g - b * h - crossR;
		const deltaI = a * h + b * g - crossI;
		const delta = Math.hypot(deltaR, deltaI);
		const k = (1 - v.s11m ** 2 - v.s22m ** 2 + delta ** 2) / (2 * v.s12m * v.s21m);
		const mu = (1 - v.s11m ** 2) / (Math.hypot(g - deltaR * a - deltaI * b, h - deltaI * a + deltaR * b) + v.s12m * v.s21m);
		out = [result('|Δ|', fmt(delta)), result('∠Δ', fmt(Math.atan2(deltaI, deltaR) * 180 / Math.PI, '°')), result('Rollet K', fmt(k)), result('μ', fmt(mu)), result('稳定性', k > 1 && delta < 1 && mu > 1 ? '无条件稳定' : '条件稳定 / 可能不稳定')];
	}
	else if (id === 'deembed') {
		out = [result('DUT 插损', fmt(v.measured - v.left - v.right, 'dB')), result('夹具总插损', fmt(v.left + v.right, 'dB')), result('DUT 群延迟', fmt(v.measuredDelay - 2 * v.fixtureDelay, 'ps')), result('夹具总延迟', fmt(2 * v.fixtureDelay, 'ps'))];
	}
	else if (id === 'sigintegrity') {
		const rho = (v.discontinuity - v.z0) / (v.discontinuity + v.z0);
		const delay = v.length * 1e-3 * Math.sqrt(v.er) / C;
		const critical = C * v.rise * 1e-12 / (2 * Math.sqrt(v.er));
		out = [result('反射系数 ρ', fmt(rho)), result('回波损耗', fmt(-20 * Math.log10(Math.max(Math.abs(rho), 1e-12)), 'dB')), result('单程延迟', fmt(delay * 1e9, 'ns')), result('往返延迟', fmt(delay * 2e9, 'ns')), result('临界走线长度', fmt(critical * 1e3, 'mm')), result('奈奎斯特近似带宽', fmt(0.35 / (v.rise * 1e-12) / 1e9, 'GHz')), result('幅度传输率', fmt((1 - rho ** 2) * 10 ** (-v.loss / 10) * 100, '%'))];
	}
	else if (id === 'divider') {
		const k = Math.sqrt(v.ratio);
		const z2 = v.z0 * Math.sqrt((1 + k * k) / k ** 3);
		const z3 = v.z0 * Math.sqrt(k * (1 + k * k));
		const r = v.z0 * (k + 1 / k);
		const quarter = C / (v.frequency * 1e9 * Math.sqrt(v.er)) / 4;
		out = [result('支路 2 阻抗', fmt(z2, 'Ω')), result('支路 3 阻抗', fmt(z3, 'Ω')), result('隔离电阻', fmt(r, 'Ω')), result('λ/4 物理长度', fmt(quarter * 1e3, 'mm')), result('端口 2 分配', fmt(10 * Math.log10((1 + v.ratio) / v.ratio), 'dB')), result('端口 3 分配', fmt(10 * Math.log10(1 + v.ratio), 'dB'))];
	}
	else if (id === 'coupler') {
		const c = 10 ** (-v.coupling / 20);
		const zEven = v.z0 * Math.sqrt((1 + c) / (1 - c));
		const zOdd = v.z0 * Math.sqrt((1 - c) / (1 + c));
		const quarter = C / (v.frequency * 1e9 * Math.sqrt(v.er)) / 4;
		out = [result('偶模阻抗 Z0e', fmt(zEven, 'Ω')), result('奇模阻抗 Z0o', fmt(zOdd, 'Ω')), result('λ/4 长度', fmt(quarter * 1e3, 'mm')), result('耦合端功率', fmt(c ** 2 * 100, '%')), result('直通端功率', fmt((1 - c ** 2) * 100, '%')), result('隔离度目标', fmt(v.coupling + v.directivity, 'dB'))];
	}
	else if (id === 'rlc-nonideal') {
		const omega = 2 * Math.PI * v.frequency * 1e6;
		const x = omega * v.l * 1e-9 - 1 / (omega * v.c * 1e-12);
		const magnitude = Math.hypot(v.r, x);
		const srf = 1 / (2 * Math.PI * Math.sqrt(v.l * 1e-9 * v.c * 1e-12));
		out = [result('阻抗实部', fmt(v.r, 'Ω')), result('阻抗虚部', fmt(x, 'Ω')), result('|Z|', fmt(magnitude, 'Ω')), result('相位', fmt(Math.atan2(x, v.r) * 180 / Math.PI, '°')), result('自谐振频率', fmt(srf / 1e6, 'MHz')), result('等效 Q', fmt(Math.abs(x) / Math.max(v.r, 1e-12)))];
	}
	else if (id === 'impedmatch') {
		const high = Math.max(v.rs, v.rl);
		const low = Math.min(v.rs, v.rl);
		const q = Math.sqrt(high / low - 1);
		const xs = q * low;
		const xp = high / q;
		const omega = 2 * Math.PI * v.frequency * 1e6;
		out = [result('网络 Q', fmt(q)), result('串联电抗 |Xs|', fmt(xs, 'Ω')), result('并联电抗 |Xp|', fmt(xp, 'Ω')), result('串联元件', v.topology === 'lowpass' ? fmt(xs / omega * 1e9, 'nH') : fmt(1 / (omega * xs) * 1e12, 'pF')), result('并联元件', v.topology === 'lowpass' ? fmt(1 / (omega * xp) * 1e12, 'pF') : fmt(xp / omega * 1e9, 'nH'))];
	}
	else if (id === 'biastee') {
		const c = 10 / (2 * Math.PI * v.fmin * 1e6 * v.z0);
		const l = 10 * v.z0 / (2 * Math.PI * v.fmin * 1e6);
		out = [result('隔直电容下限', fmt(c * 1e9, 'nF')), result('扼流电感下限', fmt(l * 1e6, 'µH')), result('电容耐压建议', fmt(v.voltage * 2, 'V')), result('电感额定电流建议', fmt(v.current * 1.5, 'A')), result('频率跨度', fmt(v.fmax / v.fmin, ':1'))];
	}
	else if (id === 'balun') {
		const turns = Math.sqrt(v.zin / v.zout);
		const inductance = v.magnetizingX * v.zin / (2 * Math.PI * v.fmin * 1e6);
		out = [result('匝数比 Np/Ns', fmt(turns)), result('阻抗比', fmt(v.zin / v.zout)), result('初级磁化电感下限', fmt(inductance * 1e6, 'µH')), result('电压比 Vp/Vs', fmt(turns)), result('电流比 Ip/Is', fmt(1 / turns))];
	}
	else if (id === 'si-lpf') {
		const guided = C / (v.frequency * 1e9 * Math.sqrt(v.er));
		const g = 2 * Math.sin(Math.PI / (2 * v.order));
		const thetaHigh = g * v.z0 / v.zhigh;
		const thetaLow = g * v.zlow / v.z0;
		out = [result('高阻抗节电长度', fmt(thetaHigh * 180 / Math.PI, '°')), result('高阻抗节长度', fmt(thetaHigh / (2 * Math.PI) * guided * 1e3, 'mm')), result('低阻抗节电长度', fmt(thetaLow * 180 / Math.PI, '°')), result('低阻抗节长度', fmt(thetaLow / (2 * Math.PI) * guided * 1e3, 'mm')), result('理论滚降', fmt(20 * v.order, 'dB/dec'))];
	}
	else if (id === 'cl-bpf') {
		const fbw = v.bandwidth / v.frequency;
		const j = Math.PI * fbw / (2 * v.order);
		const zEven = v.z0 * (1 + j + j * j);
		const zOdd = v.z0 * (1 - j + j * j);
		const quarter = C / (v.frequency * 1e9 * Math.sqrt(v.er)) / 4;
		out = [result('分数带宽 FBW', fmt(fbw)), result('偶模阻抗 Z0e', fmt(zEven, 'Ω')), result('奇模阻抗 Z0o', fmt(zOdd, 'Ω')), result('耦合节长度', fmt(quarter * 1e3, 'mm')), result('理论滚降', fmt(20 * v.order, 'dB/dec'))];
	}
	else if (id === 'diplexer') {
		const omega = 2 * Math.PI * v.frequency * 1e9;
		const l = v.z0 / omega;
		const c = 1 / (v.z0 * omega);
		out = [result('低通支路首个电感', fmt(l * 1e9, 'nH')), result('低通支路首个电容', fmt(c * 1e12, 'pF')), result('高通支路首个电容', fmt(c * 1e12, 'pF')), result('高通支路首个电感', fmt(l * 1e9, 'nH')), result('低端口中心', fmt(v.frequency - v.separation / 2, 'GHz')), result('高端口中心', fmt(v.frequency + v.separation / 2, 'GHz')), result('理论滚降', fmt(20 * v.order, 'dB/dec'))];
	}
	else if (id === 'dipole') {
		const wavelength = C / (v.frequency * 1e6);
		const total = wavelength / 2 * v.velocity;
		const gain = 2.15 + 10 * Math.log10(v.efficiency / 100);
		out = [result('自由空间波长', fmt(wavelength, 'm')), result('总长度', fmt(total * 1e3, 'mm')), result('单臂长度', fmt(total * 500, 'mm')), result('辐射电阻近似', '73 Ω'), result('估算增益', fmt(gain, 'dBi')), result('半功率波束宽度', '约 78°')];
	}
	else if (id === 'patch') {
		const f = v.frequency * 1e6;
		const h = v.h * 1e-3;
		const w = C / (2 * f) * Math.sqrt(2 / (v.er + 1));
		const ee = (v.er + 1) / 2 + (v.er - 1) / (2 * Math.sqrt(1 + 12 * h / w));
		const delta = 0.412 * h * ((ee + 0.3) * (w / h + 0.264)) / ((ee - 0.258) * (w / h + 0.8));
		const length = C / (2 * f * Math.sqrt(ee)) - 2 * delta;
		out = [result('贴片宽度 W', fmt(w * 1e3, 'mm')), result('贴片长度 L', fmt(length * 1e3, 'mm')), result('有效介电常数', fmt(ee)), result('边缘延伸 ΔL', fmt(delta * 1e3, 'mm')), result('地平面最小宽度', fmt((w + 6 * h) * 1e3, 'mm')), result('地平面最小长度', fmt((length + 6 * h) * 1e3, 'mm')), result('估算增益', fmt(6 + 10 * Math.log10(v.efficiency / 100), 'dBi'))];
	}
	else if (id === 'yagi') {
		const wavelength = C / (v.frequency * 1e6);
		const reflector = 0.51 * wavelength;
		const driven = 0.475 * wavelength;
		const director = 0.45 * wavelength;
		out = [result('反射器长度', fmt(reflector * 1e3, 'mm')), result('有源振子长度', fmt(driven * 1e3, 'mm')), result('末端引向器长度', fmt(director * 1e3, 'mm')), result('建议单元间距', fmt(0.2 * wavelength * 1e3, 'mm')), result('轴长', fmt(v.boom * wavelength, 'm')), result('估算增益', fmt((6 + 1.2 * (v.elements - 3)) + 10 * Math.log10(v.efficiency / 100), 'dBi')), result('估算 HPBW', fmt(100 / Math.sqrt(v.elements), '°'))];
	}
	else if (id === 'horn') {
		const wavelength = C / (v.frequency * 1e9);
		const area = v.a * v.b * 1e-6;
		const gain = v.efficiency / 100 * 4 * Math.PI * area / wavelength ** 2;
		out = [result('口径面积', fmt(area, 'm²')), result('线性增益', fmt(gain)), result('增益', fmt(10 * Math.log10(gain), 'dBi')), result('E 面 HPBW', fmt(56 * wavelength / (v.b * 1e-3), '°')), result('H 面 HPBW', fmt(67 * wavelength / (v.a * 1e-3), '°')), result('有效口径', fmt(area * v.efficiency / 100, 'm²'))];
	}
	else if (id === 'parabolic-dish') {
		const wavelength = C / (v.frequency * 1e9);
		const gain = v.efficiency / 100 * (Math.PI * v.diameter / wavelength) ** 2;
		out = [result('增益', fmt(10 * Math.log10(gain), 'dBi')), result('线性增益', fmt(gain)), result('HPBW', fmt(70 * wavelength / v.diameter, '°')), result('焦距', fmt(v.focalRatio * v.diameter, 'm')), result('有效口径', fmt(v.efficiency / 100 * Math.PI * v.diameter ** 2 / 4, 'm²')), result('远场距离', fmt(2 * v.diameter ** 2 / wavelength, 'm'))];
	}
	else if (id === 'helical') {
		const wavelength = C / (v.frequency * 1e6);
		const gain = 15 * v.turns * v.circumference ** 2 * v.spacing;
		out = [result('螺旋直径', fmt(v.circumference * wavelength / Math.PI * 1e3, 'mm')), result('匝距', fmt(v.spacing * wavelength * 1e3, 'mm')), result('轴向长度', fmt(v.turns * v.spacing * wavelength, 'm')), result('估算增益', fmt(10 * Math.log10(gain), 'dBi')), result('HPBW', fmt(52 / (v.circumference * Math.sqrt(v.turns * v.spacing)), '°')), result('轴比', fmt((2 * v.turns + 1) / (2 * v.turns), ''))];
	}
	else if (id === 'pattern-3d') {
		const baseGain = v.element === 'patch' ? 6 : v.element === 'monopole' ? 5.15 : 2.15;
		out = [result('峰值方向', fmt(v.tilt, '°')), result('估算峰值增益', fmt(baseGain + 10 * Math.log10(v.efficiency / 100), 'dBi')), result('E 面 HPBW', v.element === 'patch' ? '约 80°' : '约 78°'), result('H 面覆盖', v.element === 'patch' ? '约 90°' : '360°'), result('极化', '线极化')];
	}
	else if (id === 'pa-efficiency') {
		const pin = 10 ** ((v.pin - 30) / 10);
		const pout = 10 ** ((v.pout - 30) / 10);
		const drain = pout / v.pdc;
		const pae = (pout - pin) / v.pdc;
		const ideals = { A: 50, AB: 65, B: 78.5, C: 85, D: 100 };
		out = [result('功率增益', fmt(v.pout - v.pin, 'dB')), result('输出功率', fmt(pout, 'W')), result('漏极/集电极效率', fmt(drain * 100, '%')), result('PAE', fmt(pae * 100, '%')), result('直流电流', fmt(v.pdc / v.vdd, 'A')), result(`${v.paClass} 类参考`, ['AB', 'C'].includes(v.paClass) ? '效率取决于导通角与负载' : fmt(ideals[v.paClass], '%'))];
	}
	else if (id === 'bias') {
		const current = v.current / 1000;
		const resistor = (v.supply - v.vds) / current;
		const power = v.vds * current;
		const bypass = 1 / (2 * Math.PI * v.frequency * 1e9 * Math.max(resistor / 10, 0.001));
		out = v.device === 'bjt' ? [result('集电极电阻', fmt(resistor, 'Ω')), result('基极电流', fmt(v.current / v.gain, 'mA')), result('晶体管功耗', fmt(power, 'W')), result('旁路电容下限', fmt(bypass * 1e9, 'nF'))] : [result('漏极电阻', fmt(resistor, 'Ω')), result('所需 VGS 变化', fmt(current / v.gain, 'V')), result('晶体管功耗', fmt(power, 'W')), result('旁路电容下限', fmt(bypass * 1e9, 'nF'))];
	}
	else if (id === 'vco') {
		const l = v.inductance * 1e-9;
		const fmax = 1 / (2 * Math.PI * Math.sqrt(l * v.cmin * 1e-12));
		const fmin = 1 / (2 * Math.PI * Math.sqrt(l * v.cmax * 1e-12));
		const center = Math.sqrt(fmin * fmax);
		const kvco = (fmax - fmin) / v.voltage;
		const leeson = -10 * Math.log10(v.q ** 2 * (v.offset * 1e3 / center) ** 2);
		out = [result('最低频率', fmt(fmin / 1e6, 'MHz')), result('最高频率', fmt(fmax / 1e6, 'MHz')), result('几何中心频率', fmt(center / 1e6, 'MHz')), result('调谐范围', fmt((fmax - fmin) / 1e6, 'MHz')), result('KVCO', fmt(kvco / 1e6, 'MHz/V')), result('Leeson 形状项', fmt(leeson, 'dB'))];
	}
	else if (id === 'mixer-calc') {
		const output = v.rfPower - v.conversionLoss;
		const im3 = 3 * v.rfPower - 2 * v.iip3 - v.conversionLoss;
		out = [result('差频 IF', fmt(Math.abs(v.rf - v.lo), 'GHz')), result('和频', fmt(v.rf + v.lo, 'GHz')), result('镜像频率', fmt(Math.abs(2 * v.lo - v.rf), 'GHz')), result('IF 输出功率', fmt(output, 'dBm')), result('三阶互调输出', fmt(im3, 'dBm')), result('三阶余量', fmt(output - im3, 'dB'))];
	}
	else if (id === 'agc') {
		const neededMax = v.target - v.inputMin;
		const neededMin = v.target - v.inputMax;
		const available = v.gainMax - v.gainMin;
		out = [result('所需最大增益', fmt(neededMax, 'dB')), result('所需最小增益', fmt(neededMin, 'dB')), result('所需控制范围', fmt(neededMax - neededMin, 'dB')), result('可用控制范围', fmt(available, 'dB')), result('余量', fmt(available - (neededMax - neededMin), 'dB')), result('建立带宽近似', fmt(0.35 / (v.attack * 1e-6) / 1e3, 'kHz'))];
	}
	else if (id === 'lna-match') {
		const [or, oi] = polar(v.gammaOptMag, v.gammaOptPhase);
		const [sr, si] = polar(v.gammaSMag, v.gammaSPhase);
		const distance = (sr - or) ** 2 + (si - oi) ** 2;
		const fminLin = db(v.fmin);
		const factor = fminLin + 4 * v.rn / v.z0 * distance / ((1 - v.gammaSMag ** 2) * ((1 + or) ** 2 + oi ** 2));
		const nf = 10 * Math.log10(factor);
		const [zr, zi] = complexDiv(v.z0 * (1 + sr), v.z0 * si, 1 - sr, -si);
		out = [result('工作噪声系数', fmt(nf, 'dB')), result('相对 Fmin 劣化', fmt(nf - v.fmin, 'dB')), result('源阻抗实部', fmt(zr, 'Ω')), result('源阻抗虚部', fmt(zi, 'Ω')), result('|Γs−Γopt|', fmt(Math.sqrt(distance)))];
	}
	return out.length ? { out, warning } : null;
}
function calculate(tool, v, data = null) {
	const id = tool.id;
	if (tool.network) {
		const capacitor = id === 'legacy-capacitor';
		return { out: [result(capacitor ? '等效电容' : '等效电阻', fmt(networkValue(tool.network, v, capacitor), capacitor ? 'nF' : 'Ω')), result('元件数量', String(networkLeaves(tool.network).length))], warning: '' };
	}
	const extended = calculateExtended(id, v, tool.stages);
	if (extended)
		return extended;
	const antenna = ['array', 'array-editor'].includes(id) ? calculateAntenna(v) : null;
	if (antenna)
		return antenna;
	const advanced = calculateAdvanced(id, v, data, tool.stages);
	if (advanced)
		return advanced;
	const fHz = finite(v.frequency, 1) * (tool.category === 'antenna' || tool.category === 'passive' ? 1e6 : 1e9);
	const lambda = C / Math.max(fHz, 1);
	let out = [];
	let warning = '';
	if (id === 'microstrip') {
		let width = v.w;
		if (v.mode === 'synthesis') {
			let low = Math.max(v.h * 1e-5, 1e-6);
			let high = v.h * 100;
			for (let i = 0; i < 80; i++) {
				const mid = (low + high) / 2;
				if (microstripModel(mid, v.h, v.er, v.t).z > v.targetZ)
					low = mid;
				else
					high = mid;
			}
			width = (low + high) / 2;
		}
		const ms = microstripModel(width, v.h, v.er, v.t);
		const guided = C / fHz / Math.sqrt(ms.ee);
		const rs = Math.sqrt(Math.PI * fHz * MU0 / v.sigma);
		const skin = 1 / Math.sqrt(Math.PI * fHz * MU0 * v.sigma);
		const alphaD = Math.PI * fHz / C * (v.er / (v.er - 1)) * ((ms.ee - 1) / Math.sqrt(ms.ee)) * v.tand;
		const alphaC = rs / (ms.z * ms.effectiveWidth * 1e-3);
		const dbD = alphaD * 8.686 / 100;
		const dbC = alphaC * 8.686 / 100;
		out = [result('线宽 W', fmt(width, 'mm')), result('有效线宽 We', fmt(ms.effectiveWidth, 'mm')), result('特性阻抗 Z₀', fmt(ms.z, 'Ω')), result('有效介电常数 εeff', fmt(ms.ee)), result('相速度', fmt(1 / Math.sqrt(ms.ee), '×c')), result('导波波长', fmt(guided * 1e3, 'mm')), result('λ/4 长度', fmt(guided * 250, 'mm')), result('λ/2 长度', fmt(guided * 500, 'mm')), result('介质损耗', fmt(dbD, 'dB/cm')), result('导体损耗', fmt(dbC, 'dB/cm')), result('总衰减', fmt(dbD + dbC, 'dB/cm')), result('10 cm 损耗', fmt((dbD + dbC) * 10, 'dB')), result('趋肤深度', fmt(skin * 1e6, 'µm'))];
		if (v.mode === 'synthesis' && (v.targetZ < 5 || v.targetZ > 200))
			warning = '目标阻抗超出常见 PCB 微带线范围，结果应通过场求解器复核。';
	}
	else if (id === 'stripline') {
		const usable = Math.max(v.b - v.t, 0.001);
		const z = 60 / Math.sqrt(v.er) * Math.log(1.9 * (2 * usable) / Math.max(0.8 * v.w + v.t, 0.0001));
		const guided = C / fHz / Math.sqrt(v.er);
		const rs = Math.sqrt(Math.PI * fHz * MU0 / v.sigma);
		const alphaC = rs / (Math.max(z, 0.001) * v.w * 1e-3) * 8.686 / 100;
		const alphaD = Math.PI * fHz * Math.sqrt(v.er) * v.tand / C * 8.686 / 100;
		out = [result('特性阻抗 Z₀', fmt(z, 'Ω')), result('相速度', fmt(1 / Math.sqrt(v.er), '×c')), result('导波波长', fmt(guided * 1e3, 'mm')), result('λ/4 长度', fmt(guided * 250, 'mm')), result('单位长度延迟', fmt(Math.sqrt(v.er) / C * 1e9, 'ns/m')), result('导体损耗', fmt(alphaC, 'dB/cm')), result('介质损耗', fmt(alphaD, 'dB/cm')), result('总衰减', fmt(alphaC + alphaD, 'dB/cm'))];
	}
	else if (id === 'coaxial') {
		const ratio = Math.max(v.D / v.d, 1.0001);
		const z = 60 / Math.sqrt(v.er) * Math.log(ratio);
		const cPrime = 2 * Math.PI * EPS0 * v.er / Math.log(ratio);
		const lPrime = MU0 / (2 * Math.PI) * Math.log(ratio);
		const rs = Math.sqrt(Math.PI * fHz * MU0 / v.sigma);
		const alphaC = rs * (1 / (v.d * 1e-3) + 1 / (v.D * 1e-3)) / (2 * z * Math.log(ratio)) * 8.686 / 100;
		const alphaD = Math.PI * fHz * Math.sqrt(v.er) * v.tand / C * 8.686 / 100;
		const fc = 2 * C / (Math.PI * (v.D + v.d) * 1e-3 * Math.sqrt(v.er));
		out = [result('特性阻抗 Z₀', fmt(z, 'Ω')), result('速度因子', fmt(1 / Math.sqrt(v.er))), result('单位长度电容', fmt(cPrime * 1e12, 'pF/m')), result('单位长度电感', fmt(lPrime * 1e6, 'µH/m')), result('TE₁₁ 截止', fmt(fc / 1e9, 'GHz')), result('导波波长', fmt(C / fHz / Math.sqrt(v.er), 'm')), result('导体损耗', fmt(alphaC, 'dB/cm')), result('介质损耗', fmt(alphaD, 'dB/cm')), result('总衰减', fmt(alphaC + alphaD, 'dB/cm'))];
		if (v.D <= v.d)
			warning = '外导体内径必须大于内导体直径。';
	}
	else if (id === 'cpw') {
		const k = Math.max(0.000001, Math.min(0.999999, v.w / (v.w + 2 * v.s)));
		const kp = Math.sqrt(1 - k * k);
		const eeBase = (v.er + 1) / 2;
		const backing = v.grounded === 'cpwg' ? 0.5 * (1 - Math.exp(-4 * v.h / (v.w + 2 * v.s))) : 0;
		const ee = eeBase + (v.er - eeBase) * backing;
		const z = 30 * Math.PI / Math.sqrt(ee) * ellipticK(kp) / ellipticK(k);
		const guided = C / fHz / Math.sqrt(ee);
		const alphaD = Math.PI * fHz * Math.sqrt(ee) * v.tand / C * 8.686 / 100;
		out = [result('特性阻抗 Z₀', fmt(z, 'Ω')), result('有效介电常数 εeff', fmt(ee)), result('导波波长', fmt(guided * 1e3, 'mm')), result('λ/4 长度', fmt(guided * 250, 'mm')), result('几何比 k', fmt(k)), result('介质损耗', fmt(alphaD, 'dB/cm')), result('结构', v.grounded === 'cpwg' ? 'CPWG' : 'CPW')];
	}
	else if (id === 'diff-pair') {
		const base = v.topology === 'microstrip' ? microstripModel(v.w, v.h, v.er, v.t).z : 60 / Math.sqrt(v.er) * Math.log(1.9 * (2 * v.h) / Math.max(0.8 * v.w + v.t, 0.0001));
		const sh = v.s / v.h;
		const oddFactor = v.topology === 'microstrip' ? 1 - 0.347 * Math.exp(-2.9 * sh) : 1 - 0.42 * Math.exp(-2.2 * sh);
		const evenFactor = 2 - oddFactor;
		const zOdd = base * oddFactor;
		const zEven = base * evenFactor;
		out = [result('差分阻抗 Zdiff', fmt(2 * zOdd, 'Ω')), result('奇模阻抗 Zodd', fmt(zOdd, 'Ω')), result('偶模阻抗 Zeven', fmt(zEven, 'Ω')), result('共模阻抗 Zcommon', fmt(zEven / 2, 'Ω')), result('孤立单端阻抗 Z₀', fmt(base, 'Ω')), result('耦合系数', fmt((zEven - zOdd) / (zEven + zOdd))), result('线间距/介质厚度', fmt(sh))];
	}
	else if (id === 'twowire') {
		const ratio = Math.max(v.D / v.d, 1.0001);
		const z = 120 / Math.sqrt(v.er) * Math.acosh(ratio);
		const velocity = C / Math.sqrt(v.er);
		const cPrime = 1 / (z * velocity);
		const lPrime = z / velocity;
		const skin = 1 / Math.sqrt(Math.PI * fHz * MU0 * v.sigma);
		out = [result('特性阻抗 Z₀', fmt(z, 'Ω')), result('单位长度电容', fmt(cPrime * 1e12, 'pF/m')), result('单位长度电感', fmt(lPrime * 1e6, 'µH/m')), result('速度因子', fmt(1 / Math.sqrt(v.er))), result('导波波长', fmt(velocity / fHz, 'm')), result('趋肤深度', fmt(skin * 1e6, 'µm'))];
		if (v.D <= v.d)
			warning = '导线中心距必须大于导线直径。';
	}
	else if (id === 'waveguide') {
		const a = v.a * 1e-3;
		const b = v.b * 1e-3;
		const m = Math.trunc(v.m);
		const n = Math.trunc(v.n);
		const kc = Math.sqrt((m / a) ** 2 + (n / b) ** 2);
		const fc = C / (2 * Math.sqrt(v.er)) * kc;
		const cutoffLambda = 2 / kc;
		const ratio = Math.max(1 - (fc / fHz) ** 2, 1e-12);
		const eta = 376.730313 / Math.sqrt(v.er);
		const zw = v.mode === 'TE' ? eta / Math.sqrt(ratio) : eta * Math.sqrt(ratio);
		out = [result('模式', `${v.mode}${m}${n}`), result('截止频率 fc', fmt(fc / 1e9, 'GHz')), result('截止波长 λc', fmt(cutoffLambda * 1e3, 'mm')), result('fc/f', fmt(fc / fHz)), result('导波波长 λg', fHz > fc ? fmt(C / fHz / Math.sqrt(v.er) / Math.sqrt(ratio) * 1e3, 'mm') : '截止'), result('波阻抗', fHz > fc ? fmt(zw, 'Ω') : '—'), result('相速度', fHz > fc ? fmt(1 / Math.sqrt(v.er * ratio), '×c') : '—'), result('群速度', fHz > fc ? fmt(Math.sqrt(ratio) / Math.sqrt(v.er), '×c') : '—'), result('工作状态', fHz > fc ? '传播' : '截止')];
		if ((v.mode === 'TM' && (m < 1 || n < 1)) || (v.mode === 'TE' && m === 0 && n === 0))
			warning = '模式指数无效：TM 要求 m、n≥1；TE₀₀ 不存在。';
		else if (fHz <= fc)
			warning = '当前频率低于该模式截止频率。';
	}
	else if (id === 'via') {
		const l = 5.08 * (v.length / 25.4) * (Math.log(Math.max(4 * v.length / v.drill, 1.001)) + 1);
		const cap = 1.41 * v.er * (v.length / 25.4) * v.pad / Math.max(v.antipad - v.pad, 0.001);
		const srf = 1 / (2 * Math.PI * Math.sqrt(l * 1e-9 * cap * 1e-12));
		const xl = 2 * Math.PI * fHz * l * 1e-9;
		const xc = 1 / (2 * Math.PI * fHz * cap * 1e-12);
		out = [result('过孔电感', fmt(l, 'nH')), result('焊盘/避空电容', fmt(cap, 'pF')), result('自谐振频率', fmt(srf / 1e9, 'GHz')), result('感抗 XL', fmt(xl, 'Ω')), result('容抗 XC', fmt(xc, 'Ω')), result('净电抗', fmt(xl - xc, 'Ω')), result('传播延迟', fmt(v.length * 1e-3 * Math.sqrt(v.er) / C * 1e12, 'ps'))];
		if (v.antipad <= v.pad)
			warning = '避空直径必须大于焊盘直径。';
	}
	else if (id === 'skin-depth') {
		const mu = MU0 * v.mur;
		const delta = 1 / Math.sqrt(Math.PI * fHz * mu * v.sigma);
		const rs = 1 / (v.sigma * delta);
		const ratio = v.thickness / (delta * 1e6);
		const alpha = rs / (v.z0 * v.width * 1e-3) * 8.686 / 100;
		out = [result('趋肤深度 δs', fmt(delta * 1e6, 'µm')), result('表面电阻 Rs', fmt(rs * 1e3, 'mΩ/□')), result('厚度/趋肤深度', fmt(ratio, '×')), result('导体衰减', fmt(alpha, 'dB/cm')), result('10 cm 衰减', fmt(alpha * 10, 'dB')), result('电阻率', fmt(1 / v.sigma * 1e9, 'nΩ·m')), result('导电率', fmt(v.sigma / 1e6, 'MS/m'))];
		if (ratio < 3)
			warning = '导体厚度小于 3 个趋肤深度，薄膜效应会使损耗高于当前近似。';
	}
	else if (id === 'tl-zin') {
		const betaL = 2 * Math.PI * v.frequency * 1e9 * v.length * 1e-3 * Math.sqrt(v.er) / C;
		const t = Math.tan(betaL);
		const r = v.r;
		const x = v.x;
		const z0 = v.z0;
		const [nr, ni] = [r, x + z0 * t];
		const [dr, di] = [z0 - x * t, r * t];
		const [zr, zi] = complexDiv(z0 * nr, z0 * ni, dr, di);
		out = [result('输入阻抗实部', fmt(zr, 'Ω')), result('输入阻抗虚部', fmt(zi, 'Ω')), result('|Zin|', fmt(Math.hypot(zr, zi), 'Ω')), result('电长度', fmt(betaL * 180 / Math.PI, '°'))];
	}
	else if (id === 'radar-range') {
		const g = 10 ** (v.gain / 10);
		const smin = 10 ** ((v.sensitivity - 30) / 10);
		const range = (v.power * g * g * lambda * lambda * v.rcs / ((4 * Math.PI) ** 3 * smin)) ** 0.25;
		out = [result('最大探测距离', fmt(range / 1e3, 'km')), result('波长', fmt(lambda * 1e3, 'mm')), result('MDS', fmt(v.sensitivity, 'dBm')), result('天线线性增益', fmt(g))];
	}
	else if (id === 'filter') {
		const wc = 2 * Math.PI * v.frequency * 1e6;
		out = Array.from({ length: v.order }, (_, i) => {
			const g = 2 * Math.sin((2 * i + 1) * Math.PI / (2 * v.order));
			return result(`${i + 1} ${i % 2 ? '并联电容' : '串联电感'}`, fmt(i % 2 ? g / (v.z0 * wc) * 1e12 : g * v.z0 / wc * 1e9, i % 2 ? 'pF' : 'nH'));
		});
	}
	else if (id === 'attenuator') {
		const k = 10 ** (v.attenuation / 20);
		const rSeries = v.z0 * (k * k - 1) / (2 * k);
		const rShunt = v.z0 * (k + 1) / (k - 1);
		out = v.topology === 't' ? [result('两个串联电阻', fmt(v.z0 * (k - 1) / (k + 1), 'Ω')), result('中间并联电阻', fmt(2 * v.z0 * k / (k * k - 1), 'Ω'))] : [result('串联电阻', fmt(rSeries, 'Ω')), result('两个并联电阻', fmt(rShunt, 'Ω'))];
		out.push(result('输出功率', fmt(v.power / (k * k), 'W')), result('总耗散', fmt(v.power * (1 - 1 / (k * k)), 'W')));
	}
	else if (id === 'resonator') {
		const f0 = 1 / (2 * Math.PI * Math.sqrt(v.l * 1e-9 * v.c * 1e-12));
		out = [result('谐振频率', fmt(f0 / 1e6, 'MHz')), result('−3 dB 带宽', fmt(f0 / v.q / 1e6, 'MHz')), result('感抗 @ f0', fmt(2 * Math.PI * f0 * v.l * 1e-9, 'Ω')), result('无载 Q', fmt(v.q))];
	}
	else { throw new Error(`工具 ${id} 缺少专用计算模型`); }
	return { out, warning };
}
export { calculate, finite, formatNumber, gammaFromZ, microstripModel };
function calculateAntenna(v) {
	const r = (name, value, unit = '') => result(name, fmt(value, unit));
	const out = [r('阵列孔径', (v.elements - 1) * v.spacing, 'λ'), r('估算 HPBW', 50.8 / (v.elements * v.spacing * Math.cos(v.scan * Math.PI / 180)), '°'), r('理想阵列增益', 10 * Math.log10(v.elements), 'dB'), result('栅瓣', v.spacing > 1 / (1 + Math.abs(Math.sin(v.scan * Math.PI / 180))) ? '存在' : '无')];
	return { out, warning: '理想均匀线阵近似；不含互耦、馈电损耗及安装环境。' };
}
