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
export function home_help(): void {
	eda.sys_IFrame.openIFrame('/iframe/home.html', 550, 550);
}
export function sch_oumut(): void {
	eda.sys_IFrame.openIFrame('/iframe/oumu.html', 300, 550);
}
export function sch_fenya(): void {
	eda.sys_IFrame.openIFrame('/iframe/fenya.html', 300, 550);
}
export function sch_dianchi(): void {
	eda.sys_IFrame.openIFrame('/iframe/dianchi.html', 300, 550);
}
export function sch_dianzu(): void {
	eda.sys_IFrame.openIFrame('/iframe/dianzu.html', 300, 550);
}
export function sch_led(): void {
	eda.sys_IFrame.openIFrame('/iframe/led.html', 300, 550);
}
export function sch_lm317(): void {
	eda.sys_IFrame.openIFrame('/iframe/lm317.html', 300, 550);
}
export function sch_555(): void {
	eda.sys_IFrame.openIFrame('/iframe/555.html', 300, 550);
}
export function sch_dianrong(): void {
	eda.sys_IFrame.openIFrame('/iframe/dianrong.html', 300, 550);
}
export function sch_dianliu(): void {
	eda.sys_IFrame.openIFrame('/iframe/dianliu.html', 300, 550);
}
export function pcb_sehuan(): void{
	eda.sys_IFrame.openIFrame('/iframe/sehuan.html', 300, 550);
}


