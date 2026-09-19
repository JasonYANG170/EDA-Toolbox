// Closed-form inverses for common component relations. Null means use bounded solver.
export function analyticCandidates(id, v, unknown, targets) {
	const t = Object.fromEntries(targets);
	const key = unknown.length === 1 ? unknown[0][0] : '';
	if (id === 'legacy-ohm') {
		let r = v.resistance;
		let u = v.voltage;
		if (r === '' && t[2] > 0)
			r = 1 / t[2];
		if (r === '' && t[0] !== undefined && u !== '')
			r = u / t[0];
		if (r === '' && t[1] !== undefined && u !== '')
			r = u * u / t[1];
		if (r === '' && t[0] !== undefined && t[1] !== undefined)
			r = t[1] / (t[0] * t[0]);
		if (u === '' && r !== '' && t[0] !== undefined)
			u = t[0] * r;
		if (u === '' && r !== '' && t[1] >= 0)
			return [1, -1].map(sign => ({ ...v, resistance: r, voltage: sign * Math.sqrt(t[1] * r) }));
		if (u !== '' && r !== '')
			return [{ ...v, voltage: u, resistance: r }];
	}
	if (!key || t[0] === undefined)
		return null;
	const y = t[0];
	let x;
	if (id === 'legacy-voltage-divider')
		x = ({ vin: () => y * (v.r1 + v.r2) / v.r2, r1: () => v.r2 * (v.vin / y - 1), r2: () => y * v.r1 / (v.vin - y) })[key]?.();
	if (id === 'legacy-battery')
		x = ({ capacity: () => y * v.load * 100 / v.efficiency, load: () => v.capacity * v.efficiency / (100 * y), efficiency: () => y * v.load * 100 / v.capacity })[key]?.();
	if (id === 'legacy-led')
		x = ({ supply: () => v.forward + y * v.current / 1000, forward: () => v.supply - y * v.current / 1000, current: () => 1000 * (v.supply - v.forward) / y })[key]?.();
	if (id === 'legacy-lm317')
		x = ({ r1: () => 1.25 * v.r2 / (y - 1.25 - v.iadj * 1e-6 * v.r2), r2: () => (y - 1.25) / (1.25 / v.r1 + v.iadj * 1e-6), iadj: () => (y - 1.25 * (1 + v.r2 / v.r1)) * 1e6 / v.r2 })[key]?.();
	if (id === 'legacy-555')
		x = ({ ra: () => 1 / (0.693 * y * v.c * 1e-9) - 2 * v.rb, rb: () => (1 / (0.693 * y * v.c * 1e-9) - v.ra) / 2, c: () => 1e9 / (0.693 * y * (v.ra + 2 * v.rb)) })[key]?.();
	if (id === 'legacy-resistor' || id === 'legacy-capacitor') {
		const names = id === 'legacy-resistor' ? ['r1', 'r2', 'r3'] : ['c1', 'c2', 'c3'];
		const sum = id === 'legacy-resistor' ? v.topology === 'series' : v.topology === 'parallel';
		if (names.includes(key)) {
			const others = names.filter(n => n !== key).map(n => v[n]);
			x = sum ? y - others.reduce((a, b) => a + b, 0) : 1 / (1 / y - others.reduce((a, b) => a + 1 / b, 0));
		}
	}
	if (id === 'legacy-rc-time')
		x = ({ r: () => y / (v.c * 1e-6), c: () => y / (v.r * 1e-6) })[key]?.();
	if (id === 'legacy-thermal')
		x = ({ power: () => (y - v.ambient) / v.theta, theta: () => (y - v.ambient) / v.power, ambient: () => y - v.power * v.theta })[key]?.();
	if (id === 'capacitor-discharge')
		x = ({ capacitance: () => y * 1e6 / (v.resistance * Math.log(v.v0 / v.vt)), resistance: () => y / (v.capacitance * 1e-6 * Math.log(v.v0 / v.vt)), v0: () => v.vt * Math.exp(y / (v.resistance * v.capacitance * 1e-6)), vt: () => v.v0 * Math.exp(-y / (v.resistance * v.capacitance * 1e-6)) })[key]?.();
	if (id === 'temperature-conversion' && key === 'value')
		x = v.unit === 'C' ? y : v.unit === 'F' ? y * 9 / 5 + 32 : y + 273.15;
	if (id === 'resonator')
		x = ({ l: () => 1e21 / ((2 * Math.PI * y * 1e6) ** 2 * v.c), c: () => 1e21 / ((2 * Math.PI * y * 1e6) ** 2 * v.l) })[key]?.();
	return Number.isFinite(x) ? [{ ...v, [key]: x }] : null;
}
