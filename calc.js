/*
 * PoE Calculator - application logic
 * Depends on data.js (SWITCHES, POE_CLASSES, SERIES_INFO, PSU_INFO)
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const fmtW = (w) => `${Math.round(w * 10) / 10 === Math.round(w) ? Math.round(w).toLocaleString('en-US') : (Math.round(w * 10) / 10).toLocaleString('en-US')} W`;
    const classPower = (cls) => POE_CLASSES[cls].pse;

    const EXAMPLE = [
        { name: 'PTZ camera', cls: 4, qty: 4, watt: null },
        { name: 'Ceiling microphone', cls: 3, qty: 6, watt: null },
        { name: 'Video encoder', cls: 3, qty: 4, watt: null },
        { name: 'Display or touch panel', cls: 6, qty: 2, watt: null },
        { name: 'WiFi access point', cls: 6, qty: 2, watt: null }
    ];

    const state = {
        switchId: '',
        customBudget: 0,
        voltage: '220',
        dims: {},
        margin: 10,
        devices: [{ name: '', cls: 4, qty: 1, watt: null }]
    };

    /* ================= Switch + config helpers ================= */

    const getSwitch = (id = state.switchId) => SWITCHES.find((s) => s.id === id);

    const configsFor = (sw, voltage) => sw.configs.filter((c) => c.voltage === 'any' || c.voltage === voltage);

    function currentConfig() {
        const sw = getSwitch();
        if (!sw) return null;
        const list = configsFor(sw, state.voltage);
        return list.find((c) => sw.dims.every((d) => c.dims[d.key] === state.dims[d.key])) || null;
    }

    // Pick a valid config after one dimension changed: keep as many choices as possible.
    function resolveDims(sw, changedKey) {
        const list = configsFor(sw, state.voltage);
        const exact = list.find((c) => sw.dims.every((d) => c.dims[d.key] === state.dims[d.key]));
        if (exact) return;
        const score = (c) => sw.dims.reduce((s, d, i) => s + (c.dims[d.key] === state.dims[d.key] ? (d.key === changedKey ? 100 : 10 - i) : 0), 0);
        const best = [...list].sort((a, b) => score(b) - score(a))[0];
        if (best) state.dims = { ...best.dims };
    }

    function defaultDims(sw) {
        const list = configsFor(sw, state.voltage);
        // Default: the config that ships in the box (no extra modules, internal PSUs connected, all fixed PSUs)
        const base = list.filter((c) => c.modules === 0).sort((a, b) => b.budget - a.budget)[0] || list[0];
        return { ...base.dims };
    }

    /* ================= Load calculation ================= */

    function deviceWatt(d) {
        return d.watt !== null && d.watt !== '' && !isNaN(d.watt) ? Number(d.watt) : classPower(d.cls);
    }

    function loadSummary() {
        let total = 0, ports = 0, maxPort = 0, maxClass = -1;
        for (const d of state.devices) {
            const q = Math.max(0, Math.floor(Number(d.qty) || 0));
            if (!q) continue;
            const w = deviceWatt(d);
            total += q * w;
            ports += q;
            maxPort = Math.max(maxPort, w);
            maxClass = Math.max(maxClass, d.cls);
        }
        const margin = state.margin / 100;
        return { total, ports, maxPort, maxClass, withMargin: total * (1 + margin) };
    }

    /* ================= Rendering: switch select ================= */

    function buildSwitchSelect() {
        const sel = $('switchSelect');
        sel.innerHTML = '<option value="" disabled selected>Select a NETGEAR switch</option>';
        for (const series of Object.keys(SERIES_INFO)) {
            const og = document.createElement('optgroup');
            og.label = SERIES_INFO[series];
            for (const s of SWITCHES.filter((x) => x.series === series)) {
                const max = Math.max(...s.configs.map((c) => c.budget));
                const fewest = Math.min(...s.configs.map((c) => c.modules));
                const min = Math.min(...s.configs.filter((c) => c.modules === fewest).map((c) => c.budget));
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.id} (${s.sku}) - ${min === max ? fmtW(max) : `${fmtW(min)} up to ${fmtW(max)}`}`;
                og.appendChild(opt);
            }
            sel.appendChild(og);
        }
        const custom = document.createElement('option');
        custom.value = 'custom';
        custom.textContent = 'Other switch: enter a PoE budget manually';
        sel.appendChild(custom);
    }

    function renderSwitchSpecs() {
        const sw = getSwitch();
        const el = $('switchSpecs');
        if (!sw) { el.innerHTML = ''; return; }
        const type = sw.maxPort >= 90 ? 'PoE++ up to 90 W (802.3bt)' : 'PoE+ up to 30 W (802.3at)';
        el.innerHTML = `
            <div><dt>POE PORTS</dt><dd>${sw.poePorts}</dd></div>
            <div><dt>PER PORT</dt><dd>${type}</dd></div>
            <div><dt>PORTS</dt><dd>${sw.desc}</dd></div>`;
    }

    function renderPowerDims() {
        const sw = getSwitch();
        const wrap = $('powerDims');
        wrap.innerHTML = '';
        const note = $('powerNote');
        note.textContent = '';
        if (!sw) {
            if (state.switchId === 'custom') note.textContent = 'With a custom budget, power supply options are not needed.';
            else note.textContent = 'Choose a switch first.';
            return;
        }
        if (!sw.dims.length) {
            note.textContent = 'This switch has a fixed internal power supply. Nothing to configure.';
            return;
        }
        const list = configsFor(sw, state.voltage);
        sw.dims.forEach((d) => {
            const values = [...new Set(list.map((c) => c.dims[d.key]))];
            const field = document.createElement('label');
            field.className = 'field';
            field.innerHTML = `<span class="label">${d.label.toUpperCase()}</span>`;
            const sel = document.createElement('select');
            sel.dataset.dim = d.key;
            for (const v of values) {
                // Mark values that are not valid together with the other current choices
                const others = sw.dims.filter((o) => o.key !== d.key);
                const valid = list.some((c) => c.dims[d.key] === v && others.every((o) => c.dims[o.key] === state.dims[o.key]));
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = valid ? v : `${v} (changes other options)`;
                if (v === state.dims[d.key]) opt.selected = true;
                sel.appendChild(opt);
            }
            sel.addEventListener('change', () => {
                state.dims[d.key] = sel.value;
                resolveDims(sw, d.key);
                update();
            });
            field.appendChild(sel);
            wrap.appendChild(field);
        });

        const usedPsus = Object.keys(PSU_INFO).filter((p) => Object.values(state.dims).some((v) => new RegExp(`\\b${p}\\b`).test(String(v))));
        const notes = [];
        if (usedPsus.length) notes.push(`Order code: ${usedPsus.map((p) => PSU_INFO[p]).join(', ')}.`);
        if (sw.id === 'M4300-96X') notes.push('Only the first 6 slots deliver PoE (APM408P cards). The chassis needs at least one APS600W or APS1200W.');
        if (sw.id.startsWith('M4300-52G')) notes.push('An external RPS4000 can add redundancy when both internal PSUs run in EPS mode.');
        if (sw.series === 'M4350' && sw.dims.length > 1) notes.push('Only combinations published in the datasheet are offered. Two modular PSUs must be the same model.');
        note.textContent = notes.join(' ');
    }

    /* ================= Rendering: devices ================= */

    function classOptions(selected) {
        return POE_CLASSES.map((c) => `<option value="${c.cls}"${c.cls === selected ? ' selected' : ''}>Class ${c.cls} - ${c.type} ${c.pse} W</option>`).join('');
    }

    function renderDevices() {
        const wrap = $('deviceRows');
        wrap.innerHTML = '';
        if (!state.devices.length) {
            wrap.innerHTML = '<div class="empty-devices">No devices yet. Use Add Device, or Load Example to see how it works.</div>';
            return;
        }
        state.devices.forEach((d, i) => {
            const row = document.createElement('div');
            row.className = 'device-row';
            row.setAttribute('role', 'row');
            const edited = d.watt !== null && d.watt !== '';
            row.innerHTML = `
                <input class="c-name" type="text" aria-label="Device name" placeholder="e.g. PTZ camera" value="${escapeHtml(d.name)}">
                <select class="c-cls" aria-label="PoE class">${classOptions(d.cls)}</select>
                <input class="c-qty" type="number" min="0" step="1" inputmode="numeric" aria-label="Quantity" value="${d.qty}">
                <input class="c-watt${edited ? ' edited' : ''}" type="number" min="0" max="90" step="0.1" inputmode="decimal" aria-label="Watts per device" placeholder="${classPower(d.cls)}" value="${edited ? d.watt : ''}">
                <span class="total" aria-label="Row total">${fmtW((Math.max(0, Math.floor(Number(d.qty) || 0))) * deviceWatt(d))}</span>
                <button type="button" class="btn-icon c-del" aria-label="Remove device">&times;</button>`;
            row.querySelector('.c-name').addEventListener('input', (e) => { d.name = e.target.value; saveHash(); });
            row.querySelector('.c-cls').addEventListener('change', (e) => { d.cls = Number(e.target.value); renderDevices(); update(false); });
            row.querySelector('.c-qty').addEventListener('input', (e) => { d.qty = e.target.value; refreshRowTotal(row, d); update(false); });
            row.querySelector('.c-watt').addEventListener('input', (e) => {
                d.watt = e.target.value === '' ? null : e.target.value;
                e.target.classList.toggle('edited', d.watt !== null);
                refreshRowTotal(row, d);
                update(false);
            });
            row.querySelector('.c-del').addEventListener('click', () => { state.devices.splice(i, 1); renderDevices(); update(false); });
            wrap.appendChild(row);
        });
    }

    function refreshRowTotal(row, d) {
        row.querySelector('.total').textContent = fmtW(Math.max(0, Math.floor(Number(d.qty) || 0)) * deviceWatt(d));
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ================= Rendering: result ================= */

    function renderResult() {
        const sw = getSwitch();
        const cfg = currentConfig();
        const load = loadSummary();
        const card = $('resultCard');
        const checks = [];

        let budget = null, redundant = null;
        if (sw && cfg) { budget = cfg.budget; redundant = cfg.redundant; }
        else if (state.switchId === 'custom') { budget = Number(state.customBudget) || 0; }

        $('statLoad').textContent = fmtW(load.total);

        if (budget === null) {
            card.classList.remove('over');
            $('resultTitle').textContent = 'Choose a switch to begin';
            ['statBudget', 'statLeft', 'statRedundant'].forEach((k) => ($(k).textContent = '-'));
            $('gaugeFill').style.width = '0';
            $('gaugeMargin').style.width = '0';
            $('gaugeRedundant').hidden = true;
            $('gaugeCaption').textContent = load.total ? 'Not sure which switch fits? Try the Find a Switch tab.' : ' ';
            $('checks').innerHTML = '';
            $('miniBar').hidden = true;
            return;
        }

        const left = budget - load.total;
        const leftAfterMargin = budget - load.withMargin;
        const over = left < 0;
        const tight = !over && leftAfterMargin < 0;

        $('statBudget').textContent = fmtW(budget);
        $('statLeft').textContent = fmtW(left);
        $('statRedundant').textContent = sw ? (redundant ? fmtW(redundant) : 'No backup') : 'n/a';

        // Gauge
        const pct = budget > 0 ? Math.min(100, (load.total / budget) * 100) : (load.total ? 100 : 0);
        $('gaugeFill').style.width = `${pct}%`;
        $('gaugeMargin').style.width = `${Math.min(100, state.margin / (100 + state.margin) * 100)}%`;
        const gr = $('gaugeRedundant');
        if (sw && redundant && redundant < budget) { gr.hidden = false; gr.style.left = `${(redundant / budget) * 100}%`; }
        else gr.hidden = true;
        $('gauge').setAttribute('aria-label', `${Math.round(pct)} percent of the PoE budget used`);
        $('gaugeCaption').textContent = budget > 0
            ? `${Math.round((load.total / budget) * 100)} % of budget used${state.margin ? `. Hatched area = ${state.margin} % headroom` : ''}${!gr.hidden ? '. White line = budget after a PSU failure' : ''}`
            : 'This configuration has no PoE budget.';

        const blockers = [];
        if (sw && load.ports > sw.poePorts) blockers.push('not enough PoE ports');
        if (sw && (load.maxPort > sw.maxPort || (load.maxClass >= 5 && sw.maxPort < 90))) blockers.push(sw.maxPort < 90 ? 'PoE++ needed' : 'port power too high');

        card.classList.toggle('over', over || blockers.length > 0);
        if (over) $('resultTitle').textContent = `Over budget by ${fmtW(-left)}`;
        else if (blockers.length) $('resultTitle').textContent = `Budget fits, but ${blockers.join(' and ')}`;
        else if (tight) $('resultTitle').textContent = 'Fits, but without your headroom';
        else if (load.total === 0) $('resultTitle').textContent = 'Add devices to check the fit';
        else $('resultTitle').textContent = 'Fits within the PoE budget';

        // Checks
        if (over) checks.push(['warn', `Devices need ${fmtW(load.total)} but the budget is ${fmtW(budget)}. Add a power supply, choose a bigger switch, or use measured device wattage.`]);
        else if (tight) checks.push(['warn', `Only ${fmtW(left)} left, below your ${state.margin} % headroom (${fmtW(load.withMargin - load.total)}).`]);
        else if (load.total > 0) checks.push(['ok', `${fmtW(leftAfterMargin)} spare after ${state.margin ? `${state.margin} % headroom` : 'all devices'}.`]);

        if (sw) {
            if (load.ports > sw.poePorts) checks.push(['warn', `${load.ports} devices but only ${sw.poePorts} PoE ports on this switch.`]);
            else if (load.ports > 0) checks.push(['ok', `${load.ports} of ${sw.poePorts} PoE ports used.`]);

            if (load.maxClass >= 5 && sw.maxPort < 90) checks.push(['warn', `Class ${load.maxClass} devices need PoE++ (802.3bt). This switch supports PoE+ only, up to 30 W per port.`]);
            else if (load.maxPort > sw.maxPort) checks.push(['warn', `A device needs ${fmtW(load.maxPort)} on one port. This switch delivers up to ${sw.maxPort} W per port.`]);
            else if (load.ports > 0) checks.push(['ok', `Every device is within the ${sw.maxPort} W per-port limit.`]);

            if (load.total > 0) {
                if (!redundant) checks.push(['info', 'No power redundancy in this setup. A PSU failure powers down all PoE devices.']);
                else if (load.total > redundant) checks.push(['warn', `If one PSU fails, the budget drops to ${fmtW(redundant)}: ${fmtW(load.total - redundant)} short. Set port priorities so critical devices stay on.`]);
                else checks.push(['ok', `Fully redundant: all devices stay powered if one PSU fails (${fmtW(redundant)}).`]);
            }
        }
        if (state.switchId === 'custom') checks.push(['info', 'Custom budget: port count, per-port limits, and redundancy are not checked.']);

        $('checks').innerHTML = checks.map(([k, t]) => `<li class="${k}">${t}</li>`).join('');

        const bar = $('miniBar');
        bar.hidden = false;
        bar.classList.toggle('over', over || blockers.length > 0);
        bar.innerHTML = `<span>${escapeHtml($('resultTitle').textContent)}</span><span>${fmtW(left)} left</span>`;
    }

    /* ================= Finder (issues #1, #2, #3) ================= */

    function syncFinderFromDevices() {
        if (!$('findSync').checked) return;
        const load = loadSummary();
        $('findBudget').value = Math.ceil(load.withMargin) || '';
        $('findPorts').value = load.ports || '';
        $('findPerPort').value = load.maxPort ? Math.round(load.maxPort * 10) / 10 : '';
    }

    function renderFinder() {
        $('findVoltageLabel').textContent = state.voltage === '110' ? '100 - 127 V AC' : '200 - 240 V AC';
        const need = Number($('findBudget').value) || 0;
        const ports = Number($('findPorts').value) || 0;
        const perPort = Number($('findPerPort').value) || 0;
        const series = $('findSeries').value;
        const needRed = $('findRedundant').checked;
        const out = $('finderResults');

        if (!need && !ports) {
            out.innerHTML = '<div class="card"><p class="finder-summary">Enter a required PoE budget or number of ports, or add devices on the Check a Switch tab.</p></div>';
            return;
        }

        const matches = [];
        for (const sw of SWITCHES) {
            if (series !== 'all' && sw.series !== series) continue;
            if (ports > sw.poePorts) continue;
            if (perPort > sw.maxPort) continue;
            const ok = configsFor(sw, state.voltage).filter((c) => !c.degraded && c.budget >= need && (!needRed || c.redundant >= need));
            if (!ok.length) continue;
            // Prefer: fewest extra PSUs, then smallest budget that still fits (least oversized)
            ok.sort((a, b) => a.modules - b.modules || a.budget - b.budget || b.redundant - a.redundant);
            matches.push({ sw, cfg: ok[0] });
        }
        // Rank switches: least spare ports, then fewest modules, then closest budget
        matches.sort((a, b) =>
            (a.sw.poePorts - ports) - (b.sw.poePorts - ports) ||
            a.cfg.modules - b.cfg.modules ||
            (a.cfg.budget - need) - (b.cfg.budget - need));

        const criteria = [
            need ? `${fmtW(need)} budget` : null,
            ports ? `${ports} PoE ports` : null,
            perPort ? `up to ${fmtW(perPort)} per port` : null,
            needRed ? 'redundant' : null
        ].filter(Boolean).join(', ');

        if (!matches.length) {
            out.innerHTML = `<div class="card no-match"><h3>No single switch fits ${criteria}</h3>
                <p class="finder-summary">Try splitting the devices across two switches, turning off the redundancy requirement, or using the real device wattage instead of the class maximum.</p></div>`;
            return;
        }

        out.innerHTML = `<p class="finder-summary">${matches.length} switch${matches.length > 1 ? 'es' : ''} can deliver ${criteria}. Best fit first.</p><div class="match-list"></div>`;
        const list = out.querySelector('.match-list');
        matches.forEach(({ sw, cfg }, i) => {
            const card = document.createElement('div');
            card.className = 'card match';
            const setup = Object.values(cfg.dims).join(', ') || 'Fixed internal PSU';
            const spare = cfg.budget - need;
            card.innerHTML = `
                <div>
                    ${i === 0 ? '<span class="badge-best">BEST FIT</span>' : ''}
                    <h3>${sw.id} <span class="sku">${sw.sku}</span></h3>
                    <p>${sw.desc}</p>
                    <p>Power: ${setup}${cfg.voltage !== 'any' ? ` (${cfg.voltage === '110' ? '100 - 127' : '200 - 240'} V AC)` : ''}</p>
                    <div class="tags">
                        <span class="tag">${sw.poePorts} PoE ports</span>
                        <span class="tag ${sw.maxPort >= 90 ? 'hi' : ''}">${sw.maxPort >= 90 ? 'PoE++ 90 W' : 'PoE+ 30 W'}</span>
                        <span class="tag">${cfg.modules ? `${cfg.modules} extra PSU${cfg.modules > 1 ? 's' : ''}` : 'No extra PSU'}</span>
                        <span class="tag ${cfg.redundant >= need ? 'hi' : ''}">${cfg.redundant ? `${fmtW(cfg.redundant)} after PSU failure` : 'No redundancy'}</span>
                    </div>
                </div>
                <div class="budget"><span>POE BUDGET</span><strong>${fmtW(cfg.budget)}</strong><span>${fmtW(spare)} SPARE</span></div>
                <button type="button" class="btn btn-primary">Use This Switch</button>`;
            card.querySelector('button').addEventListener('click', () => {
                state.switchId = sw.id;
                state.dims = { ...cfg.dims };
                $('switchSelect').value = sw.id;
                selectTab('calc');
                update();
                $('stepSwitch').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            list.appendChild(card);
        });
    }

    /* ================= Tabs ================= */

    function selectTab(which) {
        const calc = which === 'calc';
        $('tab-calc').setAttribute('aria-selected', calc);
        $('tab-find').setAttribute('aria-selected', !calc);
        $('tab-calc').tabIndex = calc ? 0 : -1;
        $('tab-find').tabIndex = calc ? -1 : 0;
        $('panel-calc').hidden = !calc;
        $('panel-find').hidden = calc;
        if (!calc) { syncFinderFromDevices(); renderFinder(); }
        buildPrintReport();
    }

    /* ================= Share link (state in URL hash) ================= */

    function saveHash() {
        const s = {
            s: state.switchId, c: state.customBudget, v: state.voltage, d: state.dims, m: state.margin,
            x: state.devices.map((d) => [d.name, d.cls, Number(d.qty) || 0, d.watt === null ? null : Number(d.watt)])
        };
        try { history.replaceState(null, '', `#${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(s)))))}`); } catch (e) { /* ignore */ }
    }

    function loadHash() {
        if (location.hash.length < 2) return false;
        try {
            const s = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(1))))));
            if (s.s && (s.s === 'custom' || getSwitch(s.s))) state.switchId = s.s;
            state.customBudget = Number(s.c) || 0;
            state.voltage = s.v === '110' ? '110' : '220';
            state.dims = s.d && typeof s.d === 'object' ? s.d : {};
            state.margin = [0, 10, 20, 25].includes(Number(s.m)) ? Number(s.m) : 10;
            if (Array.isArray(s.x)) {
                state.devices = s.x.map(([name, cls, qty, watt]) => ({
                    name: String(name || ''), cls: Math.min(8, Math.max(0, Number(cls) || 0)), qty: Number(qty) || 0,
                    watt: watt === null || watt === undefined ? null : Number(watt)
                }));
            }
            return true;
        } catch (e) { return false; }
    }

    function toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => (t.hidden = true), 2400);
    }

    /* ================= Print / PDF report ================= */

    function buildPrintReport() {
        saveHash();
        const sw = getSwitch();
        const cfg = currentConfig();
        const load = loadSummary();
        const el = $('printReport');
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const voltage = state.voltage === '110' ? '100 - 127 V AC' : '200 - 240 V AC';
        const budget = sw && cfg ? cfg.budget : state.switchId === 'custom' ? Number(state.customBudget) || 0 : null;
        const over = $('resultCard').classList.contains('over');
        const pct = budget ? Math.round((load.total / budget) * 100) : 0;

        // Switch and power rows
        const rows = [];
        if (sw) {
            rows.push(['Switch', `${sw.id} (${sw.sku})`]);
            rows.push(['Ports', sw.desc]);
            rows.push(['PoE ports', `${sw.poePorts} x ${sw.maxPort >= 90 ? 'PoE++ up to 90 W (802.3bt)' : 'PoE+ up to 30 W (802.3at)'}`]);
            rows.push(['Power setup', cfg ? (Object.values(cfg.dims).join(', ') || 'Fixed internal power supply') : '-']);
            rows.push(['AC input', voltage]);
            const codes = cfg ? Object.keys(PSU_INFO).filter((p) => Object.values(cfg.dims).some((v) => new RegExp(`\\b${p}\\b`).test(String(v)))) : [];
            if (codes.length) rows.push(['PSU order code', codes.map((p) => PSU_INFO[p]).join(', ')]);
        } else if (state.switchId === 'custom') {
            rows.push(['Switch', 'Other switch (custom PoE budget)']);
        } else {
            rows.push(['Switch', 'No switch selected']);
        }
        rows.push(['Safety headroom', state.margin ? `${state.margin} %` : 'None']);

        const stats = [
            ['POE BUDGET', $('statBudget').textContent],
            ['DEVICES NEED', $('statLoad').textContent],
            ['LEFT OVER', $('statLeft').textContent],
            ['IF ONE PSU FAILS', $('statRedundant').textContent]
        ];

        const checks = [...document.querySelectorAll('#checks li')].map((li) => {
            const mark = li.classList.contains('warn') ? '!' : li.classList.contains('info') ? 'i' : '&#10003;';
            return `<li class="${li.className}"><span class="mark">${mark}</span><span>${escapeHtml(li.textContent)}</span></li>`;
        }).join('');

        const devices = state.devices.filter((d) => Number(d.qty) > 0);
        const deviceRows = devices.map((d) => {
            const q = Math.floor(Number(d.qty) || 0);
            const w = deviceWatt(d);
            const measured = d.watt !== null && d.watt !== '';
            return `<tr><td>${escapeHtml(d.name) || 'Unnamed device'}</td><td>Class ${d.cls} (${POE_CLASSES[d.cls].type})</td>
                <td class="num">${q}</td><td class="num">${fmtW(w)}${measured ? ' *' : ''}</td><td class="num">${fmtW(q * w)}</td></tr>`;
        }).join('');
        const anyMeasured = devices.some((d) => d.watt !== null && d.watt !== '');

        // Finder results, only when printing from the Find a Switch tab
        let finder = '';
        if (!$('panel-find').hidden) {
            const matches = [...document.querySelectorAll('#finderResults .match')].slice(0, 10);
            const summary = document.querySelector('#finderResults .finder-summary, #finderResults h3');
            finder = `
                <section class="pr-section">
                    <h2>RECOMMENDED SWITCHES</h2>
                    <p class="pr-note">${summary ? escapeHtml(summary.textContent) : ''}</p>
                    ${matches.length ? `<table class="pr-table"><thead><tr><th>Switch</th><th>Power setup</th><th class="num">Budget</th><th class="num">Spare</th></tr></thead><tbody>
                    ${matches.map((m) => {
                        const spans = m.querySelectorAll('.budget span');
                        return `<tr><td>${escapeHtml(m.querySelector('h3').textContent)}</td>
                            <td>${escapeHtml(m.querySelectorAll('p')[1].textContent.replace(/^Power: /, ''))}</td>
                            <td class="num">${escapeHtml(m.querySelector('.budget strong').textContent)}</td>
                            <td class="num">${escapeHtml((spans[1]?.textContent || '').replace(' SPARE', ''))}</td></tr>`;
                    }).join('')}</tbody></table>` : ''}
                </section>`;
        }

        el.innerHTML = `
            <header class="pr-header">
                <img src="assets/netgear-av-logo-light-bg.svg" alt="NETGEAR AV">
                <div class="pr-meta"><span>POE BUDGET REPORT</span><span>${date}</span></div>
            </header>

            <div class="pr-status${over ? ' over' : ''}">
                <p class="pr-eyebrow">${sw ? escapeHtml(sw.id) : state.switchId === 'custom' ? 'CUSTOM BUDGET' : 'NO SWITCH SELECTED'}</p>
                <h1>${escapeHtml($('resultTitle').textContent)}</h1>
                ${budget !== null ? `
                <div class="pr-gauge"><div class="pr-gauge-fill" style="width:${Math.min(100, pct)}%"></div></div>
                <p class="pr-note">${pct} % of the PoE budget used${state.margin ? `, ${state.margin} % headroom requested` : ''}.</p>` : ''}
            </div>

            <dl class="pr-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>

            ${checks ? `<section class="pr-section"><h2>CHECKS</h2><ul class="pr-checks">${checks}</ul></section>` : ''}

            <section class="pr-section">
                <h2>SWITCH AND POWER</h2>
                <table class="pr-table pr-kv"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</tbody></table>
            </section>

            <section class="pr-section">
                <h2>POWERED DEVICES</h2>
                ${devices.length ? `<table class="pr-table">
                    <thead><tr><th>Device</th><th>PoE class</th><th class="num">Qty</th><th class="num">W each</th><th class="num">Total</th></tr></thead>
                    <tbody>${deviceRows}</tbody>
                    <tfoot><tr><td colspan="2">Total</td><td class="num">${load.ports}</td><td></td><td class="num">${fmtW(load.total)}</td></tr></tfoot>
                </table>
                <p class="pr-note">W each is the maximum the switch reserves for the PoE class${anyMeasured ? ', or the measured value where marked *' : ''}.</p>` : '<p class="pr-note">No devices added.</p>'}
            </section>

            ${finder}

            <footer class="pr-footer">
                <p>Budgets are based on the published NETGEAR M4250, M4300 and M4350 datasheets and are provided as guidance only. Confirm your design with the current datasheet before ordering.</p>
                <p>Open this setup online: <span class="pr-url">${escapeHtml(location.href.split('#')[0])}</span></p>
            </footer>`;
    }

    /* ================= Main update loop ================= */

    function update(rebuildPower = true) {
        const sw = getSwitch();
        $('customBudgetField').hidden = state.switchId !== 'custom';
        if (sw) {
            const valid = currentConfig();
            if (!valid) {
                if (!Object.keys(state.dims).length) state.dims = defaultDims(sw);
                else resolveDims(sw);
            }
        }
        renderSwitchSpecs();
        if (rebuildPower) renderPowerDims();
        renderResult();
        if (!$('panel-find').hidden) { syncFinderFromDevices(); renderFinder(); }
        saveHash();
        buildPrintReport();
    }

    /* ================= Wire up ================= */

    function init() {
        buildSwitchSelect();
        $('classTable').innerHTML = POE_CLASSES.map((c) =>
            `<tr><td>${c.cls}</td><td>${c.std}</td><td>${c.pse} W</td><td>${c.pd} W</td><td>${c.pseV}</td><td>${c.pdV}</td></tr>`).join('');

        loadHash();
        $('switchSelect').value = state.switchId || '';
        $('customBudget').value = state.customBudget || '';
        $('margin').value = String(state.margin);
        document.querySelectorAll('input[name="voltage"]').forEach((r) => (r.checked = r.value === state.voltage));

        $('switchSelect').addEventListener('change', (e) => {
            state.switchId = e.target.value;
            const sw = getSwitch();
            state.dims = sw ? defaultDims(sw) : {};
            update();
        });
        $('customBudget').addEventListener('input', (e) => { state.customBudget = e.target.value; update(false); });
        document.querySelectorAll('input[name="voltage"]').forEach((r) => r.addEventListener('change', () => {
            state.voltage = r.value;
            const sw = getSwitch();
            if (sw) resolveDims(sw);
            update();
        }));
        $('margin').addEventListener('change', (e) => { state.margin = Number(e.target.value); update(false); });

        $('addDevice').addEventListener('click', () => {
            state.devices.push({ name: '', cls: 4, qty: 1, watt: null });
            renderDevices();
            update(false);
            const rows = document.querySelectorAll('#deviceRows .c-name');
            rows[rows.length - 1]?.focus();
        });
        $('loadExample').addEventListener('click', () => {
            state.devices = EXAMPLE.map((d) => ({ ...d }));
            if (!state.switchId) {
                state.switchId = 'M4250-26G4F-PoE++';
                $('switchSelect').value = state.switchId;
                state.dims = defaultDims(getSwitch());
            }
            renderDevices();
            update();
        });
        $('clearDevices').addEventListener('click', () => { state.devices = []; renderDevices(); update(false); });

        $('tab-calc').addEventListener('click', () => selectTab('calc'));
        $('tab-find').addEventListener('click', () => selectTab('find'));
        document.querySelector('.tabs').addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const toFind = $('panel-find').hidden;
                selectTab(toFind ? 'find' : 'calc');
                $(toFind ? 'tab-find' : 'tab-calc').focus();
            }
        });

        ['findBudget', 'findPorts', 'findPerPort'].forEach((id) => $(id).addEventListener('input', () => { $('findSync').checked = false; renderFinder(); buildPrintReport(); }));
        ['findSeries', 'findRedundant'].forEach((id) => $(id).addEventListener('change', () => { renderFinder(); buildPrintReport(); }));
        $('findSync').addEventListener('change', () => { syncFinderFromDevices(); renderFinder(); buildPrintReport(); });

        $('shareLink').addEventListener('click', async () => {
            saveHash();
            try { await navigator.clipboard.writeText(location.href); toast('Link copied. Anyone with it sees this exact setup.'); }
            catch (e) { toast('Copy the address bar to share this setup.'); }
        });
        $('printPage').addEventListener('click', () => { buildPrintReport(); window.print(); });
        window.addEventListener('beforeprint', buildPrintReport);
        $('currentYear').textContent = new Date().getFullYear();

        renderDevices();
        update();
    }

    // Exposed for the guided tour
    window.PoECalc = { selectTab, loadExample: () => $('loadExample').click(), hasSwitch: () => !!state.switchId };

    document.addEventListener('DOMContentLoaded', init);
})();
