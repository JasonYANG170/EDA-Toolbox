const C = 299792458;
const MU0 = 4e-7 * Math.PI;
const EPS0 = 1 / (MU0 * C * C);
const CATEGORIES = {
	fundamental: '电路基础',
	component: '元件识别与换算',
	conversion: '工程单位换算',
	power: '电源与能量',
	pcb: 'PCB 与互连',
	line: '传输线与基础计算',
	system: '信号链与系统',
	sparam: 'S 参数与匹配',
	passive: '滤波器与无源网络',
	antenna: '天线与阵列',
	active: '有源器件',
};
const rows = [
	['microstrip', '微带线', 'line', '阻抗、有效介电常数、波长与损耗。', 'Hammerstad–Jensen'],
	['stripline', '带状线', 'line', '内层走线阻抗、波长和 TEM 截止。', 'Wheeler stripline'],
	['coaxial', '同轴线', 'line', '特性阻抗、TE₁₁ 截止和导体损耗。', 'TEM coaxial model'],
	['cpw', 'CPW / CPWG', 'line', '共面波导阻抗、有效介电常数和波长。', 'Conformal mapping'],
	['diff-pair', '差分对', 'line', '差分、奇模、偶模阻抗与耦合度。', 'Edge-coupled approximation'],
	['waveguide', '矩形波导', 'line', 'TE₁₀ 截止、导波波长和波阻抗。', 'Rectangular waveguide TE₁₀'],
	['twowire', '双线传输线', 'line', '开路线和双绞馈线的阻抗、C、L。', 'Homogeneous TEM line'],
	['via', '过孔寄生参数', 'line', '过孔电感、焊盘电容、自谐振和阻抗。', 'PCB via closed-form'],
	['skin-depth', '趋肤深度', 'line', '趋肤深度、表面电阻和导体损耗。', 'Good-conductor skin effect'],
	['tl-zin', '传输线输入阻抗', 'line', '由负载、线长和频率计算复输入阻抗。', 'Lossless transmission line'],
	['noisefig', '接收链设计', 'system', '级联噪声系数、IIP3、灵敏度和动态范围。', 'Friis cascade'],
	['fspl', '自由空间路径损耗', 'system', 'FSPL、接收功率和最大链路距离。', 'Friis transmission'],
	['power-budget', '射频链路预算', 'system', 'EIRP、接收功率、SNR 和链路余量。', 'Link budget'],
	['radar-range', '雷达作用距离', 'system', '探测距离、SNR 和最小可检测信号。', 'Monostatic radar equation'],
	['mixer-spur', '混频杂散表', 'system', 'm×RF ± n×LO 杂散与带内判断。', 'Mixer product enumeration'],
	['adc-sampling', 'ADC 采样与混叠', 'system', '奈奎斯特区、混叠频率、频谱翻转和量化 SNR。', 'Bandpass sampling'],
	['eda-units', '射频单位换算', 'system', '频率、波长、功率、电压和噪声温度互换。', 'SI / RF unit identities'],
	['db-power', 'dB / 功率换算', 'system', 'dBm、dBW、W、mW、Vrms 与增益比。', 'Logarithmic power'],
	['vswr', 'VSWR / 回波损耗', 'system', 'VSWR、回波损耗、反射系数和失配损耗。', 'Reflection identities'],
	['gamma', '复反射系数', 'system', '从复负载阻抗计算 Γ、相位、VSWR 和回波损耗。', 'Complex reflection coefficient'],
	['sparam-plot', 'S 参数绘图器', 'sparam', '导入 Touchstone 并绘制 S11、S21、S12、S22。', 'Touchstone 1.x'],
	['sparam-gen', 'S 参数生成器', 'sparam', '由阻抗和增益生成可导出的二端口数据。', 'Two-port S matrix'],
	['cascade', 'S 参数级联', 'sparam', '通过 ABCD/T 矩阵级联多个二端口。', 'S ↔ ABCD conversion'],
	['smith', 'Smith 图与自动匹配', 'sparam', '阻抗点、反射系数和 L/π/T 匹配建议。', 'Smith impedance plane'],
	['stub-match', '枝节匹配', 'sparam', '单枝节、双枝节和四分之一波变换器。', 'Admittance-domain matching'],
	['amp-stability', '放大器稳定性', 'sparam', 'Rollet K、|Δ|、μ 和稳定性判定。', 'Rollet / Edwards-Sinsky'],
	['deembed', '夹具去嵌', 'sparam', '通过矩阵运算移除左右夹具寄生。', 'ABCD de-embedding'],
	['sigintegrity', '群延迟、TDR 与 SI', 'sparam', '群延迟、阻抗剖面、无源性和因果性检查。', 'IFFT / phase derivative'],
	['filter', 'LC 滤波器设计', 'passive', 'Butterworth/Chebyshev/Bessel 低通、高通、带通和带阻。', 'Low-pass prototype synthesis'],
	['attenuator', '衰减器设计', 'passive', 'π/T 衰减器阻值和电阻功耗。', 'Matched resistive pad'],
	['resonator', 'LC 谐振器', 'passive', '串并联谐振频率、Q 和 −3 dB 带宽。', 'RLC resonator'],
	['divider', 'Wilkinson 功分器', 'passive', '等分/不等分功分器阻抗与 PCB 尺寸。', 'Quarter-wave Wilkinson'],
	['coupler', '定向耦合器与混合器', 'passive', '耦合线、90° 支线和 180° 环形混合器。', 'Even/odd-mode synthesis'],
	['rlc-nonideal', '非理想 R/L/C 与 SRF', 'passive', '寄生等效电路、自谐振和频率阻抗。', 'Lumped parasitic model'],
	['impedmatch', '阻抗匹配网络', 'passive', 'L 网络、λ/4 变换器和单枝节匹配。', 'Conjugate matching'],
	['biastee', 'Bias Tee 设计', 'passive', '隔直电容、扼流电感和工作带宽。', 'Reactive isolation'],
	['balun', '巴伦与变压器', 'passive', '阻抗变换比、匝数比和磁芯磁通。', 'Ideal transformer'],
	['si-lpf', '阶梯阻抗低通', 'passive', '高低阻抗微带节的宽度和电长度。', 'Richards transformation'],
	['cl-bpf', '耦合线带通', 'passive', '偶奇模阻抗、线宽、间距和物理长度。', 'Parallel coupled-line synthesis'],
	['diplexer', '双工器设计', 'passive', '低通/高通支路分频与隔离估算。', 'Complementary filters'],
	['dipole', '偶极子 / 单极子', 'antenna', '半波偶极与四分之一波单极的长度和辐射电阻。', 'Thin-wire antenna'],
	['patch', '微带贴片天线', 'antenna', '矩形贴片宽度、长度、馈点、带宽和增益。', 'Cavity model'],
	['yagi', '八木天线', 'antenna', '3–16 单元长度、间距、增益和波束宽度。', 'Viezbicke design ratios'],
	['horn', '喇叭天线', 'antenna', '角锥/扇形喇叭增益、口径和波束宽度。', 'Aperture antenna'],
	['parabolic-dish', '抛物面天线', 'antenna', '增益、HPBW、焦距、f/D 和 G/T。', 'Parabolic aperture'],
	['array-editor', '稀疏与故障阵列', 'antenna', '单元幅相、失效、相位噪声和理想/实际方向图。', 'Discrete array factor'],
	['array', 'ULA / URA 阵列', 'antenna', '扫描、加窗、栅瓣、HPBW、SLL 和效率。', 'Array factor'],
	['helical', '螺旋天线', 'antenna', '轴向模尺寸、匝数、增益和圆极化。', 'Kraus axial-mode'],
	['pattern-3d', '3D 方向图', 'antenna', '偶极、单极、环形和贴片的三维投影与切面。', 'Analytical element patterns'],
	['pa-efficiency', 'PA 效率与工作类', 'active', 'A/AB/B/C/D/E/F 类效率、Pout 和 PAE。', 'Conduction-angle PA model'],
	['bias', '晶体管偏置设计', 'active', 'BJT/FET 偏置阻值、稳定度和旁路电容。', 'DC bias network'],
	['vco', 'VCO 与振荡器', 'active', '谐振回路、调谐灵敏度和 Leeson 相噪。', 'Leeson oscillator model'],
	['mixer-calc', '混频器设计', 'active', 'IF、镜像、转换增益、IIP3、噪声和隔离度。', 'Frequency translation'],
	['agc', 'AGC / VGA', 'active', '增益控制范围、动态范围、控制电压和建立时间。', 'Log/linear gain law'],
	['lna-match', 'LNA 噪声匹配', 'active', '噪声/增益权衡、Γopt 和匹配元件。', 'Noise-parameter circles'],
];
const TOOLS = rows.map(([id, title, category, description, model]) => ({ id, title, category, description, model, source: 'eda' }));
if (TOOLS.length !== 55 || new Set(TOOLS.map(tool => tool.id)).size !== TOOLS.length)
	throw new Error('射频与微波工具注册表必须包含 55 个不重复工具。');
const LEGACY_TOOLS = [
	['legacy-voltage-divider', '分压计算器', 'fundamental'],
	['legacy-ohm', '欧姆定律', 'fundamental'],
	['legacy-battery', '电池续航', 'power'],
	['legacy-led', 'LED 串联电阻', 'fundamental'],
	['legacy-lm317', 'LM317 稳压器', 'power'],
	['legacy-555', '555 定时器', 'fundamental'],
	['legacy-resistor', '串并联电阻', 'fundamental'],
	['legacy-capacitor', '串并联电容', 'fundamental'],
	['legacy-transistor', '晶体管增益与偏置', 'active'],
	['legacy-rc-filter', 'RC / RL / LC 滤波器', 'passive'],
	['legacy-rc-time', 'RC 时间常数', 'fundamental'],
	['legacy-resistor-color', '4 / 5 / 6 环电阻', 'component'],
	['legacy-current', 'PCB 走线载流', 'pcb'],
	['legacy-via', 'PCB 过孔载流', 'pcb'],
	['legacy-thermal', 'PCB 热管理', 'pcb'],
].map(([id, title, category]) => ({
	id,
	title,
	category,
	source: 'eda',
	description: '面向原理图与 PCB 设计的本地工程计算。',
	model: 'EDA Toolbox equation set',
}));
const CONVERSION_TOOLS = [
	['capacitance-conversion', '电容单位与代码换算', 'component', 'pF、nF、µF、F 与三位电容代码互换。'],
	['capacitor-discharge', '电容安全放电', 'power', '计算放电时间、泄放电阻和初始功率。'],
	['current-divider', '并联分流', 'fundamental', '计算并联支路电流与功率。'],
	['decimal-fraction', '小数转分数', 'conversion', '以连分数寻找指定分母范围内的最简分数。'],
	['energy-conversion', '能量换算', 'conversion', '焦耳、瓦时、卡路里与 BTU 换算。'],
	['force-conversion', '力单位换算', 'conversion', '牛顿、千克力、磅力与达因换算。'],
	['inductance-conversion', '电感单位换算', 'component', 'H、mH、µH、nH、pH 换算。'],
	['length-conversion', '长度换算', 'conversion', '公制、英制与密耳长度换算。'],
	['number-conversion', '进制与位移', 'conversion', '二、八、十、十六进制及逻辑位移。'],
	['pressure-conversion', '压力换算', 'conversion', 'Pa、bar、psi、atm、mmHg 换算。'],
	['reactance', '电抗与导纳', 'fundamental', '计算电感、电容的电抗、导纳和相位。'],
	['smd-capacitor-code', 'SMD 电容代码', 'component', '解析三位、四位 EIA 电容标记。'],
	['smd-resistor-code', 'SMD 电阻代码', 'component', '解析 3 位、4 位、R 标记和 EIA-96。'],
	['temperature-conversion', '温度换算', 'conversion', '摄氏、华氏与开尔文换算。'],
	['three-phase', '三相功率', 'power', '星形或三角形系统的有功、无功和视在功率。'],
	['volume-conversion', '体积换算', 'conversion', '升、毫升、立方米与美制容量换算。'],
	['weight-conversion', '质量换算', 'conversion', '千克、克、磅、盎司与公吨换算。'],
	['wire-size', 'AWG 线径', 'pcb', 'AWG 与导体直径、截面积和铜电阻换算。'],
].map(([id, title, category, description]) => ({ id, title, category, description, model: 'Open engineering relation', source: 'eda' }));
const MERGED_ALIASES = {
	'microstrip': '微带线阻抗计算器 / PCB 阻抗计算器',
	'db-power': '分贝计算器',
	'sigintegrity': 'PCB 信号完整性计算器',
};
const CATALOG_CATEGORIES = {
	...CATEGORIES,
};
const CATALOG_TOOLS = [
	...LEGACY_TOOLS,
	...CONVERSION_TOOLS,
	...TOOLS.map(tool => ({ ...tool, aliases: MERGED_ALIASES[tool.id] || '' })),
];
const byId = new Map(CATALOG_TOOLS.map(tool => [tool.id, tool]));
if (CATALOG_TOOLS.length !== 88 || byId.size !== 88)
	throw new Error('EDA 工具注册表必须包含 88 个不重复工具。');
const profiles = {
	line: [
		['frequency', '频率', 2.4, 'GHz', 0.000001],
		['er', '相对介电常数 εr', 4.4, '', 1.0001],
		['h', '基板高度 / 外径', 1.6, 'mm', 0.0001],
		['w', '线宽 / 内径', 3, 'mm', 0.0001],
	],
	system: [
		['frequency', '频率', 2.4, 'GHz', 0.000001],
		['distance', '距离 / 采样率', 1, 'km', 0.000001],
		['power', '输入 / 发射功率', 20, 'dBm', -300],
		['gain', '增益 / 天线增益', 12, 'dB', -200],
	],
	sparam: [
		['r', '负载实部 R', 75, 'Ω', 0],
		['x', '负载虚部 X', 20, 'Ω', -100000],
		['z0', '参考阻抗 Z₀', 50, 'Ω', 0.0001],
		['frequency', '频率', 2.4, 'GHz', 0.000001],
	],
	passive: [
		['frequency', '中心 / 截止频率', 1000, 'MHz', 0.000001],
		['z0', '系统阻抗 Z₀', 50, 'Ω', 0.0001],
		['p1', '参数 1（L / 衰减 / 比值）', 10, '', 0.000001],
		['p2', '参数 2（C / Q / 带宽）', 10, '', 0.000001],
	],
	antenna: [
		['frequency', '工作频率', 2400, 'MHz', 0.000001],
		['size', '口径 / 间距', 0.5, 'm 或 λ', 0.000001],
		['efficiency', '效率', 65, '%', 0.1, 100],
		['elements', '单元 / 匝数', 8, '', 1, 64, 1],
	],
	active: [
		['frequency', '工作频率', 2.4, 'GHz', 0.000001],
		['pin', '输入功率', -10, 'dBm', -300],
		['gain', '增益 / 电压', 20, 'dB 或 V', -100],
		['efficiency', '效率 / 控制范围', 45, '% 或 dB', 0.001],
	],
};
const specialProfiles = {
	'legacy-voltage-divider': [['vin', '输入电压', 12, 'V'], ['r1', '上臂电阻', 10000, 'Ω', 0.0001], ['r2', '下臂电阻', 10000, 'Ω', 0.0001]],
	'legacy-ohm': [['voltage', '电压', 12, 'V'], ['resistance', '电阻', 1000, 'Ω', 0.0001]],
	'legacy-battery': [['capacity', '标称容量', 2000, 'mAh', 0], ['load', '平均负载', 100, 'mA', 0.0001], ['efficiency', '可用容量', 85, '%', 0.1, 100]],
	'legacy-led': [['supply', '电源电压', 5, 'V'], ['forward', 'LED 正向压降', 2, 'V'], ['current', '目标电流', 20, 'mA', 0.0001]],
	'legacy-lm317': [['r1', 'R1', 240, 'Ω', 0.0001], ['r2', 'R2', 720, 'Ω', 0], ['iadj', 'Iadj', 50, 'µA', 0]],
	'legacy-555': [['ra', 'RA', 10000, 'Ω', 0.0001], ['rb', 'RB', 10000, 'Ω', 0.0001], ['c', 'C', 100, 'nF', 0.0001]],
	'legacy-resistor': [['r1', 'R1', 1000, 'Ω', 0.0001], ['r2', 'R2', 2200, 'Ω', 0.0001], ['r3', 'R3', 4700, 'Ω', 0.0001], ['topology', '连接方式', 'series', '', 0, 0, 0, [['series', '串联'], ['parallel', '并联']]]],
	'legacy-capacitor': [['c1', 'C1', 100, 'nF', 0.0001], ['c2', 'C2', 220, 'nF', 0.0001], ['c3', 'C3', 470, 'nF', 0.0001], ['topology', '连接方式', 'parallel', '', 0, 0, 0, [['series', '串联'], ['parallel', '并联']]]],
	'legacy-transistor': [['ic', '集电极电流', 10, 'mA', 0.0001], ['ib', '基极电流', 0.1, 'mA', 0.0001], ['vcc', '电源电压', 12, 'V', 0.0001], ['vce', '静态 VCE', 6, 'V', 0]],
	'legacy-rc-filter': [['topology', '类型', 'rc-low', '', 0, 0, 0, [['rc-low', 'RC 低通'], ['rc-high', 'RC 高通'], ['rl-low', 'RL 低通'], ['lc-low', 'LC 低通']]], ['r', 'R', 1000, 'Ω', 0.0001], ['l', 'L', 10, 'mH', 0.0001], ['c', 'C', 100, 'nF', 0.0001]],
	'legacy-rc-time': [['r', 'R', 10000, 'Ω', 0.0001], ['c', 'C', 100, 'µF', 0.0001], ['time', '观察时间', 1, 's', 0]],
	'legacy-resistor-color': [['bands', '色环数', 4, '', 4, 6, 1], ['d1', '有效数字 1', 4, '', 0, 9, 1], ['d2', '有效数字 2', 7, '', 0, 9, 1], ['d3', '有效数字 3', 0, '', 0, 9, 1], ['multiplier', '10 的幂', 2, '', -2, 9, 1], ['tolerance', '公差', 5, '%', 0.05, 20]],
	'legacy-current': [['current', '电流', 2, 'A', 0.0001], ['rise', '允许温升', 10, '°C', 0.1], ['thickness', '铜厚', 35, 'µm', 0.1], ['length', '走线长度', 100, 'mm', 0]],
	'legacy-via': [['diameter', '孔径', 0.3, 'mm', 0.01], ['plating', '镀铜厚度', 25, 'µm', 0.1], ['length', '板厚', 1.6, 'mm', 0.01], ['rise', '允许温升', 10, '°C', 0.1]],
	'legacy-thermal': [['power', '耗散功率', 2, 'W', 0], ['theta', '等效热阻', 20, '°C/W', 0.0001], ['ambient', '环境温度', 25, '°C']],
	'capacitance-conversion': [['value', '电容值', 100, '', 0], ['unit', '输入单位', 'nF', '', 0, 0, 0, [['pF', 'pF'], ['nF', 'nF'], ['uF', 'µF'], ['F', 'F']]]],
	'capacitor-discharge': [['capacitance', '电容', 470, 'µF', 0.0001], ['v0', '初始电压', 400, 'V', 0.0001], ['vt', '目标电压', 60, 'V', 0.0001], ['resistance', '泄放电阻', 100000, 'Ω', 0.0001]],
	'current-divider': [['total', '总电流', 1, 'A'], ['r1', '支路 R1', 100, 'Ω', 0.0001], ['r2', '支路 R2', 220, 'Ω', 0.0001], ['r3', '支路 R3', 470, 'Ω', 0.0001]],
	'decimal-fraction': [['value', '小数', 0.333333, ''], ['maxden', '最大分母', 1000, '', 1, 100000, 1]],
	'energy-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'Wh', '', 0, 0, 0, [['J', 'J'], ['Wh', 'Wh'], ['kWh', 'kWh'], ['cal', 'cal'], ['BTU', 'BTU']]]],
	'force-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'N', '', 0, 0, 0, [['N', 'N'], ['kN', 'kN'], ['kgf', 'kgf'], ['lbf', 'lbf'], ['dyn', 'dyn']]]],
	'inductance-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'uH', '', 0, 0, 0, [['H', 'H'], ['mH', 'mH'], ['uH', 'µH'], ['nH', 'nH'], ['pH', 'pH']]]],
	'length-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'mm', '', 0, 0, 0, [['m', 'm'], ['mm', 'mm'], ['mil', 'mil'], ['in', 'in'], ['ft', 'ft']]]],
	'number-conversion': [['value', '整数', 255, ''], ['shift', '逻辑左移位数', 0, '', 0, 31, 1]],
	'pressure-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'bar', '', 0, 0, 0, [['Pa', 'Pa'], ['kPa', 'kPa'], ['bar', 'bar'], ['psi', 'psi'], ['atm', 'atm'], ['mmHg', 'mmHg']]]],
	'reactance': [['frequency', '频率', 1000, 'Hz', 0.0001], ['l', '电感', 10, 'mH', 0.0001], ['c', '电容', 100, 'nF', 0.0001]],
	'smd-capacitor-code': [['code', '三/四位数字代码', '104', ''], ['tolerance', '公差', 10, '%', 0]],
	'smd-resistor-code': [['code', '数字 / R / EIA-96 代码', '472', '']],
	'temperature-conversion': [['value', '温度', 25, ''], ['unit', '输入单位', 'C', '', 0, 0, 0, [['C', '°C'], ['F', '°F'], ['K', 'K']]]],
	'three-phase': [['voltage', '线电压', 380, 'V', 0.0001], ['current', '线电流', 10, 'A', 0.0001], ['pf', '功率因数', 0.85, '', 0, 1], ['connection', '接法', 'wye', '', 0, 0, 0, [['wye', '星形'], ['delta', '三角形']]]],
	'volume-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'L', '', 0, 0, 0, [['L', 'L'], ['mL', 'mL'], ['m3', 'm³'], ['gal', 'US gal'], ['floz', 'US fl oz']]]],
	'weight-conversion': [['value', '数值', 1, ''], ['unit', '输入单位', 'kg', '', 0, 0, 0, [['kg', 'kg'], ['g', 'g'], ['lb', 'lb'], ['oz', 'oz'], ['tonne', 't']]]],
	'wire-size': [['awg', 'AWG', 24, '', 0, 40, 1], ['length', '导线长度', 1, 'm', 0], ['current', '电流', 1, 'A', 0]],
	'microstrip': [['mode', '计算模式', 'analysis', '', 0, 0, 0, [['analysis', '分析：线宽 → 阻抗'], ['synthesis', '综合：阻抗 → 线宽']]], ['targetZ', '目标阻抗', 50, 'Ω', 1], ['w', '线宽 W', 3, 'mm', 0.001], ['h', '介质厚度 h', 1.6, 'mm', 0.001], ['t', '铜厚 t', 0.035, 'mm', 0], ['er', '相对介电常数 εr', 4.4, '', 1.0001], ['tand', '损耗角正切 tanδ', 0.02, '', 0], ['frequency', '频率', 1, 'GHz', 0.000001], ['sigma', '导电率 σ', 5.8e7, 'S/m', 1]],
	'stripline': [['frequency', '频率', 10, 'GHz', 0.000001], ['er', '相对介电常数 εr', 4.2, '', 1.0001], ['b', '两地平面间距 b', 0.8, 'mm', 0.001], ['w', '线宽 W', 0.2, 'mm', 0.001], ['t', '铜厚 t', 0.035, 'mm', 0], ['tand', '损耗角正切 tanδ', 0.015, '', 0], ['sigma', '导电率 σ', 5.8e7, 'S/m', 1]],
	'coaxial': [['frequency', '频率', 1, 'GHz', 0.000001], ['er', '介质 εr', 2.1, '', 1.0001], ['d', '内导体直径 d', 0.9, 'mm', 0.001], ['D', '外导体内径 D', 3, 'mm', 0.002], ['tand', '损耗角正切 tanδ', 0.0002, '', 0], ['sigma', '导电率 σ', 5.8e7, 'S/m', 1]],
	'cpw': [['grounded', '结构', 'cpwg', '', 0, 0, 0, [['cpw', 'CPW'], ['cpwg', 'CPWG（背面地）']]], ['frequency', '频率', 5, 'GHz', 0.000001], ['er', '相对介电常数 εr', 3.48, '', 1.0001], ['w', '中心线宽 W', 0.6, 'mm', 0.001], ['s', '缝隙 S', 0.2, 'mm', 0.001], ['h', '介质厚度 h', 0.8, 'mm', 0.001], ['t', '铜厚 t', 0.035, 'mm', 0], ['tand', '损耗角正切 tanδ', 0.004, '', 0]],
	'diff-pair': [['topology', '结构', 'microstrip', '', 0, 0, 0, [['microstrip', '边耦合微带线'], ['stripline', '边耦合带状线']]], ['frequency', '频率', 5, 'GHz', 0.000001], ['er', '相对介电常数 εr', 4.2, '', 1.0001], ['w', '线宽 W', 0.18, 'mm', 0.001], ['s', '线间距 S', 0.2, 'mm', 0.001], ['h', '到参考平面距离 h', 0.15, 'mm', 0.001], ['t', '铜厚 t', 0.035, 'mm', 0]],
	'waveguide': [['frequency', '频率', 10, 'GHz', 0.000001], ['a', '宽边 a', 22.86, 'mm', 0.001], ['b', '窄边 b', 10.16, 'mm', 0.001], ['er', '填充介质 εr', 1, '', 1], ['mode', '模式', 'TE', '', 0, 0, 0, [['TE', 'TE'], ['TM', 'TM']]], ['m', '模式指数 m', 1, '', 0, 20, 1], ['n', '模式指数 n', 0, '', 0, 20, 1]],
	'twowire': [['frequency', '频率', 0.1, 'GHz', 0.000001], ['er', '介质 εr', 1, '', 1], ['d', '导线直径 d', 1, 'mm', 0.001], ['D', '中心距 D', 10, 'mm', 0.001], ['sigma', '导电率 σ', 5.8e7, 'S/m', 1]],
	'via': [['frequency', '频率', 5, 'GHz', 0.000001], ['length', '过孔长度 h', 1.6, 'mm', 0.001], ['drill', '成品孔径 d', 0.3, 'mm', 0.001], ['pad', '焊盘直径', 0.6, 'mm', 0.002], ['antipad', '避空直径', 1, 'mm', 0.003], ['er', '介质 εr', 4.2, '', 1.0001]],
	'skin-depth': [['frequency', '频率', 10, 'GHz', 0.000001], ['sigma', '导电率 σ', 5.8e7, 'S/m', 1], ['mur', '相对磁导率 μr', 1, '', 0.0001], ['thickness', '导体厚度', 35, 'µm', 0.001], ['width', '导体宽度', 0.2, 'mm', 0.001], ['z0', '线路阻抗', 50, 'Ω', 0.001]],
	'tl-zin': [['frequency', '频率', 1, 'GHz', 0.000001], ['r', '负载 R', 75, 'Ω', 0], ['x', '负载 X', 20, 'Ω', -1e5], ['length', '线长', 30, 'mm', 0], ['z0', '特性阻抗', 50, 'Ω', 0.0001], ['er', '有效介电常数', 3.2, '', 1]],
	'filter': [['frequency', '截止 / 中心频率', 1000, 'MHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['order', '阶数', 3, '', 1, 10, 1], ['ripple', '通带纹波', 0.1, 'dB', 0]],
	'attenuator': [['attenuation', '衰减量', 10, 'dB', 0.001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['power', '输入功率', 1, 'W', 0], ['topology', '拓扑', 'pi', '', 0, 0, 0, [['pi', 'π 型'], ['t', 'T 型']]]],
	'resonator': [['frequency', '激励频率', 100, 'MHz', 0.000001], ['l', '电感', 10, 'nH', 0.000001], ['c', '电容', 25, 'pF', 0.000001], ['q', '无载 Q', 80, '', 0.001]],
	'radar-range': [['frequency', '频率', 77, 'GHz', 0.000001], ['power', '峰值功率', 10, 'W', 0.000001], ['gain', '天线增益', 30, 'dBi', -100], ['rcs', '目标 RCS', 1, 'm²', 0.000001], ['sensitivity', '接收灵敏度', -90, 'dBm', -300]],
	'array': [['frequency', '频率', 10, 'GHz', 0.000001], ['elements', '单元数 N', 16, '', 2, 64, 1], ['spacing', '间距 d/λ', 0.5, 'λ', 0.01], ['scan', '扫描角', 0, '°', -89, 89], ['window', '加窗', 'uniform', '', 0, 0, 0, [['uniform', 'Uniform'], ['hamming', 'Hamming'], ['hann', 'Hann'], ['blackman', 'Blackman']]]],
	'array-editor': [['frequency', '频率', 10, 'GHz', 0.000001], ['elements', '单元数 N', 16, '', 2, 32, 1], ['spacing', '间距 d/λ', 0.5, 'λ', 0.01], ['scan', '扫描角', 15, '°', -89, 89], ['failed', '失效单元数', 1, '', 0, 31, 1]],
};
Object.assign(specialProfiles, {
	'noisefig': [['nf1', '第 1 级噪声系数', 1.2, 'dB', 0], ['g1', '第 1 级增益', 18, 'dB'], ['nf2', '第 2 级噪声系数', 6, 'dB', 0], ['g2', '第 2 级增益', 10, 'dB'], ['nf3', '第 3 级噪声系数', 8, 'dB', 0], ['g3', '第 3 级增益', 6, 'dB'], ['bandwidth', '噪声带宽', 20, 'MHz', 0.000001], ['snr', '所需 SNR', 10, 'dB']],
	'fspl': [['frequency', '频率', 2.4, 'GHz', 0.000001], ['distance', '距离', 0.1, 'km', 0.000001], ['ptx', '发射功率', 20, 'dBm'], ['gtx', '发射天线增益', 0, 'dBi'], ['grx', '接收天线增益', 0, 'dBi'], ['losses', '附加损耗', 0, 'dB', 0], ['sensitivity', '接收灵敏度', -80, 'dBm']],
	'power-budget': [['ptx', '发射功率', 20, 'dBm'], ['gtx', '发射天线增益', 2, 'dBi'], ['txloss', '发射端损耗', 1, 'dB', 0], ['pathloss', '路径损耗', 100, 'dB', 0], ['grx', '接收天线增益', 2, 'dBi'], ['rxloss', '接收端损耗', 1, 'dB', 0], ['sensitivity', '接收灵敏度', -90, 'dBm']],
	'mixer-spur': [['rf', '射频频率', 2.45, 'GHz', 0.000001], ['lo', 'LO 频率', 2.3, 'GHz', 0.000001], ['maxOrder', '最大阶数', 7, '', 1, 11, 1], ['center', '关注频带中心', 0.15, 'GHz', 0], ['bandwidth', '关注带宽', 0.02, 'GHz', 0]],
	'adc-sampling': [['fin', '输入频率', 2.45, 'GHz', 0], ['fs', '采样率', 1, 'GHz', 0.000001], ['bits', 'ADC 位数', 12, 'bit', 1, 32, 1], ['jitter', '时钟抖动', 0.2, 'ps', 0], ['analogSnr', '模拟链路 SNR', 80, 'dB', 0]],
	'eda-units': [['frequency', '频率', 2.4, 'GHz', 0.000001], ['power', '功率', 10, 'dBm'], ['z0', '负载阻抗', 50, 'Ω', 0.0001], ['noiseFigure', '噪声系数', 3, 'dB', 0]],
	'db-power': [['inputType', '输入类型', 'dBm', '', 0, 0, 0, [['dBm', 'dBm'], ['dBW', 'dBW'], ['W', 'W'], ['mW', 'mW'], ['Vrms', 'Vrms']]], ['value', '输入值', 10, ''], ['z0', '负载阻抗', 50, 'Ω', 0.0001]],
	'vswr': [['inputType', '输入类型', 'vswr', '', 0, 0, 0, [['vswr', 'VSWR'], ['rl', '回波损耗'], ['gamma', '|Γ|'], ['zl', '纯电阻负载']]], ['value', '输入值', 1.5, ''], ['z0', '参考阻抗', 50, 'Ω', 0.0001]],
	'gamma': [['r', '负载实部 R', 75, 'Ω', 0], ['x', '负载虚部 X', 20, 'Ω'], ['z0', '参考阻抗 Z₀', 50, 'Ω', 0.0001]],
	'sparam-plot': [['frequency', '观察频率', 2.4, 'GHz', 0.000001], ['magnitude', '手动 |S|', 0.5, '', 0, 1], ['phase', '手动相位', -45, '°', -180, 180]],
	'sparam-gen': [['s11db', 'S11', -15, 'dB'], ['s21db', 'S21', 12, 'dB'], ['s12db', 'S12', -30, 'dB'], ['s22db', 'S22', -12, 'dB'], ['phase21', 'S21 相位', -30, '°']],
	'cascade': [['gain1', '网络 1 增益', -1, 'dB'], ['gain2', '网络 2 增益', 15, 'dB'], ['gain3', '网络 3 增益', -2, 'dB'], ['nf1', '网络 1 NF', 1, 'dB', 0], ['nf2', '网络 2 NF', 3, 'dB', 0], ['nf3', '网络 3 NF', 2, 'dB', 0]],
	'smith': [['r', '负载实部 R', 75, 'Ω', 0], ['x', '负载虚部 X', 20, 'Ω'], ['z0', '参考阻抗', 50, 'Ω', 0.0001], ['frequency', '频率', 2.4, 'GHz', 0.000001]],
	'stub-match': [['r', '负载实部 R', 75, 'Ω', 0], ['x', '负载虚部 X', 20, 'Ω'], ['z0', '参考阻抗', 50, 'Ω', 0.0001], ['frequency', '频率', 2.4, 'GHz', 0.000001], ['er', '有效介电常数', 3.2, '', 1]],
	'amp-stability': [['s11m', '|S11|', 0.45, '', 0, 1], ['s11p', '∠S11', -60, '°'], ['s21m', '|S21|', 4, '', 0], ['s21p', '∠S21', 80, '°'], ['s12m', '|S12|', 0.04, '', 0], ['s12p', '∠S12', 25, '°'], ['s22m', '|S22|', 0.35, '', 0, 1], ['s22p', '∠S22', -40, '°']],
	'deembed': [['measured', '测得插损', 5, 'dB', 0], ['left', '左夹具插损', 1.2, 'dB', 0], ['right', '右夹具插损', 1.1, 'dB', 0], ['measuredDelay', '测得群延迟', 250, 'ps'], ['fixtureDelay', '单侧夹具延迟', 35, 'ps']],
	'sigintegrity': [['z0', '标称阻抗', 50, 'Ω', 0.0001], ['discontinuity', '不连续点阻抗', 65, 'Ω', 0.0001], ['length', '通道长度', 100, 'mm', 0], ['er', '有效介电常数', 3.5, '', 1], ['rise', '上升时间', 100, 'ps', 0.001], ['loss', '通道插损', 6, 'dB', 0]],
	'divider': [['frequency', '中心频率', 2.4, 'GHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['ratio', 'P2/P3 功率比', 1, '', 0.0001], ['er', '有效介电常数', 3.2, '', 1]],
	'coupler': [['frequency', '中心频率', 2.4, 'GHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['coupling', '耦合度', 10, 'dB', 0.01], ['directivity', '目标方向性', 20, 'dB', 0], ['er', '有效介电常数', 3.2, '', 1]],
	'rlc-nonideal': [['frequency', '频率', 100, 'MHz', 0.000001], ['r', 'ESR / 电阻', 0.2, 'Ω', 0], ['l', '串联电感 ESL', 1, 'nH', 0], ['c', '电容', 100, 'pF', 0.000001]],
	'impedmatch': [['rs', '源电阻', 50, 'Ω', 0.0001], ['rl', '负载电阻', 200, 'Ω', 0.0001], ['frequency', '频率', 100, 'MHz', 0.000001], ['topology', '拓扑', 'lowpass', '', 0, 0, 0, [['lowpass', 'L 型低通'], ['highpass', 'L 型高通']]]],
	'biastee': [['fmin', '最低频率', 10, 'MHz', 0.000001], ['fmax', '最高频率', 6000, 'MHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['current', '直流电流', 0.2, 'A', 0], ['voltage', '直流电压', 12, 'V', 0]],
	'balun': [['zin', '初级阻抗', 50, 'Ω', 0.0001], ['zout', '次级阻抗', 200, 'Ω', 0.0001], ['fmin', '最低频率', 10, 'MHz', 0.000001], ['magnetizingX', '最低磁化电抗/Zin', 5, '×', 1]],
	'si-lpf': [['frequency', '截止频率', 2, 'GHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['zhigh', '高阻抗线', 100, 'Ω', 0.0001], ['zlow', '低阻抗线', 20, 'Ω', 0.0001], ['order', '阶数', 5, '', 1, 9, 1], ['er', '有效介电常数', 3.2, '', 1]],
	'cl-bpf': [['frequency', '中心频率', 2.4, 'GHz', 0.000001], ['bandwidth', '带宽', 0.2, 'GHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['order', '阶数', 3, '', 2, 8, 1], ['er', '有效介电常数', 3.2, '', 1]],
	'diplexer': [['frequency', '分频点', 1, 'GHz', 0.000001], ['z0', '端口阻抗', 50, 'Ω', 0.0001], ['order', '支路阶数', 3, '', 1, 9, 1], ['separation', '端口频率间隔', 0.5, 'GHz', 0.000001]],
	'dipole': [['frequency', '频率', 144, 'MHz', 0.000001], ['velocity', '缩短系数', 0.95, '', 0.1, 1], ['diameter', '导线直径', 2, 'mm', 0.001], ['efficiency', '效率', 90, '%', 0.1, 100]],
	'patch': [['frequency', '频率', 2400, 'MHz', 0.000001], ['er', '介电常数', 4.4, '', 1.0001], ['h', '介质厚度', 1.6, 'mm', 0.001], ['efficiency', '效率', 65, '%', 0.1, 100], ['z0', '馈线阻抗', 50, 'Ω', 0.0001]],
	'yagi': [['frequency', '频率', 433, 'MHz', 0.000001], ['elements', '单元数', 7, '', 3, 20, 1], ['boom', '期望轴长', 1.2, 'λ', 0.2], ['efficiency', '效率', 85, '%', 0.1, 100]],
	'horn': [['frequency', '频率', 10, 'GHz', 0.000001], ['a', '口径宽 A', 120, 'mm', 0.001], ['b', '口径高 B', 90, 'mm', 0.001], ['efficiency', '口径效率', 55, '%', 0.1, 100]],
	'parabolic-dish': [['frequency', '频率', 12, 'GHz', 0.000001], ['diameter', '口径 D', 0.6, 'm', 0.001], ['efficiency', '口径效率', 60, '%', 0.1, 100], ['focalRatio', '焦径比 f/D', 0.4, '', 0.1, 1]],
	'helical': [['frequency', '频率', 2400, 'MHz', 0.000001], ['turns', '匝数 N', 8, '', 3, 30, 1], ['circumference', '周长 C/λ', 1, 'λ', 0.5, 1.5], ['spacing', '匝距 S/λ', 0.25, 'λ', 0.1, 0.5]],
	'pattern-3d': [['frequency', '频率', 2400, 'MHz', 0.000001], ['element', '单元', 'dipole', '', 0, 0, 0, [['dipole', '半波偶极子'], ['monopole', '四分之一波单极子'], ['patch', '贴片近似']]], ['tilt', '电下倾', 0, '°', -90, 90], ['efficiency', '效率', 80, '%', 0.1, 100]],
	'pa-efficiency': [['pin', '输入功率', 10, 'dBm'], ['pout', '输出功率', 30, 'dBm'], ['pdc', '直流功率', 2, 'W', 0.000001], ['vdd', '电源电压', 5, 'V', 0.000001], ['paClass', '工作类别', 'AB', '', 0, 0, 0, [['A', 'A 类'], ['AB', 'AB 类'], ['B', 'B 类'], ['C', 'C 类'], ['D', 'D 类']]]],
	'bias': [['device', '器件', 'bjt', '', 0, 0, 0, [['bjt', 'BJT'], ['fet', 'FET']]], ['supply', '电源电压', 12, 'V', 0.0001], ['current', '静态电流', 10, 'mA', 0.0001], ['vds', '静态 VCE/VDS', 6, 'V', 0], ['gain', 'β / gm', 100, '', 0.0001], ['frequency', '最低频率', 0.01, 'GHz', 0.000001]],
	'vco': [['inductance', '谐振电感', 10, 'nH', 0.000001], ['cmin', '最小电容', 1, 'pF', 0.000001], ['cmax', '最大电容', 8, 'pF', 0.000001], ['voltage', '调谐电压范围', 5, 'V', 0.0001], ['q', '谐振器 Q', 50, '', 0.1], ['offset', '相噪偏移', 100, 'kHz', 0.001]],
	'mixer-calc': [['rf', '射频频率', 2.45, 'GHz', 0.000001], ['lo', 'LO 频率', 2.3, 'GHz', 0.000001], ['rfPower', '射频输入', -20, 'dBm'], ['conversionLoss', '转换损耗', 7, 'dB', 0], ['iip3', 'IIP3', 10, 'dBm']],
	'agc': [['inputMin', '最小输入', -90, 'dBm'], ['inputMax', '最大输入', -20, 'dBm'], ['target', '目标输出', -10, 'dBm'], ['gainMin', '最小增益', -10, 'dB'], ['gainMax', '最大增益', 80, 'dB'], ['attack', '建立时间', 10, 'µs', 0.001]],
	'lna-match': [['frequency', '频率', 2.4, 'GHz', 0.000001], ['fmin', 'Fmin', 0.8, 'dB', 0], ['rn', '等效噪声电阻 Rn', 5, 'Ω', 0], ['gammaOptMag', '|Γopt|', 0.35, '', 0, 0.99], ['gammaOptPhase', '∠Γopt', 45, '°'], ['gammaSMag', '|Γs|', 0.3, '', 0, 0.99], ['gammaSPhase', '∠Γs', 30, '°'], ['z0', '参考阻抗', 50, 'Ω', 0.0001]],
});
function fieldsFor(tool) {
	return specialProfiles[tool.id] || profiles[tool.category];
}
const FORMULAS = Object.fromEntries([
	['microstrip', 'We=W+(t/π)ln(2h/t)；Hammerstad–Jensen Z₀(We/h,εeff)；αd=(πf/c)(εr/(εr−1))((εeff−1)/√εeff)tanδ；αc=Rs/(Z₀We)'],
	['stripline', 'Z₀≈60/√εr·ln(1.9·2(b−t)/(0.8W+t))；v=c/√εr；α=αc+αd'],
	['coaxial', 'Z₀=60/√εr·ln(D/d)；C′=2πε/ln(D/d)；L′=μln(D/d)/(2π)'],
	['cpw', 'Z₀=30π/√εeff·K(k′)/K(k)；k=W/(W+2S)'],
	['diff-pair', 'Zdiff=2Zodd；Zcommon=Zeven/2；Zodd≈Z₀(1−0.347e^(−2.9S/h))'],
	['waveguide', 'fc=(c/(2√εr))√((m/a)²+(n/b)²)；λg=λ/√(1−(fc/f)²)；ZTE=η/√(1−(fc/f)²)，ZTM=η√(1−(fc/f)²)'],
	['twowire', 'Z₀=120/√εr·acosh(D/d)；C′=1/(Z₀v)；L′=Z₀/v'],
	['via', 'L≈5.08h[ln(4h/d)+1] nH；C≈1.41εr·h·Dpad/(Dantipad−Dpad) pF；fSRF=1/(2π√LC)'],
	['skin-depth', 'δ=1/√(πfμσ)；Rs=1/(σδ)；αc≈Rs/(Z₀W)'],
	['tl-zin', 'Zin=Z₀·(ZL+jZ₀tanβl)/(Z₀+jZLtanβl)'],
	['noisefig', 'Ftotal=F1+(F2−1)/G1+(F3−1)/(G1G2)+…'],
	['fspl', 'FSPL=20log₁₀(4πd/λ)'],
	['power-budget', 'Prx=Ptx+Gtx+Grx−ΣLoss；Margin=Prx−Sensitivity'],
	['radar-range', 'Rmax=[PtG²λ²σ/((4π)³Smin)]^(1/4)'],
	['mixer-spur', 'fspur=|m·f射频±n·fLO|'],
	['adc-sampling', 'falias=|((fin+fs/2) mod fs)−fs/2|；SNRideal≈6.02N+1.76 dB'],
	['eda-units', 'λ=c/f；PW=10^((PdBm−30)/10)；Vrms=√(PR)'],
	['db-power', 'PdBm=10log₁₀(PW/1mW)；GdB=10log₁₀(P2/P1)'],
	['vswr', 'VSWR=(1+|Γ|)/(1−|Γ|)；RL=−20log₁₀|Γ|'],
	['gamma', 'Γ=(ZL−Z₀)/(ZL+Z₀)'],
	['sparam-plot', 'SdB=20log₁₀|S|；∠S=atan2(ImS,ReS)'],
	['sparam-gen', '[b]=[S][a]；S11=(Zin−Z₀)/(Zin+Z₀)'],
	['cascade', '[ABCD]total=Π[ABCD]n'],
	['smith', 'z=(1+Γ)/(1−Γ)；Γ=(z−1)/(z+1)'],
	['stub-match', 'Yin=Y₀(YL+jY₀tanβl)/(Y₀+jYLtanβl)'],
	['amp-stability', 'K=(1−|S11|²−|S22|²+|Δ|²)/(2|S12S21|)'],
	['deembed', 'TDUT=Tleft⁻¹·Tmeasured·Tright⁻¹'],
	['sigintegrity', 'τg=−dφ/dω；Z(t)=Z₀(1+ρ)/(1−ρ)'],
	['filter', 'ωc=1/RC（RC）；ωc=R/L（RL）；ω₀=1/√LC（LC）'],
	['attenuator', 'K=10^(A/20)；Rseries=Z₀(K²−1)/(2K)'],
	['resonator', 'f₀=1/(2π√LC)；BW=f₀/Q'],
	['divider', 'Zλ/4=Z₀√2；Riso=2Z₀（等分 Wilkinson）'],
	['coupler', 'Z0e=Z₀√((1+C)/(1−C))；Z0o=Z₀√((1−C)/(1+C))'],
	['rlc-nonideal', 'Z=R+jωL+1/(jωC)；fSRF=1/(2π√LC)'],
	['impedmatch', 'Q=√(Rhigh/Rlow−1)；Xs=QRlow；Xp=Rhigh/Q'],
	['biastee', 'C≥1/(2πfminXC)；L≥XL/(2πfmin)'],
	['balun', 'Zp/Zs=(Np/Ns)²；Vp/Vs=Np/Ns'],
	['si-lpf', 'θL=gL·R₀/Zhigh；θC=gC·Zlow/R₀'],
	['cl-bpf', 'Z0e=Z₀[1+JZ₀+(JZ₀)²]；Z0o=Z₀[1−JZ₀+(JZ₀)²]'],
	['diplexer', 'fc,LP<fcrossover<fc,HP；隔离由两支路阻带衰减决定'],
	['dipole', 'Lhalf≈0.95λ/2；Rrad≈73Ω'],
	['patch', 'W=c/(2f)√(2/(εr+1))；L≈c/(2f√εeff)−2ΔL'],
	['yagi', 'Lelement=kλ/2；d≈0.15λ…0.3λ'],
	['horn', 'G≈η4πA/λ²；HPBW≈kλ/D'],
	['parabolic-dish', 'G=η(πD/λ)²；HPBW≈70λ/D'],
	['array-editor', 'AF(θ)=Σane^{j(nkd sinθ+φn+εn)}'],
	['array', 'AF(θ)=Σwne^{jn(kd sinθ+β)}'],
	['helical', 'C≈λ；S≈λ/4；G≈15N(C/λ)²(S/λ)'],
	['pattern-3d', 'U(θ,φ)=|Eelement(θ,φ)·AF(θ,φ)|²'],
	['pa-efficiency', 'ηD=Pout/Pdc；PAE=(Pout−Pin)/Pdc'],
	['bias', 'IC≈βIB；VB=VE+VBE；RE=VE/IE'],
	['vco', 'f₀=1/(2π√LC(V))；L(Δf) 使用 Leeson 相噪关系'],
	['mixer-calc', 'fIF=|f射频−fLO|；PIF=P射频−Lconversion'],
	['agc', 'G(V)=Gmin+kV（线性）或 GdB=G0+kV（对数）'],
	['lna-match', 'F=Fmin+4Rn/Z₀·|Γs−Γopt|²/((1−|Γs|²)|1+Γopt|²)'],
	['legacy-voltage-divider', 'Vout=Vin·R2/(R1+R2)；Rout=R1∥R2'],
	['legacy-ohm', 'V=IR；P=VI=I²R=V²/R'],
	['legacy-battery', 'trun=Capacity·η/Iload'],
	['legacy-led', 'R=(Vs−Vf)/If；PR=(Vs−Vf)If'],
	['legacy-lm317', 'Vout=1.25(1+R2/R1)+IadjR2'],
	['legacy-555', 'tH=0.693(RA+RB)C；tL=0.693RBC'],
	['legacy-resistor', 'Rseries=ΣRi；Rparallel=1/Σ(1/Ri)'],
	['legacy-capacitor', 'Cparallel=ΣCi；Cseries=1/Σ(1/Ci)'],
	['legacy-transistor', 'β=IC/IB；RC=(VCC−VCE)/IC'],
	['legacy-rc-filter', 'fc=1/(2πRC)、R/(2πL) 或 1/(2π√LC)'],
	['legacy-rc-time', 'τ=RC；Vcharge=Vs(1−e^(−t/τ))；Vdischarge=V0e^(−t/τ)'],
	['legacy-resistor-color', 'R=(有效数字)·10^乘数；Rmin,max=R(1∓公差)'],
	['legacy-current', 'I=k·ΔT^0.44·A^0.725；IPC-2221 工程近似'],
	['legacy-via', 'R=ρl/A；A≈πd·t'],
	['legacy-thermal', 'Tj=Ta+PθJA'],
	['capacitance-conversion', '1F=10³mF=10⁶µF=10⁹nF=10¹²pF；代码ABN=(10A+B)·10^N pF'],
	['capacitor-discharge', 't=RC·ln(V₀/Vt)；E=CV₀²/2；P₀=V₀²/R'],
	['current-divider', 'Ik=Itotal·Gk/ΣGi；Gi=1/Ri'],
	['decimal-fraction', 'x≈pn/qn；pn=anpn−1+pn−2，qn=anqn−1+qn−2（连分数）'],
	['energy-conversion', '1Wh=3600J；1cal=4.184J；1BTU=1055.05585J'],
	['force-conversion', '1kgf=9.80665N；1lbf=4.4482216N'],
	['inductance-conversion', '1H=10³mH=10⁶µH=10⁹nH=10¹²pH'],
	['length-conversion', '1in=25.4mm；1mil=0.0254mm；1ft=12in'],
	['number-conversion', 'N=Σdi·b^i；左移 n 位等价于 N·2^n（无溢出时）'],
	['pressure-conversion', '1bar=10⁵Pa；1atm=101325Pa；1psi=6894.757Pa'],
	['reactance', 'XL=2πfL；XC=1/(2πfC)；|B|=1/|X|'],
	['smd-capacitor-code', '代码 ABN 表示 C=(10A+B)·10^N pF'],
	['smd-resistor-code', '3位 ABN：R=(10A+B)·10^NΩ；4位 ABCN：R=(100A+10B+C)·10^NΩ；R 为小数点；EIA-96：R=E96[n]·Mletter'],
	['temperature-conversion', '°F=°C·9/5+32；K=°C+273.15'],
	['three-phase', 'S=√3VLIL；P=S·cosφ；Q=S·sinφ'],
	['volume-conversion', '1m³=1000L；1 US gal=3.7854118L；1 fl oz=29.5735mL'],
	['weight-conversion', '1lb=0.45359237kg；1oz=28.3495g；1t=1000kg'],
	['wire-size', 'd(mm)=0.127·92^((36−AWG)/39)；A=πd²/4；R=ρl/A'],
]);
for (const tool of CATALOG_TOOLS) {
	tool.fields = fieldsFor(tool);
	tool.formula = FORMULAS[tool.id];
	tool.window = { width: 820, height: 740 };
}
export { byId, C, CATALOG_CATEGORIES, CATALOG_TOOLS, EPS0, FORMULAS, MU0 };
// Descriptions describe the implemented approximation, not a full field solver.
const descriptions = {
	'cascade': ['增益与噪声级联', '自定义多级增益和 Friis 噪声级联；不含失配矩阵。'],
	'deembed': ['匹配夹具损耗扣除', '匹配条件下扣除夹具插损与延迟；不含完整矩阵去嵌。'],
	'sigintegrity': ['走线延迟与反射', '单个阻抗不连续处的反射、走线延迟和上升时间估算。'],
	'smith': ['Smith 阻抗点', '复阻抗与反射系数换算及阻抗点显示。'],
	'sparam-gen': ['S 参数幅度换算', '单频点四个 S 参数的 dB 与幅度换算。'],
	'filter': ['Butterworth 低通原型', '理想 Butterworth 低通 LC 梯形网络元件值。'],
	'stub-match': ['单并联枝节匹配', '无损传输线的两组并联开路 / 短路枝节解。'],
	'array-editor': ['均匀线阵估算', '均匀线阵孔径、扫描波束与栅瓣估算，不含故障建模。'],
	'array': ['均匀线阵 ULA', '理想均匀线阵方向图、扫描和栅瓣估算。'],
	'pattern-3d': ['天线方向图切面', '解析单元的归一化二维切面，不是完整三维仿真。'],
	'patch': ['微带贴片天线', '传输线近似下的矩形贴片尺寸与效率估算。'],
	'yagi': ['八木尺寸估算', '经验单元长度、轴长和增益估算。'],
	'horn': ['矩形口径喇叭', '口径效率模型的增益和主平面波束宽度。'],
	'helical': ['轴向模螺旋天线', 'Kraus 经验模型的尺寸、增益和波束宽度。'],
	'coupler': ['耦合线初步设计', '偶奇模阻抗、四分之一波长和理想端口功率。'],
	'capacitance-conversion': ['电容单位换算', 'pF、nF、µF、F 单位换算；代码解析请用 SMD 电容代码。'],
	'current-divider': ['并联分流', '三支路电流和等效电阻。'],
	'reactance': ['电抗与导纳', '电感、电容电抗与导纳幅值。'],
	'waveguide': ['矩形波导', 'TE / TM 模式截止、导波波长和波阻抗。'],
};
for (const [id, [title, description]] of Object.entries(descriptions))
	Object.assign(byId.get(id), { title, description });
byId.get('microstrip').fields = byId.get('microstrip').fields.filter(f => !['mode', 'targetZ'].includes(f[0]));
byId.get('filter').fields = byId.get('filter').fields.filter(f => !['type', 'response', 'ripple', 'topology'].includes(f[0]));
for (const id of ['array', 'array-editor'])
	byId.get(id).fields = [['elements', '单元数', 8, '', 2, 64, 1], ['spacing', '间距', 0.5, 'λ', 0.01, 2], ['scan', '扫描角', 0, '°', -80, 80]];
byId.get('sparam-plot').fields.push(['trace', 'S 参数', 'S11', '', 0, 0, 0, ['S11', 'S21', 'S12', 'S22'].map(x => [x, x])]);
byId.get('legacy-resistor-color').fields.push(['tcr', '温度系数', 100, 'ppm/K', 0, 0, 0, [[100, '棕 100'], [50, '红 50'], [15, '橙 15'], [25, '黄 25'], [10, '蓝 10'], [5, '紫 5'], [1, '灰 1']]]);
byId.get('legacy-resistor-color').fields = byId.get('legacy-resistor-color').fields.map(f => f[0] === 'tolerance' ? ['tolerance', '公差', 5, '%', 0, 0, 0, [[1, '棕 ±1%'], [2, '红 ±2%'], [0.5, '绿 ±0.5%'], [0.25, '蓝 ±0.25%'], [0.1, '紫 ±0.1%'], [0.05, '灰 ±0.05%'], [5, '金 ±5%'], [10, '银 ±10%']]] : f);
FORMULAS.filter = 'gk=2sin((2k−1)π/(2N))；Lk=gk·Z₀/ωc，Ck=gk/(Z₀ωc)';
FORMULAS.via = 'L(nH)=5.08h(in)[ln(4h/d)+1]；C(pF)=1.41εr·h(in)·Dpad/(Dantipad−Dpad)';
FORMULAS.cascade = 'Gtotal(dB)=ΣGi；Ftotal=F1+(F2−1)/G1+(F3−1)/(G1G2)';
FORMULAS.deembed = 'ILdut=ILmeasured−ILleft−ILright；τdut=τmeasured−2τfixture（匹配近似）';
FORMULAS.sigintegrity = 'ρ=(Zstep−Z₀)/(Zstep+Z₀)；τ=l√εr/c；BW≈0.35/tr';
for (const tool of CATALOG_TOOLS)
	tool.formula = FORMULAS[tool.id];
for (const [id, unused] of Object.entries({ 'cpw': ['t'], 'diff-pair': ['frequency'], 'dipole': ['diameter'], 'patch': ['z0'], 'smith': ['frequency'], 'lna-match': ['frequency'], 'pattern-3d': ['frequency'] }))
	byId.get(id).fields = byId.get(id).fields.filter(f => !unused.includes(f[0]));
byId.get('number-conversion').fields[0] = ['value', '32 位有符号整数', 255, '', -2147483648, 2147483647, 1];
byId.get('resonator').fields = byId.get('resonator').fields.filter(f => f[0] !== 'frequency');

for (const [id, title, description] of [
	['sparam-plot', 'S 参数文件分析', '导入 Touchstone，计算所选 S 参数的数值指标。'],
	['pattern-3d', '天线单元参数', '解析单元的波长和方向性参数估算。'],
	['array', '均匀线阵 ULA', '理想均匀线阵的扫描角、波束宽度和栅瓣估算。'],
	['legacy-resistor', '串并联电阻', '自定义元件数量及多级串并联子组，支持留空反算。'],
	['legacy-capacitor', '串并联电容', '自定义元件数量及多级串并联子组，支持留空反算。'],
]) {
	const tool = byId.get(id);
	tool.aliases = `${tool.aliases || ''} ${tool.title}`;
	tool.title = title;
	tool.description = description;
}

byId.get('current-divider').description = '自定义并联支路数量，计算各支路电流及等效电阻。';
byId.get('noisefig').description = '自定义接收链级数，计算级联噪声、增益和灵敏度。';

for (const id of ['noisefig', 'cascade']) {
	FORMULAS[id] = 'G总(dB)=ΣGi(dB)；F总=F1+Σ(i=2…N)[(Fi−1)/∏(j=1…i−1)Gj]；F、G 在噪声公式中取线性值，NF=10log₁₀(F总)。';
	byId.get(id).formula = FORMULAS[id];
}
