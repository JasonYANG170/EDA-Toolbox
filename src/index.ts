import extensionConfig from '../extension.json' with { type: 'json' };
/**
 * 入口文件
 *
 * 本文件为默认扩展入口文件，如果你想要配置其它文件作为入口文件，
 * 请修改 `extension.json` 中的 `entry` 字段；
 *
 * 请在此处使用 `export`  导出所有你希望在 `headerMenus` 中引用的方法，
 * 方法通过方法名与 `headerMenus` 关联。
 *
 * 如需了解更多开发细节，请阅读：
 * https://prodocs.lceda.cn/cn/api/guide/
 */
import { restoreCenterOnClose } from '../iframe/tool-close.js';
import { calculationWindowSize } from '../iframe/tool-window.js';

interface ToolWindowSpec {
	html: string;
	width: number;
	height: number;
	id: string;
	title?: string;
}

const TOOL_WINDOWS = {
	ai: { html: '/iframe/ai.html', width: 680, height: 620, id: 'eda-toolbox-ai' },
	myLib: { html: '/iframe/myLib.html', width: 860, height: 500, id: 'eda-toolbox-library' },
	home: { html: '/iframe/home.html', width: 640, height: 560, id: 'eda-toolbox-home' },
	game: { html: '/iframe/game.html', width: 420, height: 600, id: 'eda-toolbox-game' },
	edaCenter: { html: '/iframe/eda-center.html', width: 900, height: 660, id: 'eda-toolbox-center', title: 'EDA 工具中心' },
} as const satisfies Record<string, ToolWindowSpec>;

async function openToolboxFrame(spec: ToolWindowSpec): Promise<void> {
	const viewport = eda.sys_Window.getViewportSize();
	const width = Math.max(280, Math.min(spec.width, viewport.width - 32));
	const height = Math.max(spec.id === 'eda-toolbox-tool' ? 160 : 280, Math.min(spec.height, viewport.height - 32));
	const opened = await eda.sys_IFrame.openIFrame(spec.html, width, height, spec.id, {
		title: spec.title,
		maximizeButton: true,
		onBeforeCloseCallFn: spec.id === 'eda-toolbox-tool' ? restoreCenterOnClose : undefined,
	});
	if (!opened)
		throw new Error('工具窗口未能打开，请重试');
}

async function openRegisteredTool(toolId: string, title: string): Promise<void> {
	await eda.sys_Storage.setExtensionUserConfig('eda-toolbox-active-tool', toolId);
	await openToolboxFrame({ html: '/iframe/eda-tool.html', ...calculationWindowSize(toolId, eda.sys_Window.getViewportSize()), id: 'eda-toolbox-tool', title });
}

// eslint-disable-next-line unused-imports/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {
	eda.sys_Dialog.showInformationMessage(
		eda.sys_I18n.text('EasyEDA extension SDK v', undefined, undefined, extensionConfig.version),
		eda.sys_I18n.text('About'),
	);
}
export function home_update(): void {
	eda.sys_Dialog.showInformationMessage(
		eda.sys_I18n.text('即将支持...', undefined, undefined),
		eda.sys_I18n.text('检测更新'),
		eda.sys_I18n.text('确认'),
	);
}
export async function ai(): Promise<void> {
	await openToolboxFrame(TOOL_WINDOWS.ai);
}
export async function myLib(): Promise<void> {
	await openToolboxFrame(TOOL_WINDOWS.myLib);
}
export async function home_help(): Promise<void> {
	await openToolboxFrame(TOOL_WINDOWS.home);
}
export async function home_game(): Promise<void> {
	await openToolboxFrame(TOOL_WINDOWS.game);
}
export async function eda_tool_center(): Promise<void> {
	await openToolboxFrame(TOOL_WINDOWS.edaCenter);
}
export async function sch_ohmCalculate(): Promise<void> {
	await openRegisteredTool('legacy-ohm', '欧姆定律');
}
export async function sch_voltageDividerCalculator(): Promise<void> {
	await openRegisteredTool('legacy-voltage-divider', '分压计算器');
}
export async function sch_batteryCalculate(): Promise<void> {
	await openRegisteredTool('legacy-battery', '电池续航');
}
export async function sch_resistorCalculate(): Promise<void> {
	await openRegisteredTool('legacy-resistor', '串并联电阻');
}
export async function sch_ledResistorCalculate(): Promise<void> {
	await openRegisteredTool('legacy-led', 'LED 串联电阻');
}
export async function sch_lm317VoltagecCalculate(): Promise<void> {
	await openRegisteredTool('legacy-lm317', 'LM317 稳压器');
}
export async function sch_timer555Calculate(): Promise<void> {
	await openRegisteredTool('legacy-555', '555 定时器');
}
export async function sch_capacitorCalculate(): Promise<void> {
	await openRegisteredTool('legacy-capacitor', '串并联电容');
}
export async function pcb_currentcalCalculate(): Promise<void> {
	await openRegisteredTool('legacy-current', 'PCB 走线载流');
}
export async function pcb_resistorColorCalculator(): Promise<void> {
	await openRegisteredTool('legacy-resistor-color', '色环电阻');
}
export async function sch_transistorAmplifierCalculator(): Promise<void> {
	await openRegisteredTool('legacy-transistor', '晶体管增益与偏置');
}
export async function sch_rcFilterCalculator(): Promise<void> {
	await openRegisteredTool('legacy-rc-filter', 'RC / RL / LC 滤波器');
}
export async function sch_dbCalculator(): Promise<void> {
	await openRegisteredTool('db-power', 'dB / 功率换算');
}
export async function sch_rcTimeConstantCalculator(): Promise<void> {
	await openRegisteredTool('legacy-rc-time', 'RC 时间常数');
}
// PCB相关
export async function pcb_pcbImpedanceCalculator(): Promise<void> {
	await openRegisteredTool('microstrip', '微带线阻抗');
}
export async function pcb_pcbViaCalculator(): Promise<void> {
	await openRegisteredTool('legacy-via', 'PCB 过孔载流');
}
export async function pcb_pcbSignalIntegrityCalculator(): Promise<void> {
	await openRegisteredTool('sigintegrity', '群延迟、TDR 与 SI');
}
export async function pcb_pcbThermalCalculator(): Promise<void> {
	await openRegisteredTool('legacy-thermal', 'PCB 热管理');
}
