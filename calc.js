/*
 * PoE Calculator - application logic
 * Depends on data.js (SWITCHES, POE_CLASSES, SERIES_INFO, PSU_INFO)
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const fmtW = (w) => `${Math.round(w * 10) / 10 === Math.round(w) ? Math.round(w).toLocaleString('en-US') : (Math.round(w * 10) / 10).toLocaleString('en-US')} W`;
    const classPower = (cls) => POE_CLASSES[cls].pse;

    /* AV and IT modes: each uses only its own NETGEAR brand palette and switch portfolio */
    const BRANDS = {
        av: {
            name: 'NETGEAR AV',
            logo: { dark: 'assets/netgear-av-logo.svg', light: 'assets/netgear-av-logo-light-bg.svg' },
            logoLight: 'assets/netgear-av-logo-light-bg.svg',
            iconPrefix: '',
            series: ['M4250', 'M4350'],
            lede: 'Check whether a NETGEAR M4250 or M4350 AV switch can power your cameras, displays, codecs and microphones, including the effect of extra power supplies and a power supply failure.',
            exampleSwitch: 'M4250-26G4F-PoE++'
        },
        it: {
            name: 'NETGEAR Enterprise',
            logo: { dark: 'assets/netgear-enterprise-logo.svg', light: 'assets/netgear-enterprise-logo-light-bg.svg' },
            logoLight: 'assets/netgear-enterprise-logo-light-bg.svg',
            iconPrefix: 'it-',
            series: ['M4350', 'M4300'],
            lede: 'Check whether a NETGEAR M4350 or M4300 switch can power your access points, IP phones, cameras and IoT devices, including the effect of extra power supplies and a power supply failure.',
            exampleSwitch: 'M4350-24M4X4V'
        }
    };

    const EXAMPLES = {
        it: [
            { name: 'WiFi 7 access point', cls: 6, qty: 4, watt: null },
            { name: 'IP desk phone', cls: 2, qty: 12, watt: null },
            { name: 'Security camera', cls: 3, qty: 8, watt: null },
            { name: 'PTZ camera', cls: 4, qty: 2, watt: null }
        ]
    };

    const EXAMPLE = [
        { name: 'PTZ camera', cls: 4, qty: 4, watt: null },
        { name: 'Ceiling microphone', cls: 3, qty: 6, watt: null },
        { name: 'Video encoder', cls: 3, qty: 4, watt: null },
        { name: 'Display or touch panel', cls: 6, qty: 2, watt: null },
        { name: 'WiFi access point', cls: 6, qty: 2, watt: null }
    ];

    const state = {
        mode: 'av',
        switchId: '',
        customBudget: 0,
        voltage: '220',
        dims: {},
        margin: 10,
        needRedundant: false,
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
        for (const series of Object.keys(SERIES_INFO).filter((x) => BRANDS[state.mode].series.includes(x))) {
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
        const maxBudget = Math.max(...sw.configs.map((c) => c.budget));
        const maxModules = Math.max(...sw.configs.map((c) => c.modules));
        let power = 'Fixed internal PSU';
        if (sw.series === 'M4350' && maxModules > 0) power = `${maxModules} modular PSU slot${maxModules > 1 ? 's' : ''}, up to ${fmtW(maxBudget)}`;
        else if (sw.dims.some((d) => d.key === 'count')) power = `${sw.configs.length} internal PSUs, up to ${fmtW(maxBudget)}`;
        else if (sw.series === 'M4300' && sw.dims.length) power = `2 PSU bays, up to ${fmtW(maxBudget)}`;
        el.innerHTML = `
            <div><dt>POE PORTS</dt><dd>${sw.poePorts}</dd></div>
            <div><dt>PER PORT</dt><dd>${type}</dd></div>
            <div><dt>POWER</dt><dd>${power}</dd></div>
            <div><dt>PORTS</dt><dd>${sw.desc}</dd></div>`;
    }

    /* Smallest setup on this switch that carries the load, and the smallest that survives a PSU failure */
    function recommendPower(sw, need) {
        const list = configsFor(sw, state.voltage).filter((c) => !c.degraded);
        const order = (x, y) => x.modules - y.modules || x.budget - y.budget || y.redundant - x.redundant;
        const fit = list.filter((c) => c.budget >= need).sort(order)[0] || null;
        const red = list.filter((c) => c.redundant >= need).sort(order)[0] || null;
        return { fit, red };
    }

    const sameDims = (sw, a, b) => !!a && !!b && sw.dims.every((d) => a.dims[d.key] === b.dims[d.key]);
    const setupLabel = (c) => Object.values(c.dims).join(', ') || 'Fixed internal PSU';

    function applyConfig(c) {
        state.dims = { ...c.dims };
        update();
    }

    function renderPowerAdvice(sw) {
        const box = $('psuAdvice');
        const load = loadSummary();
        box.innerHTML = '';
        box.hidden = true;
        if (!sw || !sw.dims.length || load.total <= 0) return null;
        const need = load.withMargin;
        const rec = recommendPower(sw, need);
        const cur = currentConfig();
        box.hidden = false;
        const needTxt = `${fmtW(Math.ceil(need))}${state.margin ? ` incl. ${state.margin} % headroom` : ''}`;

        if (!rec.fit) {
            box.innerHTML = `<p class="advice-title">No power setup on this switch can deliver ${needTxt}.</p>
                <p>The maximum is ${fmtW(Math.max(...sw.configs.map((c) => c.budget)))}. Split the devices over two switches, use measured device wattage, or let the finder suggest a bigger switch.</p>
                <button type="button" class="btn btn-ghost" data-act="finder">Find a Switch</button>`;
            box.querySelector('[data-act="finder"]').onclick = () => selectTab('find');
            return rec;
        }
        const rows = [];
        let pickCount = 0;
        const row = (tag, c, extra) => {
            const active = sameDims(sw, c, cur);
            rows.push(`<li><span class="advice-tag">${tag}</span><span class="advice-what"><strong>${escapeHtml(setupLabel(c))}</strong>
                <span>${fmtW(c.budget)} PoE${c.redundant ? `, ${fmtW(c.redundant)} if one PSU fails` : ', no redundancy'}${extra || ''}</span></span>
                ${active ? '<span class="advice-current">Current</span>' : `<button type="button" class="btn btn-primary btn-sm" data-cfg="${pickCount}">Apply</button>`}</li>`);
            pickCount += 1;
            return c;
        };
        let picks;
        if (state.needRedundant) {
            if (rec.red) picks = [row('RECOMMENDED', rec.red, ' (redundant)')];
            else {
                picks = [];
                rows.push(`<li class="advice-none">No setup on this switch keeps ${needTxt} powered after a PSU failure. The closest without redundancy is below, or use Find a Switch.</li>`);
                picks.push(row('WITHOUT REDUNDANCY', rec.fit));
            }
        } else {
            picks = [row('RECOMMENDED', rec.fit)];
            if (rec.red && !sameDims(sw, rec.red, rec.fit)) picks.push(row('REDUNDANT', rec.red));
            else if (!rec.red) rows.push(`<li class="advice-none">No setup on this switch keeps all devices powered after a PSU failure.</li>`);
            else rows[0] = rows[0].replace('RECOMMENDED', 'RECOMMENDED + REDUNDANT');
        }

        box.innerHTML = `<p class="advice-title">Your devices need ${needTxt}</p><ul class="advice-list">${rows.join('')}</ul>`;
        box.querySelectorAll('[data-cfg]').forEach((btn) => (btn.onclick = () => applyConfig(picks[Number(btn.dataset.cfg)])));
        return rec;
    }

    function renderPowerDims() {
        const sw = getSwitch();
        const wrap = $('powerDims');
        wrap.innerHTML = '';
        const note = $('powerNote');
        note.textContent = '';
        const rec = renderPowerAdvice(sw);
        if (!sw) {
            if (state.switchId === 'custom') note.textContent = 'With a custom budget, power supply options are not needed.';
            else note.textContent = 'Choose a switch first. Many M4350 and M4300 switches take extra power supplies for a bigger PoE budget, and this step shows the options.';
            return;
        }
        if (!sw.dims.length) {
            note.textContent = 'This switch has a fixed internal power supply. Nothing to configure.';
            return;
        }
        const list = configsFor(sw, state.voltage);
        sw.dims.forEach((d) => {
            const values = [...new Set(list.map((c) => c.dims[d.key]))];
            const others = sw.dims.filter((o) => o.key !== d.key);
            const field = document.createElement('fieldset');
            field.className = 'field psu-field';
            field.innerHTML = `<legend class="label">${d.label.toUpperCase()}</legend>`;
            const group = document.createElement('div');
            const asCards = values.length > 2;
            group.className = asCards ? 'psu-options' : 'segmented';
            values.forEach((v) => {
                // The config this choice leads to, keeping the other current choices
                const target = list.find((c) => c.dims[d.key] === v && others.every((o) => c.dims[o.key] === state.dims[o.key]));
                const label = document.createElement('label');
                label.className = asCards ? 'psu-card' : '';
                const checked = v === state.dims[d.key];
                const badges = [];
                const recPick = rec ? (state.needRedundant ? rec.red : rec.fit) : null;
                if (target && recPick && sameDims(sw, target, recPick)) badges.push('<span class="psu-badge">Recommended</span>');
                if (target && rec && rec.red && sameDims(sw, target, rec.red) && !(recPick && sameDims(sw, target, recPick))) badges.push('<span class="psu-badge alt">Redundant</span>');
                const load = loadSummary();
                const fits = target && load.total > 0 ? target.budget >= load.withMargin : null;
                label.innerHTML = asCards
                    ? `<input type="radio" name="dim-${d.key}" value="${escapeHtml(v)}"${checked ? ' checked' : ''}>
                       <span class="psu-card-body">
                           <span class="psu-name">${escapeHtml(v)}</span>
                           ${target ? `<span class="psu-budget">${fmtW(target.budget)} <small>PoE</small></span>
                           <span class="psu-meta">${target.redundant ? `${fmtW(target.redundant)} if one PSU fails` : 'No redundancy'}${fits === false ? ' | too small' : ''}</span>`
                           : '<span class="psu-meta">Changes other options</span>'}
                           ${badges.length ? `<span class="psu-badges">${badges.join('')}</span>` : ''}
                       </span>`
                    : `<input type="radio" name="dim-${d.key}" value="${escapeHtml(v)}"${checked ? ' checked' : ''}><span>${escapeHtml(v)}</span>`;
                label.querySelector('input').addEventListener('change', () => {
                    state.dims[d.key] = v;
                    resolveDims(sw, d.key);
                    update();
                });
                group.appendChild(label);
            });
            field.appendChild(group);
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
        if (sw && state.needRedundant && load.total > 0 && (redundant || 0) < load.total) blockers.push('not redundant');

        card.classList.toggle('over', over || blockers.length > 0);
        if (over) $('resultTitle').textContent = `Over budget by ${fmtW(-left)}`;
        else if (blockers.length) $('resultTitle').textContent = `Budget fits, but ${blockers.join(' and ')}`;
        else if (tight) $('resultTitle').textContent = 'Fits, but without your headroom';
        else if (load.total === 0) $('resultTitle').textContent = 'Add devices to check the fit';
        else $('resultTitle').textContent = 'Fits within the PoE budget';

        // Checks
        if (over) {
            const opts = sw ? recommendPower(sw, load.total) : null;
            const fix = opts ? (state.needRedundant ? opts.red || opts.fit : opts.fit) : null;
            checks.push(['warn', fix
                ? `Devices need ${fmtW(load.total)} but the budget is ${fmtW(budget)}. This switch fits with: ${setupLabel(fix)} (${fmtW(fix.budget)}). See step 2.`
                : `Devices need ${fmtW(load.total)} but the budget is ${fmtW(budget)}. No power setup on this switch is big enough: try Find a Switch.`]);
        }
        else if (tight) checks.push(['warn', `Only ${fmtW(left)} left, below your ${state.margin} % headroom (${fmtW(load.withMargin - load.total)}).`]);
        else if (load.total > 0) checks.push(['ok', `${fmtW(leftAfterMargin)} spare after ${state.margin ? `${state.margin} % headroom` : 'all devices'}.`]);

        if (sw) {
            if (load.ports > sw.poePorts) checks.push(['warn', `${load.ports} devices but only ${sw.poePorts} PoE ports on this switch.`]);
            else if (load.ports > 0) checks.push(['ok', `${load.ports} of ${sw.poePorts} PoE ports used.`]);

            if (load.maxClass >= 5 && sw.maxPort < 90) checks.push(['warn', `Class ${load.maxClass} devices need PoE++ (802.3bt). This switch supports PoE+ only, up to 30 W per port.`]);
            else if (load.maxPort > sw.maxPort) checks.push(['warn', `A device needs ${fmtW(load.maxPort)} on one port. This switch delivers up to ${sw.maxPort} W per port.`]);
            else if (load.ports > 0) checks.push(['ok', `Every device is within the ${sw.maxPort} W per-port limit.`]);

            if (load.total > 0) {
                if (state.needRedundant && !redundant) checks.push(['warn', 'Redundant power is required, but this setup has no backup power supply. See step 2 for a redundant option.']);
                else if (!redundant) checks.push(['info', 'No power redundancy in this setup. A PSU failure powers down all PoE devices.']);
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
        $('findRedundant').checked = state.needRedundant;
    }

    /* Every switch (in the current AV / IT portfolio) that can carry a load, best fit first */
    function findMatches({ need, ports, perPort, series = 'all', needRed = false }) {
        const matches = [];
        for (const sw of SWITCHES) {
            if (!BRANDS[state.mode].series.includes(sw.series)) continue;
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
        return matches;
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

        const matches = findMatches({ need, ports, perPort, series, needRed });

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
            o: state.mode, r: state.needRedundant ? 1 : 0, s: state.switchId, c: state.customBudget, v: state.voltage, d: state.dims, m: state.margin,
            x: state.devices.map((d) => [d.name, d.cls, Number(d.qty) || 0, d.watt === null ? null : Number(d.watt)])
        };
        try { history.replaceState(null, '', `#${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(s)))))}`); } catch (e) { /* ignore */ }
    }

    function loadHash() {
        if (location.hash.length < 2) return false;
        try {
            const s = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(1))))));
            if (s.o === 'it' || s.o === 'av') state.mode = s.o;
            state.needRedundant = s.r === 1;
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
        const brand = BRANDS[state.mode];
        const el = $('printReport');
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const voltage = state.voltage === '110' ? '100 - 127 V AC' : '200 - 240 V AC';
        const budget = sw && cfg ? cfg.budget : state.switchId === 'custom' ? Number(state.customBudget) || 0 : null;
        const redundant = sw && cfg ? cfg.redundant : null;
        const action = $('resultCard').classList.contains('over');
        const pct = budget ? Math.round((load.total / budget) * 100) : 0;
        const left = budget !== null ? budget - load.total : null;
        const marginW = load.withMargin - load.total;

        const model = sw ? sw.id : state.switchId === 'custom' ? 'Other switch' : 'No switch selected';
        const sub = sw ? `${sw.sku} | ${sw.desc}` : state.switchId === 'custom' ? 'Custom PoE budget entered manually' : 'Choose a switch in the calculator';

        /* ---------- Page 1 data ---------- */
        const kv = [];
        if (sw) {
            kv.push(['PoE ports', `${sw.poePorts} x ${sw.maxPort >= 90 ? 'PoE++ up to 90 W' : 'PoE+ up to 30 W'}`]);
            kv.push(['Power setup', cfg ? setupLabel(cfg) : '-']);
            kv.push(['AC input', voltage]);
            const codes = cfg ? Object.keys(PSU_INFO).filter((p) => Object.values(cfg.dims).some((v) => new RegExp(`\\b${p}\\b`).test(String(v)))) : [];
            if (codes.length) kv.push(['PSU order code', codes.map((p) => PSU_INFO[p]).join(', ')]);
        }
        kv.push(['Safety headroom', state.margin ? `${state.margin} % (${fmtW(marginW)})` : 'None']);
        kv.push(['Redundant power', state.needRedundant ? 'Required' : 'Not required']);

        const figures = [
            ['PoE budget', budget === null ? '-' : fmtW(budget), sw ? 'From the datasheet' : budget !== null ? 'Entered manually' : ''],
            ['Devices need', fmtW(load.total), `${load.ports} device${load.ports === 1 ? '' : 's'}`],
            ['Left over', left === null ? '-' : fmtW(left), left === null ? '' : state.margin ? `${fmtW(budget - load.withMargin)} after headroom` : 'No headroom set'],
            ['If one PSU fails', redundant === null ? 'n/a' : redundant ? fmtW(redundant) : 'No backup', redundant ? (load.total <= redundant ? 'All devices stay on' : `${fmtW(load.total - redundant)} short`) : 'Single power supply']
        ];

        const checks = [...document.querySelectorAll('#checks li')].map((li) => {
            const kind = li.classList.contains('warn') ? 'warn' : li.classList.contains('info') ? 'info' : 'ok';
            const mark = kind === 'warn' ? '!' : kind === 'info' ? 'i' : '&#10003;';
            return `<li class="${kind}"><span class="rp-mark">${mark}</span><span>${escapeHtml(li.textContent)}</span></li>`;
        }).join('');

        // Power supply recommendation for the selected switch
        let psuAdvice = '';
        if (sw && sw.dims.length && load.total > 0) {
            const rec = recommendPower(sw, load.withMargin);
            const pick = state.needRedundant ? rec.red : rec.fit;
            if (pick) {
                const isCurrent = sameDims(sw, pick, cfg);
                psuAdvice = `<div class="rp-advice"><p class="rp-label">Recommended power setup for this switch</p>
                    <p><strong>${escapeHtml(setupLabel(pick))}</strong>: ${fmtW(pick.budget)} PoE, ${pick.redundant ? `${fmtW(pick.redundant)} if one PSU fails` : 'no redundancy'}${isCurrent ? ' (this is the selected setup)' : ''}</p></div>`;
            }
        }

        const headroomPos = budget && state.margin ? (1 / (1 + state.margin / 100)) * 100 : null;
        const redPos = budget && redundant && redundant < budget ? (redundant / budget) * 100 : null;

        /* ---------- Page 2 data ---------- */
        const devices = state.devices.filter((d) => Number(d.qty) > 0);
        const anyMeasured = devices.some((d) => d.watt !== null && d.watt !== '');
        const deviceRows = devices.map((d) => {
            const q = Math.floor(Number(d.qty) || 0);
            const w = deviceWatt(d);
            const measured = d.watt !== null && d.watt !== '';
            return `<tr><td>${escapeHtml(d.name) || 'Unnamed device'}</td><td>Class ${d.cls}</td><td>${POE_CLASSES[d.cls].type}</td>
                <td class="num">${q}</td><td class="num">${fmtW(w)}${measured ? '*' : ''}</td><td class="num">${fmtW(q * w)}</td></tr>`;
        }).join('');

        // Recommended switches: finder inputs when printing from that tab, otherwise the device list
        const fromFinder = !$('panel-find').hidden;
        const crit = fromFinder
            ? { need: Number($('findBudget').value) || 0, ports: Number($('findPorts').value) || 0, perPort: Number($('findPerPort').value) || 0, series: $('findSeries').value, needRed: $('findRedundant').checked }
            : { need: Math.ceil(load.withMargin), ports: load.ports, perPort: load.maxPort, series: 'all', needRed: state.needRedundant };
        const matches = crit.need || crit.ports ? findMatches(crit).slice(0, 5) : [];
        const critText = [
            crit.need ? `${fmtW(crit.need)} PoE budget${!fromFinder && state.margin ? ` (incl. ${state.margin} % headroom)` : ''}` : null,
            crit.ports ? `${crit.ports} PoE ports` : null,
            crit.perPort ? `up to ${fmtW(crit.perPort)} per port` : null,
            crit.needRed ? 'redundant power' : null
        ].filter(Boolean).join(', ');
        const recRows = matches.map(({ sw: m, cfg: c }, i) => `
            <tr${sw && m.id === sw.id ? ' class="rp-selected"' : ''}>
                <td><strong>${escapeHtml(m.id)}</strong>${i === 0 ? ' <span class="rp-pill">Best fit</span>' : ''}${sw && m.id === sw.id ? ' <span class="rp-pill alt">Selected</span>' : ''}<br><span class="rp-dim">${escapeHtml(m.sku)} | ${m.poePorts} x ${m.maxPort >= 90 ? 'PoE++' : 'PoE+'}</span></td>
                <td>${escapeHtml(setupLabel(c))}${c.voltage !== 'any' ? ` <span class="rp-dim">(${c.voltage === '110' ? '100 - 127' : '200 - 240'} V AC)</span>` : ''}</td>
                <td class="num">${fmtW(c.budget)}</td>
                <td class="num">${c.redundant ? fmtW(c.redundant) : 'None'}</td>
                <td class="num">${fmtW(c.budget - crit.need)}</td>
            </tr>`).join('');

        // Short device lists share page 2 with the recommendations; long lists get their own page
        const splitPages = devices.length > 10;
        const totalPages = splitPages ? 3 : 2;
        const pageFoot = (n) => `
            <footer class="rp-pagefoot">
                <span>Calculated from datasheet values. Power only: bandwidth is not checked. Guidance only.</span>
                <span>${brand.name} PoE Calculator | Page ${n} of ${totalPages}</span>
            </footer>`;
        const smallHead = `
            <header class="rp-head rp-head-small">
                <img src="${brand.logoLight}" alt="${brand.name}">
                <div class="rp-head-meta"><span><strong>${escapeHtml(model)}</strong></span><span>${date}</span></div>
            </header>`;

        const devicesSection = `
            <section class="rp-section rp-first">
                <h2>Powered devices</h2>
                ${devices.length ? `<table class="rp-table${devices.length > 14 ? ' rp-dense' : ''}">
                    <thead><tr><th>Device</th><th>Class</th><th>Type</th><th class="num">Qty</th><th class="num">W each</th><th class="num">Total</th></tr></thead>
                    <tbody>${deviceRows}</tbody>
                    <tfoot><tr><td colspan="3">Total</td><td class="num">${load.ports}</td><td></td><td class="num">${fmtW(load.total)}</td></tr></tfoot>
                </table>
                <p class="rp-note">W each is the maximum the switch reserves for the PoE class${anyMeasured ? '. * = measured value entered by the user' : ''}.</p>` : '<p class="rp-note">No devices added.</p>'}
            </section>`;

        const recSection = `
            <section class="rp-section">
                <h2>Recommended switches</h2>
                ${critText ? `<p class="rp-note rp-lead">Switches in the ${state.mode === 'it' ? 'IT' : 'AV'} portfolio that deliver ${critText}, at ${voltage}. Best fit first, with the smallest power setup that works.</p>` : ''}
                ${matches.length ? `<table class="rp-table rp-rec">
                    <thead><tr><th>Switch</th><th>Power setup</th><th class="num">Budget</th><th class="num">If one PSU fails</th><th class="num">Spare</th></tr></thead>
                    <tbody>${recRows}</tbody>
                </table>` : `<p class="rp-note">${critText ? 'No single switch in this portfolio meets these requirements. Consider splitting the devices over two switches.' : 'Add devices to get switch recommendations.'}</p>`}
            </section>`;

        const disclaimer = `
            <section class="rp-disclaimer">
                <h2>How to read this report</h2>
                <ul>
                    <li><strong>Calculated, not measured.</strong> PoE budgets come from the published NETGEAR datasheets. Device power is the maximum the switch reserves for each PoE class, unless a measured value was entered. Real consumption is usually lower.</li>
                    <li><strong>Power only.</strong> This report does not check bandwidth, port speeds (1G, 2.5G, 10G), uplink or stacking capacity, multicast or AV over IP traffic, or switch configuration.</li>
                    <li><strong>Cabling is included.</strong> PoE class values already include the power lost in up to 100 m of cable.</li>
                    <li><strong>Not included:</strong> ambient temperature, airflow, power supply derating, and future expansion beyond the safety headroom.</li>
                    <li><strong>Before you order,</strong> confirm the design with the current datasheet and your NETGEAR contact. This report is guidance only.</li>
                </ul>
                <p class="rp-note">Open the calculator: ${escapeHtml(location.origin + location.pathname)}</p>
            </section>`;

        el.dataset.brand = state.mode;
        el.innerHTML = `
        <div class="rp-page">
            <header class="rp-head">
                <img src="${brand.logoLight}" alt="${brand.name}">
                <div class="rp-head-meta"><span class="rp-title"><span class="thin">PoE budget</span> <strong>report</strong></span><span>${date}</span></div>
            </header>

            <section class="rp-hero${action ? ' action' : ''}">
                <div class="rp-hero-top">
                    <div>
                        <p class="rp-label">Switch</p>
                        <h1>${escapeHtml(model)}</h1>
                        <p class="rp-sub">${escapeHtml(sub)}</p>
                    </div>
                    <div class="rp-verdict">
                        <span class="rp-verdict-icon">${action ? '!' : '&#10003;'}</span>
                        <div><p class="rp-label">${action ? 'Action needed' : 'Result'}</p><strong>${escapeHtml($('resultTitle').textContent)}</strong></div>
                    </div>
                </div>
                ${budget ? `
                <div class="rp-meter">
                    <div class="rp-bar">
                        <div class="rp-fill" style="width:${Math.min(100, pct)}%"></div>
                        ${headroomPos !== null ? `<div class="rp-headroom" style="left:${headroomPos}%"></div>` : ''}
                        ${redPos !== null ? `<div class="rp-red" style="left:${redPos}%"></div>` : ''}
                    </div>
                    <div class="rp-scale"><span>0 W</span><span><strong>${pct} %</strong> of the PoE budget used</span><span>${fmtW(budget)}</span></div>
                    <p class="rp-legend">${headroomPos !== null ? `<span><span class="lg lg-headroom"></span>${state.margin} % headroom</span>` : ''}${redPos !== null ? `<span><span class="lg lg-red"></span>Budget if one PSU fails</span>` : ''}</p>
                </div>` : ''}
            </section>

            <section class="rp-figures">
                ${figures.map(([k, v, c]) => `<div><p class="rp-label">${k}</p><p class="rp-value">${escapeHtml(v)}</p><p class="rp-note">${escapeHtml(c)}</p></div>`).join('')}
            </section>

            <div class="rp-cols">
                <section class="rp-section">
                    <h2>Checks</h2>
                    ${checks ? `<ul class="rp-checks">${checks}</ul>` : '<p class="rp-note">Add devices to run the checks.</p>'}
                </section>
                <section class="rp-section">
                    <h2>Switch and power</h2>
                    <dl class="rp-kv">${kv.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>
                    ${psuAdvice}
                </section>
            </div>
            ${pageFoot(1)}
        </div>

        <div class="rp-page">
            ${smallHead}
            ${devicesSection}
            ${splitPages ? '' : recSection + disclaimer}
            ${pageFoot(2)}
        </div>
        ${splitPages ? `<div class="rp-page">${smallHead}${recSection.replace('class="rp-section"', 'class="rp-section rp-first"')}${disclaimer}${pageFoot(3)}</div>` : ''}`;
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
        renderPowerDims();
        renderResult();
        if (!$('panel-find').hidden) { syncFinderFromDevices(); renderFinder(); }
        saveHash();
        buildPrintReport();
    }

    /* ================= AV / IT mode ================= */

    function applyMode() {
        const brand = BRANDS[state.mode];
        document.documentElement.dataset.brand = state.mode;
        $('brandLogo').src = brand.logo[currentTheme()];
        $('brandLogo').alt = brand.name;
        $('heroLede').textContent = brand.lede;
        document.querySelectorAll('img[data-icon]').forEach((img) => (img.src = `assets/icons/${brand.iconPrefix}${img.dataset.icon}.svg`));
        document.querySelectorAll('input[name="mode"]').forEach((r) => (r.checked = r.value === state.mode));
        // Finder series options follow the portfolio
        [...$('findSeries').options].forEach((o) => (o.hidden = o.value !== 'all' && !brand.series.includes(o.value)));
        if ($('findSeries').selectedOptions[0]?.hidden) $('findSeries').value = 'all';
        buildSwitchSelect();
        $('switchSelect').value = state.switchId || '';
        try { localStorage.setItem('poeCalcMode', state.mode); } catch (e) { /* ignore */ }
    }

    /* ================= Light / dark theme ================= */

    const currentTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

    function applyTheme(theme, store) {
        document.documentElement.dataset.theme = theme;
        const btn = $('themeToggle');
        btn.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
        btn.setAttribute('aria-pressed', String(theme === 'light'));
        btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
        $('brandLogo').src = BRANDS[state.mode].logo[theme];
        if (store) { try { localStorage.setItem('poeCalcTheme', theme); } catch (e) { /* ignore */ } }
    }

    /* ================= First-visit AV / IT picker ================= */

    function openModePicker() {
        const picker = $('modePicker');
        picker.hidden = false;
        window.PoECalc.pendingModeChoice = true;
        const first = picker.querySelector('.picker-option');
        setTimeout(() => first.focus(), 50);
        const choose = (mode) => {
            picker.hidden = true;
            document.removeEventListener('keydown', onKey);
            window.PoECalc.pendingModeChoice = false;
            if (mode === state.mode) applyMode(); else setMode(mode);
            document.dispatchEvent(new CustomEvent('poecalc:modechosen', { detail: mode }));
        };
        const onKey = (e) => {
            if (e.key === 'Escape') choose(state.mode);
            if (e.key === 'Tab') {
                const items = [...picker.querySelectorAll('.picker-option')];
                const i = items.indexOf(document.activeElement);
                e.preventDefault();
                items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
            }
        };
        document.addEventListener('keydown', onKey);
        picker.querySelectorAll('.picker-option').forEach((b) => (b.onclick = () => choose(b.dataset.mode)));
    }

    function setMode(mode) {
        if (mode === state.mode) return;
        state.mode = mode;
        const sw = getSwitch();
        if (sw && !BRANDS[mode].series.includes(sw.series)) { state.switchId = ''; state.dims = {}; }
        applyMode();
        update();
    }

    /* ================= Wire up ================= */

    function init() {
        buildSwitchSelect();
        $('classTable').innerHTML = POE_CLASSES.map((c) =>
            `<tr><td>${c.cls}</td><td>${c.std}</td><td>${c.pse} W</td><td>${c.pd} W</td><td>${c.pseV}</td><td>${c.pdV}</td></tr>`).join('');

        // Mode: shared link > ?mode=it|av > last used > ask the visitor
        let storedMode = null;
        try { storedMode = localStorage.getItem('poeCalcMode'); } catch (e) { /* ignore */ }
        if (storedMode === 'it' || storedMode === 'av') state.mode = storedMode;
        const qm = new URLSearchParams(location.search).get('mode');
        if (qm === 'it' || qm === 'av') state.mode = qm;
        const fromSharedLink = loadHash();
        const askMode = !fromSharedLink && !(qm === 'it' || qm === 'av') && !(storedMode === 'it' || storedMode === 'av');
        applyMode();
        if (askMode) { try { localStorage.removeItem('poeCalcMode'); } catch (e) { /* ignore */ } }
        applyTheme(currentTheme(), false);
        $('themeToggle').addEventListener('click', () => applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true));
        // Follow the operating system theme until the visitor picks one
        try {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                let stored = null;
                try { stored = localStorage.getItem('poeCalcTheme'); } catch (err) { /* ignore */ }
                if (!stored) applyTheme(e.matches ? 'light' : 'dark', false);
            });
        } catch (e) { /* older browsers */ }
        if (askMode) openModePicker();
        document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => setMode(r.value)));
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
        $('needRedundant').checked = state.needRedundant;
        $('needRedundant').addEventListener('change', (e) => { state.needRedundant = e.target.checked; update(); });

        $('addDevice').addEventListener('click', () => {
            state.devices.push({ name: '', cls: 4, qty: 1, watt: null });
            renderDevices();
            update(false);
            const rows = document.querySelectorAll('#deviceRows .c-name');
            rows[rows.length - 1]?.focus();
        });
        $('loadExample').addEventListener('click', () => {
            state.devices = (EXAMPLES[state.mode] || EXAMPLE).map((d) => ({ ...d }));
            if (!state.switchId) {
                state.switchId = BRANDS[state.mode].exampleSwitch;
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
    window.PoECalc = { pendingModeChoice: false, selectTab, getMode: () => state.mode, loadExample: () => $('loadExample').click(), hasSwitch: () => !!state.switchId };

    document.addEventListener('DOMContentLoaded', init);
})();
