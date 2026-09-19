/* global eda, EPCB_PrimitiveType, EPCB_LayerId */
export async function applySelectedTrack(out) {
	if (typeof eda === 'undefined')
		throw new Error('此操作需要在嘉立创 EDA 的 PCB 编辑器中使用');
	const selected = await eda.pcb_SelectControl.getSelectedPrimitives();
	if (selected.length !== 1 || selected[0].getState_PrimitiveType?.() !== EPCB_PrimitiveType.LINE)
		throw new Error('请在 PCB 中选中一条直线走线');
	const track = selected[0];
	const layer = track.getState_Layer();
	const outer = layer === EPCB_LayerId.TOP || layer === EPCB_LayerId.BOTTOM;
	if (!outer && !(layer >= EPCB_LayerId.INNER_1 && layer <= EPCB_LayerId.INNER_30))
		throw new Error('只能修改铜层走线');
	const width = out[outer ? 0 : 1].number;
	if (!Number.isFinite(width) || width <= 0)
		throw new Error('当前线宽无效，请重新计算');
	const modified = await eda.pcb_PrimitiveLine.modify(track, { lineWidth: width / 0.0254 });
	if (!modified)
		throw new Error('走线修改失败');
	return `已应用${outer ? '外层' : '内层'}线宽 ${Number(width.toPrecision(6))} mm`;
}
export function resistanceBands(raw, count = 5) {
	const str = String(raw).trim().replace(/Ω|ohms?/gi, '');
	let value;
	const embedded = str.match(/^(\d*)([RkKmM])(\d+)$/);
	if (embedded) {
		value = Number(`${embedded[1] || 0}.${embedded[3]}`) * ({ R: 1, k: 1000, K: 1000, m: 1e6, M: 1e6 }[embedded[2]]);
	}
	else {
		const match = str.match(/^(\d+(?:\.\d+)?)\s*([km]?)$/i);
		if (!match)
			throw new Error('无法识别选中器件的阻值，请手动输入色环');
		value = Number(match[1]) * (match[2] ? /k/i.test(match[2]) ? 1000 : 1e6 : 1);
	}
	if (value <= 0)
		throw new Error('零欧姆请使用跳线标记');
	const digits = count > 4 ? 3 : 2;
	const multiplier = Math.floor(Math.log10(value)) - digits + 1;
	const significant = value / 10 ** multiplier;
	if (multiplier < -2 || multiplier > 9 || Math.abs(Math.round(significant) - significant) > 1e-7)
		throw new Error('该阻值不能用当前色环位数精确表示');
	const code = String(Math.round(significant));
	return { d1: Number(code[0]), d2: Number(code[1]), d3: Number(code[2] || 0), multiplier };
}
export async function readSelectedResistor(count) {
	if (typeof eda === 'undefined')
		throw new Error('请在嘉立创 EDA 的 PCB 中选中一个电阻器件');
	const selected = await eda.pcb_SelectControl.getSelectedPrimitives();
	if (selected.length !== 1 || selected[0].getState_PrimitiveType?.() !== EPCB_PrimitiveType.COMPONENT)
		throw new Error('请只选中一个电阻器件');
	const component = selected[0];
	const properties = component.getState_OtherProperty?.() || {};
	return resistanceBands(properties.Value ?? properties.Resistance ?? component.getState_Name(), count);
}
