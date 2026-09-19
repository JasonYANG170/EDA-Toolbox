export const isStagedTool = tool => ['current-divider', 'noisefig', 'cascade'].includes(tool.id);
export function createStagedTool(base, stages = [1, 2, 3]) {
	const divider = base.id === 'current-divider';
	const prefix = base.id === 'noisefig' ? 'g' : 'gain';
	const originals = new Map(base.fields.map(f => [f[0], f]));
	const fixed = base.fields.filter(f => !/^(?:r|g|gain|nf)\d+$/.test(f[0]));
	const fields = stages.flatMap((id, index) => {
		if (divider)
			return [[`r${id}`, `支路 ${index + 1} 电阻`, originals.get(`r${id}`)?.[2] ?? 100, 'Ω', 0.0001]];
		return [[`${prefix}${id}`, `第 ${index + 1} 级增益`, originals.get(`${prefix}${id}`)?.[2] ?? 0, 'dB'], [`nf${id}`, `第 ${index + 1} 级噪声系数`, originals.get(`nf${id}`)?.[2] ?? 0, 'dB', 0]];
	});
	return { ...base, stages, fields: divider ? [...fixed, ...fields] : [...fields, ...fixed] };
}
export function friisFactor(noiseFactors, gains) {
	let precedingGain = 1;
	let factor = 1;
	for (let i = 0; i < noiseFactors.length; i++) {
		factor += (noiseFactors[i] - 1) / precedingGain;
		precedingGain *= gains[i];
	}
	return factor;
}
export function stagedInverse(tool, values, unknown, targets) {
	if (unknown.length !== 1)
		return null;
	const key = unknown[0][0];
	const t = Object.fromEntries(targets);
	const stages = tool.stages;
	let value;
	if (tool.id === 'current-divider') {
		const current = targets.find(([index]) => index < stages.length);
		if (key === 'total' && current) {
			const conductance = stages.reduce((sum, i) => sum + 1 / values[`r${i}`], 0);
			value = current[1] * conductance * values[`r${stages[current[0]]}`];
		}
		else if (key.startsWith('r')) {
			const others = stages.filter(i => `r${i}` !== key).reduce((sum, i) => sum + 1 / values[`r${i}`], 0);
			if (t[stages.length] !== undefined)
				value = 1 / (1 / t[stages.length] - others);
			else if (current)
				value = `r${stages[current[0]]}` === key ? (values.total / current[1] - 1) / others : 1 / (values.total / (values[`r${stages[current[0]]}`] * current[1]) - others);
		}
	}
	else {
		const prefix = tool.id === 'noisefig' ? 'g' : 'gain';
		const gainTarget = t[tool.id === 'noisefig' ? 2 : 0];
		const noiseTarget = t[tool.id === 'noisefig' ? 0 : 1];
		if (key.startsWith(prefix) && gainTarget !== undefined)
			value = gainTarget - stages.filter(i => `${prefix}${i}` !== key).reduce((sum, i) => sum + values[`${prefix}${i}`], 0);
		if (key.startsWith('nf') && noiseTarget !== undefined) {
			let knownFactor = 1;
			let preceding = 1;
			let divisor = 1;
			for (const i of stages) {
				if (`nf${i}` === key)
					divisor = preceding;
				else knownFactor += (10 ** (values[`nf${i}`] / 10) - 1) / preceding;
				preceding *= 10 ** (values[`${prefix}${i}`] / 10);
			}
			value = 10 * Math.log10(1 + (10 ** (noiseTarget / 10) - knownFactor) * divisor);
		}
	}
	return value === undefined || !Number.isFinite(value) ? null : [{ ...values, [key]: value }];
}
