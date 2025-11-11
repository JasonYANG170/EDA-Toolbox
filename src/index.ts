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
import * as extensionConfig from '../extension.json';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {
	eda.sys_MessageBox.showInformationMessage(
		eda.sys_I18n.text('EasyEDA extension SDK v', undefined, undefined, extensionConfig.version),
		eda.sys_I18n.text('About'),
	);
}
export function home_update(): void {
	eda.sys_MessageBox.showInformationMessage(
		eda.sys_I18n.text('即将支持...', undefined, undefined),
		eda.sys_I18n.text('检测更新'),
		eda.sys_I18n.text('确认'),
	);
}
export async function ai(): Promise<void> {
	eda.sys_IFrame.openIFrame('/iframe/ai.html', 400, 570);
}
export function myLib(): void {
	eda.sys_IFrame.openIFrame('/iframe/myLib.html', 600, 800);
}
export function home_help(): void {
	eda.sys_IFrame.openIFrame('/iframe/home.html', 550, 550);
}
export function home_game(): void {
	eda.sys_IFrame.openIFrame('/iframe/game.html', 300, 550);
}
export function sch_ohmCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/ohmCalculate.html', 430, 260);
}
export function sch_voltageDividerCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/voltageDividerCalculator.html', 430, 200);
}
export function sch_batteryCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/batteryCalculate.html', 420, 200);
}
export function sch_resistorCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/resistorCalculate.html', 430, 320);
}
export function sch_ledResistorCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/ledResistorCalculate.html', 430, 240);
}
export function sch_lm317VoltagecCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/lm317VoltagecCalculate.html', 430, 200);
}
export function sch_timer555Calculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/timer555Calculate.html', 430, 300);
}
export function sch_capacitorCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/capacitorCalculate.html', 430, 300);
}
export function pcb_currentcalCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/currentcalCalculate.html', 430, 290);
}
export function pcb_resistorColorCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/resistorColorCalculator.html', 500, 240);
}
export function sch_transistorAmplifierCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/transistorAmplifierCalculator.html', 430, 250);
}
export function sch_rcFilterCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/rcFilterCalculator.html', 430, 240);
}
export function sch_dbCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/dbCalculator.html', 430, 240);
}
export function sch_rcTimeConstantCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/rcTimeConstantCalculator.html', 430, 240);
}
// PCB相关
export function pcb_pcbImpedanceCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/pcbImpedanceCalculator.html', 430, 240);
}
export function pcb_pcbViaCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/pcbViaCalculator.html', 430, 290);
}
export function pcb_pcbSignalIntegrityCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/pcbSignalIntegrityCalculator.html', 430, 300);
}
export function pcb_pcbThermalCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/pcbThermalCalculator.html', 430, 240);
}
