import sizes from './tool-window-sizes.json' with { type: 'json' };
/** Browser-measured collapsed content size, clamped to the host viewport. */
export function calculationWindowSize(id, viewport) {
	const available = Math.max(280, viewport.width - 32);
	const width = [480, 400, 340, 280].find(w => w <= available) || 280;
	const height = sizes[id]?.[width] || 420;
	return { width, height: Math.max(160, Math.min(height, viewport.height - 80)) };
}
