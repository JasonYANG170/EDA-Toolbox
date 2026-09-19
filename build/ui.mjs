import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The preview server imports this module and must wait for both bundles.
// eslint-disable-next-line antfu/no-top-level-await
await build({
	absWorkingDir: root,
	entryPoints: { 'eda-tools.bundle': 'iframe/eda-tools.js', 'utility-navigation.bundle': 'iframe/utility-navigation.js' },
	outdir: 'iframe',
	bundle: true,
	format: 'iife',
	platform: 'browser',
	target: 'chrome110',
});
