// A group is a series/parallel connection; a string is a component field id.
export const isNetworkTool = tool => ['legacy-resistor', 'legacy-capacitor'].includes(tool.id);
export const networkLeaves = node => typeof node === 'string' ? [node] : node.children.flatMap(networkLeaves);
export function createNetworkTool(base, network = null) {
	const prefix = base.id === 'legacy-resistor' ? 'r' : 'c';
	const root = network || { kind: base.fields.find(f => f[0] === 'topology')[2], children: [1, 2, 3].map(i => `${prefix}${i}`) };
	const original = new Map(base.fields.map(f => [f[0], f]));
	return { ...base, network: root, fields: networkLeaves(root).map(id => original.get(id) || [id, id.toUpperCase(), prefix === 'r' ? 1000 : 100, prefix === 'r' ? 'Ω' : 'nF', 0.0001]) };
}
export function networkValue(node, values, capacitor) {
	if (typeof node === 'string')
		return values[node];
	const parts = node.children.map(child => networkValue(child, values, capacitor));
	const sum = capacitor ? node.kind === 'parallel' : node.kind === 'series';
	return sum ? parts.reduce((a, b) => a + b, 0) : 1 / parts.reduce((a, b) => a + 1 / b, 0);
}
export function networkInverse(tool, values, unknown, targets) {
	if (unknown.length !== 1 || !targets.some(([i]) => i === 0))
		return null;
	const key = unknown[0][0];
	const capacitor = tool.id === 'legacy-capacitor';
	function descend(node, target) {
		if (typeof node === 'string')
			return target;
		const child = node.children.find(n => networkLeaves(n).includes(key));
		const siblings = node.children.filter(n => n !== child).map(n => networkValue(n, values, capacitor));
		const sum = capacitor ? node.kind === 'parallel' : node.kind === 'series';
		return descend(child, sum ? target - siblings.reduce((a, b) => a + b, 0) : 1 / (1 / target - siblings.reduce((a, b) => a + 1 / b, 0)));
	}
	return [{ ...values, [key]: descend(tool.network, targets.find(([i]) => i === 0)[1]) }];
}
