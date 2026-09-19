/* global eda */
// Reuse the hidden center so its search, category and scroll remain intact.
export async function restoreCenterOnClose() {
	try {
		if (await eda.sys_IFrame.showIFrame('eda-toolbox-center'))
			return true;
	}
	catch {}
	try {
		const viewport = eda.sys_Window.getViewportSize();
		return await eda.sys_IFrame.openIFrame('/iframe/eda-center.html', Math.max(280, Math.min(900, viewport.width - 32)), Math.max(280, Math.min(660, viewport.height - 80)), 'eda-toolbox-center', { title: 'EDA 工具中心', maximizeButton: true });
	}
	catch {
		return false;
	}
}
