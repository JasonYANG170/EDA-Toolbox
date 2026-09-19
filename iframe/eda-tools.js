/* global eda */
import { formatNumber } from './tool-core.js';
import { escapeHtml } from './tool-diagrams.js';
import { applySelectedTrack, readSelectedResistor } from './tool-host.js';
import { launch, readStore, saveStore } from './tool-navigation.js';
import { createNetworkTool, isNetworkTool, networkLeaves } from './tool-network.js';
import { byId, CATALOG_CATEGORIES, CATALOG_TOOLS } from './tool-registry.js';
import { activeFields, defaults, outputFields, solve } from './tool-solver.js';
import { createStagedTool, isStagedTool } from './tool-stages.js';
import { parseTouchstone } from './tool-touchstone.js';

const $ = id => document.getElementById(id);
const mode = document.body.dataset.edaMode;
const all = CATALOG_TOOLS;
const categories = CATALOG_CATEGORIES;
// Theme follows prefers-color-scheme automatically; saved overrides are ignored.
const remember = id => saveStore('eda-toolbox-eda-recent', [id, ...readStore('eda-toolbox-eda-recent', []).filter(x => x !== id)].slice(0, 5));
if (mode === 'catalog') {
	const saved = readStore('eda-toolbox-center-state', {});
	let selected = categories[saved.category] ? saved.category : 'all';
	$('searchInput').value = saved.query || '';
	$('categoryTabs').innerHTML = Object.entries({ all: '全部', ...categories }).map(([id, title]) => `<button type="button" data-category="${id}" class="${selected === id ? 'active' : ''}">${title}</button>`).join('');
	const card = t => `<button class="eda-tool-card" type="button" data-tool="${t.id}" ${t.disabled ? 'disabled' : ''}><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.description)}</small>${t.disabled ? '<em>暂未实现</em>' : ''}</button>`;
	const persist = () => saveStore('eda-toolbox-center-state', { query: $('searchInput').value, category: selected, scroll: window.scrollY });
	function render() {
		const q = $('searchInput').value.toLowerCase().trim();
		const filtered = all.filter(t => (selected === 'all' || t.category === selected) && `${t.title} ${t.description} ${t.aliases || ''} ${t.formula || ''}`.toLowerCase().includes(q));
		$('toolCount').textContent = `${filtered.length} / ${all.length} 个入口（88 个计算工具）`;
		$('catalogGroups').innerHTML = Object.entries(categories).map(([id, label]) => {
			const list = filtered.filter(t => t.category === id);
			return list.length ? `<section><h2>${label}</h2><div class="eda-grid">${list.map(card).join('')}</div></section>` : '';
		}).join('') || '<p>没有找到匹配的工具。</p>';
	}
	$('categoryTabs').onclick = (e) => {
		const b = e.target.closest('[data-category]');
		if (!b)
			return;
		selected = b.dataset.category;
		document.querySelectorAll('[data-category]').forEach(x => x.classList.toggle('active', x === b));
		render();
		persist();
	};
	$('searchInput').oninput = () => {
		render();
		persist();
	};
	document.addEventListener('click', async (e) => {
		const b = e.target.closest('[data-tool]');
		if (!b)
			return;
		const t = all.find(x => x.id === b.dataset.tool);
		persist();
		b.disabled = true;
		try {
			await launch(t);
			remember(t.id);
		}
		catch (error) {
			$('catalogError').hidden = false;
			$('catalogError').textContent = error.message;
		}
		finally {
			b.disabled = !!t.disabled;
		}
	});
	const recent = readStore('eda-toolbox-eda-recent', []).map(id => all.find(t => t.id === id)).filter(Boolean);
	$('recentSection').hidden = !recent.length;
	$('recentGrid').innerHTML = recent.map(card).join('');
	render();
	requestAnimationFrame(() => window.scrollTo(0, saved.scroll || 0));
	window.addEventListener('scroll', persist, { passive: true });
}
else {
	let tool;
	let data = null;
	let outputs = [];
	const knownOutputs = new Set();
	let last = null;
	let revision = 0;
	const numericValue = el => el?.dataset.rawValue !== undefined && el.value === el.dataset.displayValue ? Number(el.dataset.rawValue) : Number(el.value);
	const setCalculated = (el, n) => {
		el.value = String(Number(n.toPrecision(8)));
		el.dataset.rawValue = String(n);
		el.dataset.displayValue = el.value;
	};
	const state = () => Object.fromEntries(tool.fields.map((f) => {
		const input = $(`field-${f[0]}`);
		const v = input?.value ?? f[2];
		return [f[0], v === '' ? '' : typeof f[2] === 'number' ? (input ? numericValue(input) : Number(v)) : v];
	}));
	function field(id, label, value, unit = '', options = null, numeric = true, min, max, step) {
		const control = options ? `<select id="field-${id}" name="${id}">${options.map(([v, l]) => `<option value="${escapeHtml(v)}" ${String(v) === String(value) ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select>` : `<input id="field-${id}" name="${id}" type="${numeric ? 'number' : 'text'}" value="${escapeHtml(value)}" ${numeric ? `step="${step || 'any'}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined && max > (min ?? -Infinity) ? `max="${max}"` : ''}` : ''} aria-describedby="error-${id}">`;
		return `<div class="eda-field" data-field="${id}"><label for="field-${id}">${escapeHtml(label)} <small id="badge-${id}"></small></label>${control}<span class="eda-unit">${escapeHtml(unit)}</span>${options ? '' : `<button type="button" class="eda-clear" data-clear="${id}" aria-label="清空${escapeHtml(label)}">清空</button>`}<small class="eda-field-error" id="error-${id}"></small></div>`;
	}
	function renderNetwork() {
		const draw = (node, path = []) => {
			const key = path.join('.');
			const remove = path.length ? `<button type="button" data-network-action="remove" data-path="${key}" aria-label="删除${typeof node === 'string' ? node.toUpperCase() : '子组'}">×</button>` : '';
			if (typeof node === 'string')
				return `<span class="network-leaf">${node.toUpperCase()}${remove}</span>`;
			return `<div class="network-group"><div class="network-actions"><select aria-label="${path.length ? '子组' : '总级'}连接方式" data-network-path="${key}"><option value="series" ${node.kind === 'series' ? 'selected' : ''}>串联</option><option value="parallel" ${node.kind === 'parallel' ? 'selected' : ''}>并联</option></select><button type="button" data-network-action="add" data-path="${key}">+ 元件</button><button type="button" data-network-action="group" data-path="${key}">+ 子组</button>${remove}</div><div class="network-children">${node.children.map((child, i) => draw(child, [...path, i])).join('')}</div></div>`;
		};
		$('networkEditor').innerHTML = `<small>自定义串并联：组内可添加元件或嵌套子组（最多 100 个元件、8 层）。数值在下方填写。</small>${draw(tool.network)}`;
	}
	function editNetwork(action, key, kind) {
		const values = state();
		const path = key === '' ? [] : key.split('.').map(Number);
		const root = structuredClone(tool.network);
		const at = indices => indices.reduce((node, i) => node.children[i], root);
		const count = networkLeaves(root).length;
		if ((action === 'add' && count >= 100) || (action === 'group' && (count > 98 || path.length >= 7))) {
			warning('最多支持 100 个元件、8 层连接组。');
			return;
		}
		const prefix = tool.id === 'legacy-resistor' ? 'r' : 'c';
		let serial = Math.max(...networkLeaves(root).map(id => Number(id.slice(1)))) + 1;
		const leaf = () => `${prefix}${serial++}`;
		if (action === 'remove') {
			const parent = at(path.slice(0, -1));
			if (parent.children.length === 1) {
				warning('每个连接组至少保留一个元件或子组；可在上一级删除整组。');
				return;
			}
			parent.children.splice(path.at(-1), 1);
		}
		else if (action === 'add') {
			at(path).children.push(leaf());
		}
		else if (action === 'group') {
			at(path).children.push({ kind: at(path).kind === 'series' ? 'parallel' : 'series', children: [leaf(), leaf()] });
		}
		else {
			at(path).kind = kind;
		}
		tool = createNetworkTool(byId.get(tool.id), root);
		build({ ...defaults(tool), ...values });
		dirty();
	}
	$('networkEditor').onclick = (e) => {
		const button = e.target.closest('[data-network-action]');
		if (button)
			editNetwork(button.dataset.networkAction, button.dataset.path);
	};
	$('networkEditor').onchange = (e) => {
		e.stopPropagation();
		if (e.target.matches('[data-network-path]'))
			editNetwork('kind', e.target.dataset.networkPath, e.target.value);
	};
	function renderStages() {
		const label = tool.id === 'current-divider' ? '支路' : '级';
		$('stageEditor').innerHTML = `<button type="button" data-stage-action="add">+ ${label}</button>${tool.stages.map((id, i) => `<span>${label} ${i + 1}<button type="button" data-stage-action="remove" data-stage-id="${id}" aria-label="删除${label}${i + 1}">×</button>${tool.id === 'current-divider' || i === 0 ? '' : `<button type="button" data-stage-action="up" data-stage-id="${id}" aria-label="前移第${i + 1}级">↑</button>`}</span>`).join('')}`;
	}
	$('stageEditor').onclick = (e) => {
		const button = e.target.closest('[data-stage-action]');
		if (!button)
			return;
		const values = state();
		const stages = [...tool.stages];
		const action = button.dataset.stageAction;
		const index = stages.indexOf(Number(button.dataset.stageId));
		if (action === 'add') {
			if (stages.length >= 100) {
				warning('最多支持 100 个支路或级。');
				return;
			}
			stages.push(Math.max(...stages) + 1);
		}
		else if (action === 'remove') {
			if (stages.length === 1) {
				warning('至少保留一个支路或级。');
				return;
			}
			stages.splice(index, 1);
		}
		else if (index > 0) {
			[stages[index - 1], stages[index]] = [stages[index], stages[index - 1]];
		}
		tool = createStagedTool(byId.get(tool.id), stages);
		build({ ...defaults(tool), ...values });
		dirty();
	};
	function renderOutputs() {
		$('answerGrid').innerHTML = outputs.slice(0, 1).map(f => field(f.id, f.name, '', f.unit)).join('');
		$('auxiliaryGrid').innerHTML = outputs.slice(1).map(f => `<div class="auxiliary-item">${field(f.id, f.name, '', f.unit)}<label class="constraint-toggle"><input type="checkbox" data-known-output="${f.id}" ${knownOutputs.has(f.id) ? 'checked' : ''}>作为已知量</label></div>`).join('');
		for (const f of outputs.slice(1)) {
			$(`field-${f.id}`).readOnly = !knownOutputs.has(f.id);
			document.querySelector(`[data-clear="${f.id}"]`).hidden = !knownOutputs.has(f.id);
		}
	}
	$('auxiliaryGrid').onchange = (e) => {
		const id = e.target.dataset.knownOutput;
		if (!id)
			return;
		if (e.target.checked)
			knownOutputs.add(id);
		else knownOutputs.delete(id);
		$(`field-${id}`).readOnly = !e.target.checked;
		document.querySelector(`[data-clear="${id}"]`).hidden = !e.target.checked;
		dirty();
	};
	function build(values = defaults(tool)) {
		knownOutputs.clear();
		$('stageEditor').hidden = !tool.stages;
		if (tool.stages)
			renderStages();
		$('networkEditor').hidden = !tool.network;
		if (tool.network)
			renderNetwork();
		$('fieldGrid').innerHTML = activeFields(tool, values, data).map(f => field(f[0], f[1], values[f[0]], f[3], f[0] === 'trace' && data ? f[7].filter(o => data.names.includes(o[0])) : f[7], typeof f[2] === 'number', f[4], f[5], f[6])).join('');
		outputs = outputFields(tool, { ...defaults(tool), ...values }, data);
		if (!outputs.length)
			outputs = outputFields(tool, defaults(tool), null);
		renderOutputs();
		$('resultGrid').innerHTML = '';
		$('calculationStatus').textContent = '待计算';
		$('warningBox').hidden = true;
		$('solutionChoices').innerHTML = '';
		last = null;
	}
	function dirty() {
		revision++;
		warning('');
		document.querySelectorAll('.eda-field-error').forEach(x => x.textContent = '');
		document.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
		$('calculationStatus').textContent = last ? '待重新计算 · 保留上次结果' : '待计算';
		$('solutionChoices').innerHTML = '';
	}
	function warning(text) {
		$('warningBox').hidden = !text;
		$('warningBox').textContent = text;
	}
	function display(result) {
		last = result;
		for (const [id, v] of Object.entries(result.values)) {
			const el = $(`field-${id}`);
			if (el && result.solved.includes(id))
				setCalculated(el, v);
		}
		const previous = new Map(outputs.map(f => [f.id, { name: f.name, value: $(`field-${f.id}`).value, raw: $(`field-${f.id}`).dataset.rawValue, display: $(`field-${f.id}`).dataset.displayValue }]));
		outputs = result.out.map((r, i) => ({ ...r, id: `answer_${i}` })).filter(r => Number.isFinite(r.number));
		renderOutputs();
		for (const f of outputs) {
			const old = previous.get(f.id);
			const el = $(`field-${f.id}`);
			if (old && old.name === f.name && old.value !== '' && !result.solved.includes(f.id) && (f.id === outputs[0].id || knownOutputs.has(f.id))) {
				el.value = old.value;
				if (old.raw !== undefined) {
					el.dataset.rawValue = old.raw;
					el.dataset.displayValue = old.display;
				}
			}
			else {
				setCalculated(el, f.number);
				if (!result.solved.includes(f.id))
					result.solved.push(f.id);
			}
		}
		document.querySelectorAll('[id^="badge-"]').forEach((el) => {
			el.textContent = result.solved.includes(el.id.slice(6)) ? '已计算' : '';
		});
		$('resultGrid').innerHTML = result.out.map((r, i) => ({ ...r, index: i })).filter(r => !outputs.some(o => o.id === `answer_${r.index}`)).map(r => `<div class="eda-result"><span>${escapeHtml(r.name)}</span><strong>${escapeHtml(r.value)}</strong></div>`).join('');
		$('calculationStatus').textContent = '计算完成';
		warning(result.warning);
		$('solutionChoices').innerHTML = '';
	}
	function compute(e) {
		e?.preventDefault();
		const values = state();
		const answers = Object.fromEntries(outputs.filter((f, i) => i === 0 || knownOutputs.has(f.id)).map((f) => {
			const v = $(`field-${f.id}`).value;
			return [f.id, v === '' ? '' : numericValue($(`field-${f.id}`))];
		}));
		document.querySelectorAll('.eda-field-error').forEach(x => x.textContent = '');
		document.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
		const result = solve(tool, values, answers, data);
		warning(result.status === 'conflict' && Object.keys(result.errors || {}).length ? '已知约束不一致，请查看红色字段的具体数值。' : result.warning);
		for (const [id, error] of Object.entries(result.errors || {})) {
			const el = $(`error-${id}`);
			if (el)
				el.textContent = error;
			$(`field-${id}`)?.setAttribute('aria-invalid', 'true');
		}
		const firstError = Object.keys(result.errors || {})[0];
		if (firstError) {
			if (knownOutputs.has(firstError))
				$('auxiliaryResults').open = true;
			$(`field-${firstError}`)?.focus();
		}
		if (result.status === 'ok') {
			display(result);
		}
		else if (result.status === 'multiple') {
			const current = revision;
			$('solutionChoices').innerHTML = '';
			result.candidates.forEach((candidate, i) => {
				const b = document.createElement('button');
				b.type = 'button';
				b.className = 'eda-ghost';
				b.textContent = `解 ${i + 1}：${candidate.solved.filter(id => !id.startsWith('answer_')).map(id => `${tool.fields.find(f => f[0] === id)[1]}=${formatNumber(candidate.values[id])}`).join('，')}`;
				b.onclick = () => {
					if (current === revision)
						display(candidate);
				};
				$('solutionChoices').append(b);
			});
		}
		else {
			$('calculationStatus').textContent = last ? '未更新 · 保留上次结果' : '未完成计算';
		}
	}
	$('toolForm').onsubmit = compute;
	$('toolForm').addEventListener('input', (e) => {
		if (e.target.matches('input:not([type="file"]),select')) {
			delete e.target.dataset.rawValue;
			delete e.target.dataset.displayValue;
			dirty();
			const badge = $(`badge-${e.target.name}`);
			if (badge)
				badge.textContent = '';
		}
	});
	$('toolForm').addEventListener('change', (e) => {
		if (e.target.tagName === 'SELECT') {
			const values = state();
			build(values);
			dirty();
		}
	});
	$('toolForm').addEventListener('click', (e) => {
		const b = e.target.closest('[data-clear]');
		if (b) {
			$(`field-${b.dataset.clear}`).value = '';
			$(`badge-${b.dataset.clear}`).textContent = '';
			dirty();
			$(`field-${b.dataset.clear}`).focus();
		}
	});
	$('clearAnswers').onclick = () => {
		outputs.forEach((f) => {
			$(`field-${f.id}`).value = '';
			$(`badge-${f.id}`).textContent = '';
		});
		dirty();
	};
	$('resetButton').onclick = () => {
		data = null;
		$('touchstoneInput').value = '';
		$('fileStatus').textContent = '';
		if (isNetworkTool(tool))
			tool = createNetworkTool(byId.get(tool.id));
		if (isStagedTool(tool))
			tool = createStagedTool(byId.get(tool.id));
		build();
		revision++;
	};
	$('copyButton').onclick = async () => {
		if (!last) {
			warning('请先计算');
			return;
		}
		try {
			await navigator.clipboard.writeText(`${tool.title}\n${$('calculationStatus').textContent}\n${tool.fields.map(f => `${f[1]}: ${last.values[f[0]]} ${f[3]}`).join('\n')}\n${last.out.map(r => `${r.name}: ${r.value}`).join('\n')}`);
			warning('已复制计算记录');
		}
		catch {
			warning('剪贴板不可用，请选中结果复制');
		}
	};
	$('touchstoneInput').onchange = async (e) => {
		const file = e.target.files[0];
		if (!file)
			return;
		const token = ++revision;
		try {
			if (file.size > 10 * 1024 * 1024)
				throw new Error('文件超过 10 MB，请精简频点后导入');
			const parsed = parseTouchstone(await file.text(), file.name);
			if (token !== revision)
				return;
			data = parsed;
			const values = state();
			if (!data.names.includes(values.trace))
				values.trace = 'S11';
			build(values);
			$('fileStatus').textContent = `已载入 ${file.name}：${data.data.length} 点，${data.format.toUpperCase()}，${data.z0} Ω。点击计算更新分析结果。`;
		}
		catch (error) {
			warning(error.message);
			$('fileStatus').textContent = '导入失败，保留上一份有效数据';
		}
	};
	$('hostButton').onclick = async () => {
		try {
			if (tool.id === 'legacy-current') {
				if (!last || $('calculationStatus').textContent !== '计算完成')
					throw new Error('请先完成计算，再应用到选中走线');
				warning(await applySelectedTrack(last.out));
			}
			else {
				const values = state();
				Object.assign(values, await readSelectedResistor(values.bands));
				build(values);
				warning('已读入选中器件的标称阻值；公差和温度系数请按器件规格确认，再点击计算');
			}
		}
		catch (error) {
			warning(error.message);
		}
	};
	async function initialize() {
		let id = decodeURIComponent(location.hash.slice(1));
		if (!id && typeof eda !== 'undefined') {
			try {
				id = await eda.sys_Storage.getExtensionUserConfig('eda-toolbox-active-tool');
			}
			catch {
			}
		}
		if (tool?.id === id)
			return;
		tool = byId.get(id) || byId.get('microstrip');
		if (isNetworkTool(tool))
			tool = createNetworkTool(tool);
		if (isStagedTool(tool))
			tool = createStagedTool(tool);
		$('hostButton').hidden = !['legacy-current', 'legacy-resistor-color'].includes(tool.id);
		$('hostButton').textContent = tool.id === 'legacy-current' ? '应用到选中走线' : '读取选中电阻';
		data = null;
		document.title = tool.title;
		$('formulaText').textContent = tool.formula;
		$('calculationFormula').open = false;
		$('touchstoneBox').hidden = tool.id !== 'sparam-plot';
		build();
		$('toolForm').dataset.toolId = tool.id;
		remember(tool.id);
	}
	window.addEventListener('hashchange', initialize);
	window.addEventListener('focus', initialize);
	initialize();
}
