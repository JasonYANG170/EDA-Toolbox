/* global eda */
(function () {
	'use strict';

	const diagramKey = document.body.dataset.diagram;
	if (!diagramKey) {
		return;
	}

	document.querySelectorAll('.toolbox-reference, .toolbox-visual').forEach(element => element.remove());
	document.querySelectorAll('.formula, .show-formula-button, .toolbox-formula-toggle').forEach(element => element.remove());
	document.body.classList.remove('toolbox-formula-expanded');

	const windowIds = {
		battery: 'eda-toolbox-battery',
		capacitor: 'eda-toolbox-capacitor',
		current: 'eda-toolbox-current',
		db: 'eda-toolbox-db',
		led: 'eda-toolbox-led',
		lm317: 'eda-toolbox-lm317',
		ohm: 'eda-toolbox-ohm',
		pcbImpedance: 'eda-toolbox-pcb-impedance',
		pcbSignal: 'eda-toolbox-pcb-signal',
		pcbThermal: 'eda-toolbox-pcb-thermal',
		pcbVia: 'eda-toolbox-pcb-via',
		rcFilter: 'eda-toolbox-rc-filter',
		rcTime: 'eda-toolbox-rc-time',
		resistor: 'eda-toolbox-resistor',
		resistorColor: 'eda-toolbox-resistor-color',
		timer555: 'eda-toolbox-555',
		transistor: 'eda-toolbox-transistor',
		voltageDivider: 'eda-toolbox-voltage-divider',
	};

	if (!windowIds[diagramKey] || typeof eda === 'undefined' || document.querySelector('.toolbox-navigation')) {
		return;
	}

	const container = document.querySelector('.container') || document.body;
	const navigation = document.createElement('div');
	navigation.className = 'toolbox-navigation';
	const backButton = document.createElement('button');
	backButton.type = 'button';
	backButton.textContent = '← 返回工具中心';
	backButton.addEventListener('click', async () => {
		const viewport = eda.sys_Window.getViewportSize();
		const width = Math.max(360, Math.min(900, viewport.width - 96));
		const height = Math.max(360, Math.min(660, viewport.height - 96));
		await eda.sys_IFrame.openIFrame('/iframe/eda-center.html', width, height, 'eda-toolbox-center', { title: 'EDA 工具中心', maximizeButton: true });
		await eda.sys_IFrame.closeIFrame(windowIds[diagramKey]);
	});
	navigation.append(backButton);
	container.prepend(navigation);
})();
