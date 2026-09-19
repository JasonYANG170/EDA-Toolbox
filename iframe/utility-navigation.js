import { returnToCenter, utilities } from './tool-navigation.js';

const current = utilities.find(t => location.pathname.endsWith(`/${t.html}.html`));
const button = document.createElement('button');
button.type = 'button';
button.textContent = '← 返回 EDA 工具中心';
button.className = 'toolbox-back-center';
button.style.cssText = 'margin:8px;padding:8px 12px;border:1px solid #82b7df;border-radius:5px;color:#126cb1;background:#eef7ff;cursor:pointer;';
button.onclick = async () => {
	try {
		await returnToCenter(current?.frame);
	}
	catch (e) {
		button.textContent = e.message;
	}
};
document.body.prepend(button);
