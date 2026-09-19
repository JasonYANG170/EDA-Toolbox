/* global eda */
import { restoreCenterOnClose } from './tool-close.js';
import { calculationWindowSize } from './tool-window.js';

export const utilities = [
	{ id: 'utility-library', title: '我的器件库', description: '库存、订单导入与器件查找', html: 'myLib', frame: 'eda-toolbox-library' },
	{ id: 'utility-ai', title: 'AI 助手', description: '配置本地 Ollama 服务后使用', html: 'ai', frame: 'eda-toolbox-ai' },
	{ id: 'utility-help', title: '使用说明', description: '工具箱说明与操作帮助', html: 'home', frame: 'eda-toolbox-home' },
	{ id: 'utility-game', title: '摸摸小鱼', description: '接住 EDA 休闲小游戏', html: 'game', frame: 'eda-toolbox-game' },
	{ id: 'utility-update', title: '检测更新', description: '暂未实现', disabled: true },
].map(t => ({ ...t, category: 'utilities', model: '', window: { width: 860, height: 700 } }));
export function readStore(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (key === 'eda-toolbox-eda-theme' && ['light', 'dark'].includes(raw))
			return raw;
		const parsed = JSON.parse(raw);
		if (Array.isArray(fallback) && !Array.isArray(parsed))
			return fallback;
		return parsed ?? fallback;
	}
	catch {
		return fallback;
	}
}
export function saveStore(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	}
	catch {
	}
}
export async function openFrame(path, id, title, closeId, width = 860, height = 740) {
	if (typeof eda === 'undefined') {
		location.href = path;
		return;
	}
	const size = eda.sys_Window.getViewportSize();
	const opened = await eda.sys_IFrame.openIFrame(path, Math.max(280, Math.min(width, size.width - 32)), Math.max(id === 'eda-toolbox-tool' ? 160 : 280, Math.min(height, size.height - 32)), id, { title, maximizeButton: true, onBeforeCloseCallFn: id === 'eda-toolbox-tool' ? restoreCenterOnClose : undefined });
	if (!opened)
		throw new Error('窗口未能打开，请重试');
	if (closeId && closeId !== id) {
		if (id === 'eda-toolbox-tool' && closeId === 'eda-toolbox-center')
			await eda.sys_IFrame.hideIFrame(closeId);
		else await eda.sys_IFrame.closeIFrame(closeId);
	}
}
export async function launch(tool) {
	if (tool.disabled)
		return;
	if (tool.html)
		return openFrame(`/iframe/${tool.html}.html`, tool.frame, tool.title, 'eda-toolbox-center', tool.window.width, tool.window.height);
	if (typeof eda !== 'undefined')
		await eda.sys_Storage.setExtensionUserConfig('eda-toolbox-active-tool', tool.id);
	const dimensions = calculationWindowSize(tool.id, typeof eda === 'undefined' ? { width: innerWidth, height: innerHeight } : eda.sys_Window.getViewportSize());
	return openFrame(typeof eda === 'undefined' ? `/iframe/eda-tool.html#${encodeURIComponent(tool.id)}` : '/iframe/eda-tool.html', 'eda-toolbox-tool', tool.title, 'eda-toolbox-center', dimensions.width, dimensions.height);
}
export async function returnToCenter(closeId = 'eda-toolbox-tool') {
	return openFrame('/iframe/eda-center.html', 'eda-toolbox-center', 'EDA 工具中心', closeId);
}
