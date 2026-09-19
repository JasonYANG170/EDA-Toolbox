export function parseTouchstone(text, filename = 'data.s2p') {
	const ports = /\.s1p$/i.test(filename) ? 1 : /\.s2p$/i.test(filename) ? 2 : 0;
	if (!ports)
		throw new Error('仅支持 Touchstone 1.x .s1p / .s2p');
	let unit = 1e9;
	let format = 'ma';
	let z0 = 50;
	let hasData = false;
	const tokens = [];
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.split('!')[0].trim();
		if (!line)
			continue;
		if (line.startsWith('['))
			throw new Error('暂不支持 Touchstone 2.x 关键字格式');
		if (line.startsWith('#')) {
			if (hasData)
				throw new Error('数据区内不允许更改选项');
			const p = line.slice(1).trim().toLowerCase().split(/\s+/);
			unit = { hz: 1, khz: 1e3, mhz: 1e6, ghz: 1e9 }[p[0]];
			if (!unit || p[1] !== 's' || !['ma', 'ri', 'db'].includes(p[2]))
				throw new Error('仅支持 Hz/kHz/MHz/GHz 的 S 参数及 MA/RI/DB 格式');
			format = p[2];
			if (p[3] && p[3] !== 'r')
				throw new Error('无法识别参考阻抗选项');
			z0 = p[3] ? Number(p[4]) : 50;
			if (!Number.isFinite(z0) || z0 <= 0)
				throw new Error('参考阻抗必须为正数');
		}
		else {
			hasData = true;
			const nums = line.split(/\s+/).map(x => Number(x.replace(/d/i, 'e')));
			if (nums.some(x => !Number.isFinite(x)))
				throw new Error('数据包含非法数字');
			for (const number of nums) tokens.push(number);
		}
	}
	const width = 1 + 2 * ports * ports;
	if (!tokens.length || tokens.length % width)
		throw new Error('数据不完整或端口数与扩展名不一致');
	const data = [];
	const names = ports === 1 ? ['S11'] : ['S11', 'S21', 'S12', 'S22'];
	for (let i = 0; i < tokens.length; i += width) {
		const frequency = tokens[i] * unit;
		if (frequency < 0 || (data.length && frequency <= data.at(-1).frequency))
			throw new Error('频率必须非负且严格递增');
		const s = {};
		names.forEach((name, j) => {
			const a = tokens[i + 1 + 2 * j];
			const b = tokens[i + 2 + 2 * j];
			if (format === 'ma' && a < 0)
				throw new Error('MA 幅度不得为负');
			const mag = format === 'db' ? 10 ** (a / 20) : a;
			s[name] = format === 'ri' ? [a, b] : [mag * Math.cos(b * Math.PI / 180), mag * Math.sin(b * Math.PI / 180)];
		});
		if (Object.values(s).flat().some(x => !Number.isFinite(x)))
			throw new Error('S 参数幅度溢出');
		data.push({ frequency, s });
	}
	return { ports, format, z0, data, names };
}
