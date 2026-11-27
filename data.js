/*
 * NETGEAR managed switch PoE data
 * --------------------------------
 * Every number in this file comes from the official NETGEAR datasheets:
 *   - M4250 series datasheet  (PoE budget table, page 34)
 *   - M4300 series datasheet  (Power supplies + PoE budget table, page 34)
 *   - M4350 series datasheet  (PoE budget and EPS/RPS wattages, pages 66-74)
 *
 * Each switch exposes a list of "configs": one entry per power setup that the
 * datasheet publishes a PoE budget for. A config has:
 *   dims       - the choices that describe it (shown as dropdowns in the UI)
 *   voltage    - 'any', '110' or '220' (AC input the budget applies to)
 *   budget     - available PoE budget in W
 *   redundant  - PoE budget left if any single PSU fails (0 = no redundancy)
 *   modules    - number of extra PSUs to buy (used to rank finder results)
 *   degraded   - true when a PSU that ships with the switch is disconnected or failed;
 *                shown in the calculator, never recommended by the finder
 *
 * Non-PoE models (M4250-12M2XF, M4250-16XF, M4350-24F4X, -8X8F, -12X12F,
 * -24F4V, -32F8V, -16V4C, -40F4C, -16C, and the non-PoE M4300 models) are
 * intentionally left out.
 */

const POE_CLASSES = [
    // class, standard, PSE max (W, allocated by the switch), PD max (W, available at the device)
    { cls: 0, std: 'IEEE 802.3af PoE (2-pair)', type: 'PoE', pse: 15.4, pd: 12.95, pseV: '44 - 57 V', pdV: '37 - 57 V' },
    { cls: 1, std: 'IEEE 802.3af PoE (2-pair)', type: 'PoE', pse: 4, pd: 3.84, pseV: '44 - 57 V', pdV: '37 - 57 V' },
    { cls: 2, std: 'IEEE 802.3af PoE (2-pair)', type: 'PoE', pse: 7, pd: 6.49, pseV: '44 - 57 V', pdV: '37 - 57 V' },
    { cls: 3, std: 'IEEE 802.3af PoE (2-pair)', type: 'PoE', pse: 15.4, pd: 12.95, pseV: '44 - 57 V', pdV: '37 - 57 V' },
    { cls: 4, std: 'IEEE 802.3at PoE+ (2-pair)', type: 'PoE+', pse: 30, pd: 25.5, pseV: '50 - 57 V', pdV: '42.5 - 57 V' },
    { cls: 5, std: 'IEEE 802.3bt PoE++ Type 3 (4-pair)', type: 'PoE++', pse: 45, pd: 40, pseV: '50 - 57 V', pdV: '42.5 - 57 V' },
    { cls: 6, std: 'IEEE 802.3bt PoE++ Type 3 (4-pair)', type: 'PoE++', pse: 60, pd: 51, pseV: '50 - 57 V', pdV: '42.5 - 57 V' },
    { cls: 7, std: 'IEEE 802.3bt PoE++ Type 4 (4-pair)', type: 'PoE++', pse: 75, pd: 62, pseV: '52 - 57 V', pdV: '41.1 - 57 V' },
    { cls: 8, std: 'IEEE 802.3bt PoE++ Type 4 (4-pair)', type: 'PoE++', pse: 90, pd: 71.3, pseV: '52 - 57 V', pdV: '41.1 - 57 V' }
];

const PSU_INFO = {
    'APS254W': 'APS254W-10000S (external power adapter)',
    'APS350W': 'APS350W-100NES/AJS/00S',
    'APS600Wv2': 'APS600W-200NES/AJS/00S',
    'APS920W': 'APS920W-100NES/AJS/00S',
    'APS2000W': 'APS2000W-100NES/AJS/00S',
    'APS600Wv3': 'APS600W-300NES/AJS/00S',
    'APS1200Wv2': 'APS1200W-200NES/AJS/00S',
    'APS2000Wv2': 'APS2000W-200NES/AJS/00S'
};

/* ---------- helpers that expand compact datasheet tables into configs ---------- */

// Fixed PSU, one budget
function fixedPower(budget) {
    return {
        dims: [],
        configs: [{ dims: {}, voltage: 'any', budget, redundant: 0, modules: 0 }]
    };
}

// Fixed internal PSUs where the budget depends on how many are connected (M4250 PoE++)
function psuCountPower(budgets, psuLabel) {
    const configs = budgets.map((budget, i) => ({
        dims: { count: `${i + 1} of ${budgets.length} ${psuLabel} connected` },
        voltage: 'any',
        budget,
        redundant: i === 0 ? 0 : budgets[i - 1],
        modules: 0,
        degraded: i < budgets.length - 1 // a PSU that ships with the switch is not connected
    }));
    return { dims: [{ key: 'count', label: 'Connected power supplies' }], configs };
}

/*
 * M4350 modular PSU table.
 * base:   budget with only the internal (or included) PSU
 * rows:   { psu: [w1Connected, w1Disconnected, w2Connected, w2Disconnected] }
 *         w1 = one modular PSU, w2 = two modular PSUs, "Connected" refers to the internal PSU.
 *         A key like 'APS2000W@220' means the value only applies at that AC voltage.
 */
function m4350Power({ internalLabel, base, slots, rows }) {
    const raw = {}; // key `${internal}|${psu}|${qty}|${voltage}` -> budget
    const set = (i, psu, q, v, w) => { if (w !== undefined && w !== null) raw[`${i}|${psu}|${q}|${v}`] = w; };
    set(1, '-', 0, 'any', base);

    const psus = [];
    for (const [key, vals] of Object.entries(rows)) {
        const [psu, v = 'any'] = key.split('@');
        if (!psus.includes(psu)) psus.push(psu);
        set(1, psu, 1, v, vals[0]);
        set(0, psu, 1, v, vals[1]);
        if (slots > 1) {
            set(1, psu, 2, v, vals[2]);
            set(0, psu, 2, v, vals[3]);
        }
    }

    const lookup = (i, psu, q, v) => {
        if (!i && q === 0) return 0; // no power at all
        if (q === 0) psu = '-';
        return raw[`${i}|${psu}|${q}|${v}`] ?? raw[`${i}|${psu}|${q}|any`];
    };

    const configs = [];
    const voltages = ['110', '220'];
    const seen = new Set();
    for (const v of voltages) {
        for (const i of [1, 0]) {
            for (const psu of ['-', ...psus]) {
                for (let q = psu === '-' ? 0 : 1; q <= (psu === '-' ? 0 : slots); q++) {
                    const budget = lookup(i, psu, q, v);
                    if (!budget) continue;
                    // Redundancy: budget left when any single PSU fails
                    const fallbacks = [];
                    if (i) fallbacks.push(lookup(0, psu, q, v) || 0);
                    if (q > 0) fallbacks.push(lookup(i, psu, q - 1, v) || 0);
                    const redundant = fallbacks.length ? Math.min(...fallbacks) : 0;
                    const voltageDependent = raw[`${i}|${psu}|${q}|any`] === undefined && q > 0;
                    const cfg = {
                        dims: {
                            internal: i ? `${internalLabel} connected` : `${internalLabel} disconnected`,
                            modules: q === 0 ? 'No modular PSU' : `${q} x ${psu}`
                        },
                        voltage: voltageDependent ? v : 'any',
                        budget,
                        redundant,
                        modules: q,
                        degraded: !i // internal / included PSU not connected (failure scenario)
                    };
                    const id = JSON.stringify([cfg.dims, cfg.voltage]);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    configs.push(cfg);
                }
            }
        }
    }
    return {
        dims: [
            { key: 'internal', label: 'Internal PSU' },
            { key: 'modules', label: slots > 1 ? `Modular PSUs (${slots} slots)` : 'Modular PSU (1 slot)' }
        ],
        configs,
        psus
    };
}

/*
 * M4300 PSU table: budgets per mode, each as [110V, 220V].
 */
function m4300Power(modes, extraDim) {
    const configs = [];
    for (const m of modes) {
        const [b110, b220] = m.budget;
        const [r110, r220] = m.redundant;
        const same = b110 === b220 && r110 === r220;
        const base = { dims: { mode: m.label, ...(m.extra || {}) }, modules: m.modules };
        if (same) configs.push({ ...base, voltage: 'any', budget: b110, redundant: r110 });
        else {
            configs.push({ ...base, voltage: '110', budget: b110, redundant: r110 });
            configs.push({ ...base, voltage: '220', budget: b220, redundant: r220 });
        }
    }
    const dims = [{ key: 'mode', label: 'PSU setup' }];
    if (extraDim) dims.push(extraDim);
    return { dims, configs };
}

/* ---------- switch catalog ---------- */

const SWITCHES = [
    /* ===== M4250 series (AV Line, fixed PSUs) ===== */
    { id: 'M4250-9G1F-PoE+', sku: 'GSM4210PD', series: 'M4250', desc: 'Desktop, 8x1G PoE+, 1x1G, 1xSFP, fanless', poePorts: 8, maxPort: 30, ...fixedPower(110) },
    { id: 'M4250-8G2XF-PoE+', sku: 'GSM4210PX', series: 'M4250', desc: 'Desktop, 8x1G PoE+, 2xSFP+', poePorts: 8, maxPort: 30, ...fixedPower(220) },
    { id: 'M4250-10G2F-PoE+', sku: 'GSM4212P', series: 'M4250', desc: '8x1G PoE+, 2x1G, 2xSFP', poePorts: 8, maxPort: 30, ...fixedPower(125) },
    { id: 'M4250-10G2XF-PoE+', sku: 'GSM4212PX', series: 'M4250', desc: '8x1G PoE+, 2x1G, 2xSFP+', poePorts: 8, maxPort: 30, ...fixedPower(240) },
    { id: 'M4250-10G2XF-PoE++', sku: 'GSM4212UX', series: 'M4250', desc: '8x1G Ultra90 PoE++, 2x1G, 2xSFP+', poePorts: 8, maxPort: 90, ...fixedPower(720) },
    { id: 'M4250-26G4F-PoE+', sku: 'GSM4230P', series: 'M4250', desc: '24x1G PoE+, 2x1G, 4xSFP', poePorts: 24, maxPort: 30, ...fixedPower(300) },
    { id: 'M4250-26G4F-PoE++', sku: 'GSM4230UP', series: 'M4250', desc: '24x1G Ultra90 PoE++, 2x1G, 4xSFP, 2 internal PSUs', poePorts: 24, maxPort: 90, ...psuCountPower([720, 1440], 'internal PSUs') },
    { id: 'M4250-26G4XF-PoE+', sku: 'GSM4230PX', series: 'M4250', desc: '24x1G PoE+, 2x1G, 4xSFP+', poePorts: 24, maxPort: 30, ...fixedPower(480) },
    { id: 'M4250-40G8F-PoE+', sku: 'GSM4248P', series: 'M4250', desc: '40x1G PoE+, 8xSFP', poePorts: 40, maxPort: 30, ...fixedPower(480) },
    { id: 'M4250-40G8XF-PoE+', sku: 'GSM4248PX', series: 'M4250', desc: '40x1G PoE+, 8xSFP+', poePorts: 40, maxPort: 30, ...fixedPower(960) },
    { id: 'M4250-40G8XF-PoE++', sku: 'GSM4248UX', series: 'M4250', desc: '40x1G Ultra90 PoE++, 8xSFP+, 3 internal PSUs', poePorts: 40, maxPort: 90, ...psuCountPower([720, 1650, 2880], 'internal PSUs') },

    /* ===== M4350 series (AV and IT, modular PSUs) ===== */
    {
        id: 'M4350-8M2V', sku: 'MSM4310', series: 'M4350', desc: 'Half-width, 8x2.5G PoE++, 2xSFP28 25G', poePorts: 8, maxPort: 90,
        ...m4350Power({
            internalLabel: 'Included APS254W adapter', base: 119, slots: 2,
            rows: { 'APS254W': [322, 119, 551, 322] }
        })
    },
    {
        id: 'M4350-16M4V', sku: 'MSM4320', series: 'M4350', desc: '16x2.5G PoE++ incl. 8 Neutrik etherCON, 4xSFP28 25G, 2 internal 800 W PSUs', poePorts: 16, maxPort: 90,
        ...psuCountPower([530, 1130], 'internal 800 W PSUs')
    },
    {
        id: 'M4350-24G4XF', sku: 'GSM4328', series: 'M4350', desc: '24x1G PoE+, 4xSFP+', poePorts: 24, maxPort: 30,
        ...m4350Power({
            internalLabel: 'Internal 880 W PSU', base: 648, slots: 1,
            rows: {
                'APS350W': [720, 218],
                'APS600Wv2': [720, 468],
                'APS920W': [720, 720],
                'APS2000W': [720, 720]
            }
        })
    },
    {
        id: 'M4350-48G4XF', sku: 'GSM4352', series: 'M4350', desc: '48x1G PoE+, 4xSFP+', poePorts: 48, maxPort: 30,
        ...m4350Power({
            internalLabel: 'Internal 550 W PSU', base: 236, slots: 2,
            rows: {
                'APS350W': [436, 186, 716, 396],
                'APS600Wv2': [636, 436, 1116, 796],
                'APS920W': [892, 756, 1440, 1308],
                'APS2000W@110': [956, 836, 1440, 1436],
                'APS2000W@220': [1440, 1440, 1440, 1440]
            }
        })
    },
    {
        id: 'M4350-24M4X4V', sku: 'MSM4332', series: 'M4350', desc: '24x2.5G + 4x10G PoE++, 4xSFP28 25G', poePorts: 28, maxPort: 90,
        ...m4350Power({
            internalLabel: 'Internal 800 W PSU', base: 522, slots: 2,
            rows: {
                'APS600Wv3': [852, 372, 1332, 732],
                'APS1200Wv2@110': [1172, 772, 1972, 1372],
                'APS1200Wv2@220': [1332, 972, 2292, 1692],
                'APS2000Wv2@110': [1172, 772, 1972, 1372],
                'APS2000Wv2@220': [1972, 1772, 2520, 2520]
            }
        })
    },
    {
        id: 'M4350-44M4X4V', sku: 'MSM4352', series: 'M4350', desc: '44x2.5G + 4x10G PoE++, 4xSFP28 25G', poePorts: 48, maxPort: 90,
        ...m4350Power({
            internalLabel: 'Internal 550 W PSU', base: 194, slots: 2,
            rows: {
                'APS350W': [394, 144, 674, 354],
                'APS600Wv2': [594, 394, 1074, 754],
                'APS920W': [850, 714, 1586, 1266],
                'APS2000W@110': [914, 794, 1714, 1394],
                // Datasheet lists 1,794 W for "internal disconnected", higher than "connected" (1,714 W).
                // Likely a datasheet typo; we use the lower, safe value for both.
                'APS2000W@220': [1714, 1714, 3314, 2994]
            }
        })
    },
    {
        id: 'M4350-24X4V', sku: 'XSM4328CV', series: 'M4350', desc: '24x10G PoE+, 4xSFP28 25G', poePorts: 24, maxPort: 30,
        ...m4350Power({
            internalLabel: 'Internal 880 W PSU', base: 576, slots: 1,
            rows: {
                'APS350W': [700, 146],
                'APS600Wv2': [720, 396],
                'APS920W': [720, 716],
                'APS2000W': [720, 720]
            }
        })
    },
    {
        id: 'M4350-36X4V', sku: 'XSM4340CV', series: 'M4350', desc: '36x10G PoE++, 4xSFP28 25G', poePorts: 36, maxPort: 90,
        ...m4350Power({
            internalLabel: 'Internal 750 W PSU', base: 280, slots: 1,
            rows: {
                'APS600Wv3': [640, 280],
                'APS1200Wv2@110': [960, 680],
                'APS1200Wv2@220': [1120, 880],
                'APS2000Wv2@110': [960, 680],
                'APS2000Wv2@220': [1760, 1680]
            }
        })
    },
    {
        id: 'M4350-24X8F8V', sku: 'XSM4340V', series: 'M4350', desc: '24x10G PoE++, 8xSFP+, 8xSFP28 25G', poePorts: 24, maxPort: 90,
        ...m4350Power({
            internalLabel: 'Internal 750 W PSU', base: 290, slots: 1,
            rows: {
                'APS600Wv3': [650, 290],
                'APS1200Wv2@110': [970, 690],
                'APS1200Wv2@220': [1130, 890],
                'APS2000Wv2@110': [970, 690],
                'APS2000Wv2@220': [1770, 1690]
            }
        })
    },
    {
        id: 'M4350-40X4C', sku: 'XSM4344C', series: 'M4350', desc: '40x10G PoE++, 4xQSFP28 100G', poePorts: 40, maxPort: 90,
        ...m4350Power({
            internalLabel: 'Internal 750 W PSU', base: 196, slots: 1,
            rows: {
                'APS600Wv3': [556, 196],
                'APS1200Wv2@110': [876, 596],
                'APS1200Wv2@220': [1036, 796],
                'APS2000Wv2@110': [876, 596],
                'APS2000Wv2@220': [1676, 1596]
            }
        })
    },

    /* ===== M4300 series (modular PSUs, PoE+ only) ===== */
    {
        id: 'M4300-28G-PoE+ (550 W PSU)', sku: 'GSM4328PA', series: 'M4300', desc: '24x1G PoE+, 2x10GBASE-T, 2xSFP+, ships with 1x APS550W', poePorts: 24, maxPort: 30,
        ...m4300Power([
            { label: '1 x APS550W', budget: [480, 480], redundant: [0, 0], modules: 0 },
            { label: '2 x APS550W, RPS (redundant) mode', budget: [480, 480], redundant: [480, 480], modules: 1 },
            { label: '2 x APS550W, EPS (shared) mode', budget: [720, 720], redundant: [480, 480], modules: 1 }
        ])
    },
    {
        id: 'M4300-28G-PoE+ (1,000 W PSU)', sku: 'GSM4328PB', series: 'M4300', desc: '24x1G PoE+, 2x10GBASE-T, 2xSFP+, ships with 1x APS1000W', poePorts: 24, maxPort: 30,
        ...m4300Power([
            { label: '1 x APS1000W', budget: [630, 720], redundant: [0, 0], modules: 0 },
            { label: '2 x APS1000W, RPS (redundant) mode', budget: [630, 720], redundant: [630, 720], modules: 1 },
            { label: '2 x APS1000W, EPS (shared) mode', budget: [720, 720], redundant: [630, 720], modules: 1 }
        ])
    },
    {
        id: 'M4300-52G-PoE+ (550 W PSU)', sku: 'GSM4352PA', series: 'M4300', desc: '48x1G PoE+, 2x10GBASE-T, 2xSFP+, ships with 1x APS550W', poePorts: 48, maxPort: 30,
        ...m4300Power([
            { label: '1 x APS550W', budget: [480, 480], redundant: [0, 0], modules: 0 },
            { label: '2 x APS550W, RPS (redundant) mode', budget: [480, 480], redundant: [480, 480], modules: 1 },
            { label: '2 x APS550W, EPS (shared) mode', budget: [720, 720], redundant: [480, 480], modules: 1 }
        ])
    },
    {
        id: 'M4300-52G-PoE+ (1,000 W PSU)', sku: 'GSM4352PB', series: 'M4300', desc: '48x1G PoE+, 2x10GBASE-T, 2xSFP+, ships with 1x APS1000W', poePorts: 48, maxPort: 30,
        ...m4300Power([
            { label: '1 x APS1000W', budget: [591, 860], redundant: [0, 0], modules: 0 },
            { label: '2 x APS1000W, RPS (redundant) mode', budget: [591, 860], redundant: [591, 860], modules: 1 },
            { label: '2 x APS1000W, EPS (shared) mode', budget: [1010, 1440], redundant: [591, 860], modules: 1 }
        ])
    },
    {
        id: 'M4300-16X (299 W PSU)', sku: 'XSM4316PA', series: 'M4300', desc: '16x10GBASE-T PoE+, ships with 1x APS299W', poePorts: 16, maxPort: 30,
        ...fixedPower(199)
    },
    {
        id: 'M4300-16X (600 W PSU)', sku: 'XSM4316PB', series: 'M4300', desc: '16x10GBASE-T PoE+, ships with 1x APS600W', poePorts: 16, maxPort: 30,
        ...fixedPower(500)
    },
    (() => {
        // M4300-96X: budget depends on PSUs and on the other port cards installed.
        const MAX = 'Only APM408P PoE+ cards (up to 6)';
        const MIN = '6x APM408P + 6 other port cards';
        const modes = [
            { label: '1 x APS600W', b: { max: [232, 232], min: [34, 34] }, r: null, modules: 1 },
            { label: '2 x APS600W, RPS (redundant) mode', b: { max: [232, 232], min: [34, 34] }, r: 'same', modules: 2 },
            { label: '2 x APS600W, EPS (shared) mode', b: { max: [832, 832], min: [634, 634] }, r: { max: [232, 232], min: [34, 34] }, modules: 2 },
            { label: '1 x APS1200W', b: { max: [682, 832], min: [484, 634] }, r: null, modules: 1 },
            { label: '2 x APS1200W, RPS (redundant) mode', b: { max: [682, 832], min: [484, 634] }, r: 'same', modules: 2 },
            { label: '2 x APS1200W, EPS (shared) mode', b: { max: [1440, 1440], min: [1440, 1440] }, r: { max: [682, 832], min: [484, 634] }, modules: 2 },
            { label: 'APS600W + APS1200W, EPS (shared) mode', b: { max: [1282, 1432], min: [1084, 1234] }, r: { max: [232, 232], min: [34, 34] }, modules: 2 }
        ];
        const expanded = [];
        for (const m of modes) {
            for (const [k, label] of [['max', MAX], ['min', MIN]]) {
                const red = m.r === null ? [0, 0] : m.r === 'same' ? m.b[k] : m.r[k];
                expanded.push({ label: m.label, extra: { cards: label }, budget: m.b[k], redundant: red, modules: m.modules });
            }
        }
        return {
            id: 'M4300-96X', sku: 'XSM4396K0 / XSM4396K1', series: 'M4300',
            desc: 'Modular 2U chassis, up to 48 PoE+ ports on 6x APM408P cards (first 6 slots)', poePorts: 48, maxPort: 30,
            ...m4300Power(expanded, { key: 'cards', label: 'Port cards installed' })
        };
    })()
];

const SERIES_INFO = {
    M4250: 'M4250 AV Line (fixed PSU)',
    M4350: 'M4350 AV and IT (modular PSU)',
    M4300: 'M4300 Intelligent Edge (modular PSU)'
};
