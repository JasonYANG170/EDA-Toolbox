import { analyticCandidates } from './tool-analytic.js';
import { calculate } from './tool-core.js';
import { networkInverse } from './tool-network.js';
import { stagedInverse } from './tool-stages.js';

export const defaults = tool => Object.fromEntries(tool.fields.map(f => [f[0], f[2]]));
export function activeFields(tool, values, data = null) {
	return tool.fields.filter((f) => {
		if (tool.id === 'sparam-plot' && data && ['magnitude', 'phase'].includes(f[0]))
			return false;
		if (tool.id === 'legacy-rc-filter')
			return !((values.topology?.startsWith('rc') && f[0] === 'l') || (values.topology?.startsWith('rl') && f[0] === 'c') || (values.topology?.startsWith('lc') && f[0] === 'r'));
		if (tool.id === 'legacy-resistor-color')
			return !((f[0] === 'd3' && values.bands <= 4) || (f[0] === 'tcr' && values.bands < 6));
		return true;
	});
}
export function validate(tool, values, allowEmpty = false, data = null) {
	const errors = {};
	for (const [id, label, def, , min, max, step, options] of activeFields(tool, values, data)) {
		const v = values[id];
		if (v === '' || v === null || v === undefined) {
			if (!allowEmpty)
				errors[id] = `${label}不能为空`;
			continue;
		}
		if (options) {
			if (!options.some(o => String(o[0]) === String(v)))
				errors[id] = '请选择有效选项';
			continue;
		}
		if (typeof def === 'number' && (!Number.isFinite(v) || (min !== undefined && v < min) || (max !== undefined && max > (min ?? -Infinity) && v > max) || (step === 1 && !Number.isInteger(v))))
			errors[id] = `${label}超出有效范围${step === 1 ? '，必须为整数' : ''}`;
	}
	if (allowEmpty)
		return errors;
	const fail = (key, condition, message) => {
		if (condition)
			errors[key] = message;
	};
	const v = values;
	if (['coaxial', 'twowire'].includes(tool.id))
		fail('D', v.D <= v.d, '外径 / 中心距必须大于内径');
	if (tool.id === 'via')
		fail('antipad', v.antipad <= v.pad, '避空直径必须大于焊盘直径');
	if (tool.id === 'legacy-led')
		fail('supply', v.supply <= v.forward, '电源电压必须大于 LED 压降');
	if (tool.id === 'capacitor-discharge')
		fail('vt', v.vt <= 0 || v.v0 <= v.vt, '要求 0 < 目标电压 < 初始电压');
	if (tool.id === 'waveguide')
		fail('m', v.mode === 'TM' ? v.m < 1 || v.n < 1 : v.m === 0 && v.n === 0, 'TM 指数至少为 1；TE00 不存在');
	if (tool.id === 'vco')
		fail('cmax', v.cmax < v.cmin, '最大电容不得小于最小电容');
	if (tool.id === 'agc') {
		fail('inputMax', v.inputMax < v.inputMin, '最大输入不得小于最小输入');
		fail('gainMax', v.gainMax < v.gainMin, '最大增益不得小于最小增益');
	}
	if (tool.id === 'bias')
		fail('vds', v.vds >= v.supply, '静态电压必须小于电源电压');
	if (tool.id === 'legacy-transistor')
		fail('vce', v.vce >= v.vcc, 'VCE 必须小于电源电压');
	if (tool.id === 'temperature-conversion')
		fail('value', v.value < ({ C: -273.15, F: -459.67, K: 0 }[v.unit]), '温度低于绝对零度');
	if (tool.id === 'db-power')
		fail('value', ['W', 'mW', 'Vrms'].includes(v.inputType) && v.value < 0, '功率 / 有效值不得为负');
	if (tool.id === 'vswr')
		fail('value', (v.inputType === 'vswr' && v.value < 1) || (v.inputType === 'rl' && v.value < 0) || (v.inputType === 'gamma' && (v.value < 0 || v.value > 1)), '超出该换算模式的物理范围');
	if (tool.id === 'smd-resistor-code')
		fail('code', !/^(?:\d{3,4}|\d*R\d+|(?:0[1-9]|[1-8]\d|9[0-6])[ZYXA-F])$/i.test(String(v.code)), '请输入 472、4701、4R7 或有效 EIA-96 代码');
	if (tool.id === 'smd-capacitor-code')
		fail('code', !/^\d{3,4}$/.test(String(v.code)), '电容代码必须为三或四位数字');
	return errors;
}
export function evaluate(tool, values, data = null) {
	const errors = validate(tool, values, false, data);
	if (Object.keys(errors).length)
		return { status: 'invalid', errors, out: [], warning: Object.values(errors).join('；') };
	try {
		const result = calculate(tool, values, data);
		if (result.out.some(x => x.status === 'invalid'))
			return { ...result, status: 'invalid', errors: {}, warning: '公式在当前条件下无有效值，请检查输入及模型适用范围。' };
		return { ...result, status: 'ok', errors: {} };
	}
	catch (error) {
		return { status: 'invalid', out: [], errors: {}, warning: error.message };
	}
}
export function outputFields(tool, values, data) {
	const result = evaluate(tool, values, data);
	return result.out.map((x, i) => ({ ...x, id: `answer_${i}` })).filter(x => Number.isFinite(x.number));
}
const near = (a, b) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
// Scaled least-squares with explicit rank checks. Never solve rounded display text.
function linear(a, b) {
	const n = b.length;
	const m = a.map((r, i) => [...r, b[i]]);
	for (let i = 0; i < n; i++) {
		let p = i;
		for (let j = i + 1; j < n; j++) {
			if (Math.abs(m[j][i]) > Math.abs(m[p][i]))
				p = j;
		}
		if (Math.abs(m[p][i]) < 1e-12)
			return null;
		[m[i], m[p]] = [m[p], m[i]];
		const d = m[i][i];
		for (let j = i; j <= n; j++)
			m[i][j] /= d;
		for (let k = 0; k < n; k++) {
			if (k !== i) {
				const f = m[k][i];
				for (let j = i; j <= n; j++)
					m[k][j] -= f * m[i][j];
			}
		}
	}
	return m.map(r => r[n]);
}
export function solve(tool, supplied, answers, data = null) {
	const values = { ...defaults(tool), ...supplied };
	const fields = activeFields(tool, values, data);
	const unknown = fields.filter(f => values[f[0]] === '' || values[f[0]] == null);
	const outputUnknown = Object.entries(answers).filter(([, v]) => v === '' || v == null);
	const issue = (status, warning, errors = {}) => ({ status, warning, errors });
	if (!unknown.length && !outputUnknown.length)
		return issue('empty', '请清空需要计算的变量');
	const errors = validate(tool, values, true, data);
	// Cross-field checks are applied after completing unknown inputs.
	for (const f of unknown)
		delete errors[f[0]];
	if (Object.keys(errors).length)
		return issue('invalid', Object.values(errors).join('；'), errors);
	const targets = Object.entries(answers).filter(([, v]) => v !== '' && v != null).map(([id, v]) => [Number(id.slice(7)), v]);
	if (targets.some(([, v]) => !Number.isFinite(v)))
		return issue('invalid', '待求量的已知值必须是有效数字');
	const reference = evaluate(tool, defaults(tool), data).out;
	const targetScale = (i, target) => Math.abs(target) || Math.abs(reference[i]?.number) || 1;
	const mismatches = result => targets.filter(([i, target]) => !Number.isFinite(result.out[i]?.number) || Math.abs(result.out[i].number - target) > 1e-7 * targetScale(i, target));
	const consistent = result => !mismatches(result).length;
	const numberText = value => Number.isFinite(value) ? String(Number(value.toPrecision(8))) : '无有效值';
	const conflict = (result, prefix = '按当前已知输入计算') => {
		const details = Object.fromEntries(mismatches(result).map(([i, target]) => {
			const field = result.out[i] || reference[i];
			const unit = field?.unit ? ` ${field.unit}` : '';
			return [`answer_${i}`, `${field?.name || `结果 ${i + 1}`}：已填写 ${numberText(target)}${unit}，${prefix}应为 ${numberText(result.out[i]?.number)}${unit}。请清空此项让它重算，或修改相关已知量。`];
		}));
		return issue('conflict', `${Object.values(details).join('；')} 非空结果也会作为已知约束；若只是修改输入后重新正算，请点击“清空计算量”，再点击“计算”。`, details);
	};
	if (!unknown.length) {
		const result = evaluate(tool, values, data);
		if (result.status !== 'ok')
			return result;
		if (!consistent(result))
			return conflict(result);
		return { ...result, values, solved: [...outputUnknown.map(([id]) => id)] };
	}
	if (unknown.some(f => typeof f[2] !== 'number' || f[6] === 1 || f[7]))
		return issue('unsupported', '代码、模式和离散参数不能作为连续未知量；请先补充这些字段');
	if (unknown.length > targets.length)
		return issue('underdetermined', `约束不足：有 ${unknown.length} 个输入未知量，仅 ${targets.length} 个已知结果。请补充 ${unknown.map(f => f[1]).join('、')} 中的已知量或对应结果。`);
	// Periodic and branch-changing models require explicit design choices, not arbitrary roots.
	if (['tl-zin', 'mixer-spur', 'adc-sampling', 'stub-match', 'smd-resistor-code', 'smd-capacitor-code', 'number-conversion', 'decimal-fraction'].includes(tool.id))
		return issue('unsupported', '此工具含周期、多分支或离散规则，目前支持正算；请填写原始输入');
	const exact = tool.stages ? stagedInverse(tool, values, unknown, targets) : tool.network ? networkInverse(tool, values, unknown, targets) : analyticCandidates(tool.id, values, unknown, targets);
	if (exact) {
		const valid = exact.filter(v => evaluate(tool, v, data).status === 'ok' && consistent(evaluate(tool, v, data))).filter((v, i, a) => a.findIndex(x => unknown.every(f => near(x[f[0]], v[f[0]]))) === i);
		const pack = v => ({ ...evaluate(tool, v, data), values: v, solved: [...unknown.map(f => f[0]), ...outputUnknown.map(([id]) => id)] });
		if (valid.length === 1)
			return pack(valid[0]);
		if (valid.length > 1)
			return { status: 'multiple', warning: '存在多组有效解，请选择符号 / 工作条件。', candidates: valid.map(pack) };
		const evaluated = exact.map(v => ({ values: v, result: evaluate(tool, v, data) }));
		const feasible = evaluated.find(x => x.result.status === 'ok');
		if (feasible) {
			const inferred = unknown.map(f => `${f[1]}=${numberText(feasible.values[f[0]])}${f[3] ? ` ${f[3]}` : ''}`).join('、');
			return conflict(feasible.result, `由部分已知约束得到 ${inferred} 时，计算`);
		}
		const first = evaluated[0];
		const rangeErrors = { ...first?.result.errors };
		for (const f of unknown) {
			const bounds = [f[4] !== undefined ? `≥ ${f[4]}` : '', f[5] > (f[4] ?? -Infinity) ? `≤ ${f[5]}` : ''].filter(Boolean).join('，');
			rangeErrors[f[0]] = `${f[1]}：这些已知量要求它为 ${numberText(first?.values[f[0]])}${f[3] ? ` ${f[3]}` : ''}，无法用于当前模型${bounds ? `（允许范围 ${bounds}）` : ''}。${rangeErrors[f[0]] || '请修改用于反算的已知量。'}`;
		}
		return issue('conflict', Object.values(rangeErrors).join('；'), rangeErrors);
	}
	const scales = unknown.map(f => Math.max(Math.abs(f[2]), 1));
	const bounds = unknown.map((f, i) => [(f[4] ?? -1e6 * scales[i]) / scales[i], (f[5] > (f[4] ?? -Infinity) ? f[5] : 1e6 * scales[i]) / scales[i]]);
	const project = x => x.map((v, i) => Math.max(bounds[i][0], Math.min(bounds[i][1], v)));
	const unpack = x => ({ ...values, ...Object.fromEntries(unknown.map((f, i) => [f[0], x[i] * scales[i]])) });
	const residual = (x) => {
		const result = evaluate(tool, unpack(x), data);
		if (result.status !== 'ok')
			return null;
		const r = targets.map(([i, t]) => (result.out[i]?.number - t) / targetScale(i, t));
		return r.every(Number.isFinite) ? r : null;
	};
	const norm = r => r.reduce((sum, x) => sum + x * x, 0);
	const roots = [];
	let ranked = false;
	for (const seed of [1, 0.1, 10, 0.01, 100, -1, -0.1, -10]) {
		let x = project(unknown.map(f => Math.sign(f[2] || 1) * seed));
		for (let iteration = 0; iteration < 100; iteration++) {
			const r = residual(x);
			if (!r)
				break;
			const jac = unknown.map((_, i) => {
				const dx = 1e-5 * Math.max(1, Math.abs(x[i]));
				const next = [...x];
				next[i] = Math.min(bounds[i][1], x[i] + dx);
				if (next[i] === x[i])
					next[i] = Math.max(bounds[i][0], x[i] - dx);
				const rr = residual(next);
				return rr && next[i] !== x[i] ? rr.map((v, j) => (v - r[j]) / (next[i] - x[i])) : null;
			});
			if (jac.some(j => !j))
				break;
			const a = jac.map(u => jac.map(v => u.reduce((sum, t, j) => sum + t * v[j], 0)));
			const b = jac.map(u => -u.reduce((sum, t, j) => sum + t * r[j], 0));
			const delta = linear(a, b);
			if (!delta)
				break;
			ranked = true;
			if (norm(r) < 1e-18) {
				if (!roots.some(root => root.every((v, i) => near(v, x[i]))))
					roots.push(x);
				break;
			}
			let moved = false;
			for (let factor = 1; factor >= 1 / 1024; factor /= 2) {
				const next = project(x.map((v, i) => v + factor * delta[i]));
				const rr = residual(next);
				if (rr && norm(rr) < norm(r)) {
					x = next;
					moved = true;
					break;
				}
			}
			if (!moved)
				break;
		}
	}
	const candidates = roots.map(unpack).filter(v => consistent(evaluate(tool, v, data)));
	if (!candidates.length)
		return issue(ranked ? 'no-solution' : 'underdetermined', ranked ? '在有效搜索范围内未找到收敛解；请检查目标值、约束和单位。' : '独立约束不足或局部关系退化，请补充已知量。');
	const pack = v => ({ ...evaluate(tool, v, data), values: v, solved: [...unknown.map(f => f[0]), ...outputUnknown.map(([id]) => id)] });
	if (candidates.length > 1)
		return { status: 'multiple', warning: '发现多组有效解，请选择符合设计条件的一组。', candidates: candidates.map(pack) };
	return { ...pack(candidates[0]), warning: [evaluate(tool, candidates[0], data).warning, '数值反算通过残差校验；仅搜索字段有效范围，不保证穷尽全部解。'].filter(Boolean).join('；') };
}
