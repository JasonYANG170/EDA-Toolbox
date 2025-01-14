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
		eda.sys_I18n.text('确认')
	);
}
export function myLib(): void {
	eda.sys_IFrame.openIFrame('/iframe/myLib.html', 1000, 1500);
}
export function home_help(): void {
	eda.sys_IFrame.openIFrame('/iframe/home.html', 550, 550);
}
export function home_game(): void {
	eda.sys_IFrame.openIFrame('/iframe/game.html', 300, 550);
}
export function sch_ohmCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/ohmCalculate.html', 300, 550);
}
export function sch_voltageDividerCalculator(): void {
	eda.sys_IFrame.openIFrame('/iframe/voltageDividerCalculator.html', 300, 550);
}
export function sch_batteryCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/batteryCalculate.html', 300, 550);
}
export function sch_resistorCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/resistorCalculate.html', 300, 550);
}
export function sch_ledResistorCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/ledResistorCalculate.html', 300, 550);
}
export function sch_lm317VoltagecCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/lm317VoltagecCalculate.html', 300, 550);
}
export function sch_timer555Calculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/timer555Calculate.html', 300, 550);
}
export function sch_capacitorCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/capacitorCalculate.html', 300, 550);
}
export function pcb_currentcalCalculate(): void {
	eda.sys_IFrame.openIFrame('/iframe/currentcalCalculate.html', 300, 550);
}
export function pcb_resistorColorCalculator(): void{
	eda.sys_IFrame.openIFrame('/iframe/resistorColorCalculator.html', 300, 550);
}


