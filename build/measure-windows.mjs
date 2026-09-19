import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { CATALOG_TOOLS } from '../iframe/tool-registry.js';

async function main() {
	const server = spawn(process.execPath, ['tests/serve.mjs'], { stdio: 'ignore', windowsHide: true });
	let browser;
	try {
		let ready = false;
		for (let i = 0; i < 100; i++) {
			try {
				if ((await fetch('http://127.0.0.1:4178/iframe/eda-center.html')).ok) {
					ready = true;
					break;
				}
			}
			catch {}
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		if (!ready)
			throw new Error('Preview server unavailable');
		browser = await chromium.launch();
		const page = await browser.newPage();
		const sizes = {};
		for (const tool of CATALOG_TOOLS) {
			sizes[tool.id] = {};
			for (const width of [480, 400, 340, 280]) {
				await page.setViewportSize({ width, height: 1400 });
				await page.goto(`http://127.0.0.1:4178/iframe/eda-tool.html#${tool.id}`);
				await page.locator(`#toolForm[data-tool-id="${tool.id}"]`).waitFor();
				await page.evaluate(() => document.fonts.ready);
				const initial = await page.evaluate(() => document.body.getBoundingClientRect().height);
				await page.locator('#calculateButton').click();
				const calculated = await page.evaluate(() => document.body.getBoundingClientRect().height);
				sizes[tool.id][width] = Math.ceil(Math.max(initial, calculated));
			}
		}
		await fs.writeFile('iframe/tool-window-sizes.json', `${JSON.stringify(sizes, null, '\t')}\n`);
		console.log(`Measured ${CATALOG_TOOLS.length} tools at 4 widths; LM317: ${JSON.stringify(sizes['legacy-lm317'])}`);
	}
	finally {
		await browser?.close();
		server.kill();
	}
}
main().catch((error) => {
	process.stderr.write(`${error.stack}\n`);
	process.exitCode = 1;
});
