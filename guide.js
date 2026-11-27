/*
 * First-time guided tour.
 * - Opens automatically on the first visit (remembered in localStorage, never a cookie).
 * - Can be restarted at any time with "Take the Tour" in the header.
 * - Keyboard: Esc closes, Left/Right arrows move between steps.
 * - No external libraries.
 */
(function () {
    'use strict';

    const SEEN_KEY = 'poeCalcTourSeen.v2';
    // Read before calc.js writes its own state into the hash
    const OPENED_SHARED_LINK = location.hash.length > 1;

    const STEPS = [
        {
            title: 'Welcome to the PoE calculator',
            text: 'In about a minute you will know whether a switch can power all your devices. This short tour shows the three steps. You can leave it at any time.',
            target: null
        },
        {
            title: 'AV or IT',
            text: 'Choose AV for the M4250 and M4350 AV switches, or IT for the M4350 and M4300. The switch list, the switch finder, and the PDF report follow your choice.',
            target: '#modeSwitch'
        },
        {
            title: 'Choose a switch',
            text: 'Pick a NETGEAR M4250, M4350 or M4300 model. The number after each name is its PoE budget range. For any other switch, choose "Other switch" and type its budget.',
            target: '#stepSwitch', tab: 'calc'
        },
        {
            title: 'Set up power supplies',
            text: 'Set the AC voltage of your site, then the power supplies. Many M4350 and M4300 models gain PoE budget with an extra power supply. The budget updates straight away.',
            target: '#stepPower', tab: 'calc'
        },
        {
            title: 'Add your powered devices',
            text: 'Add one row per device type with its PoE class and quantity. Know the real wattage from the device datasheet? Type it in W EACH. Tip: Load Example fills in a typical meeting room.',
            target: '#stepDevices', tab: 'calc'
        },
        {
            title: 'Read the result',
            text: 'See the budget, what your devices need, and what is left over. The checks below flag missing ports, PoE++ needs, and what happens if one power supply fails. If you go over budget, the card turns white.',
            target: '#resultCard', tab: 'calc'
        },
        {
            title: 'Not sure which switch?',
            text: 'Find a Switch lists every model and power setup that can carry your load, best fit first. Use This Switch brings the choice back into the calculator.',
            target: '.tabs', tab: 'calc'
        },
        {
            title: 'Share, print, and learn more',
            text: 'Copy Link shares your exact setup with a colleague or customer. Good to know explains PoE classes, power modes, and redundancy. Spotted something missing? Request it on GitHub.',
            target: '#reference', tab: 'calc'
        }
    ];

    let index = 0;
    let spot = null;
    let lastFocus = null;
    const $ = (id) => document.getElementById(id);

    function storage(action, value) {
        try {
            if (action === 'get') return localStorage.getItem(SEEN_KEY);
            localStorage.setItem(SEEN_KEY, value);
        } catch (e) { return null; }
        return null;
    }

    function clearSpot() {
        if (spot) spot.classList.remove('guide-spot');
        spot = null;
    }

    function position(pop, el) {
        pop.classList.remove('centered');
        if (!el) { pop.classList.add('centered'); return; }
        const r = el.getBoundingClientRect();
        const pw = pop.offsetWidth, ph = pop.offsetHeight;
        const vw = window.innerWidth, vh = window.innerHeight;
        const gap = 16;
        let top, left;
        if (vw >= 900 && r.right + gap + pw < vw) { left = r.right + gap; top = Math.max(gap, Math.min(r.top, vh - ph - gap)); }
        else if (vw >= 900 && r.left - gap - pw > 0) { left = r.left - gap - pw; top = Math.max(gap, Math.min(r.top, vh - ph - gap)); }
        else if (r.bottom + gap + ph < vh) { top = r.bottom + gap; left = Math.max(gap, Math.min(r.left, vw - pw - gap)); }
        else if (r.top - gap - ph > 0) { top = r.top - gap - ph; left = Math.max(gap, Math.min(r.left, vw - pw - gap)); }
        else { top = vh - ph - gap; left = (vw - pw) / 2; }
        pop.style.top = `${top}px`;
        pop.style.left = `${left}px`;
    }

    function show(i) {
        index = Math.max(0, Math.min(STEPS.length - 1, i));
        const step = STEPS[index];
        if (step.tab && window.PoECalc) window.PoECalc.selectTab(step.tab);
        clearSpot();

        const pop = $('guidePop');
        $('guideStep').textContent = `STEP ${index + 1} OF ${STEPS.length}`;
        $('guideTitle').textContent = step.title;
        $('guideText').textContent = step.text;
        $('guideBack').hidden = index === 0;
        $('guideNext').textContent = index === 0 ? 'Start Tour' : index === STEPS.length - 1 ? 'Finish' : 'Next';
        $('guideSkip').textContent = index === STEPS.length - 1 ? 'Close' : 'Skip Tour';

        const el = step.target ? document.querySelector(step.target) : null;
        $('guideBackdrop').hidden = false;
        $('guideBackdrop').style.background = el ? 'transparent' : 'rgba(16, 21, 32, 0.78)';
        pop.hidden = false;

        if (el) {
            spot = el;
            el.classList.add('guide-spot');
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
            setTimeout(() => position(pop, el), smooth ? 350 : 0);
        } else {
            position(pop, null);
        }
        $('guideNext').focus({ preventScroll: true });
    }

    function start() {
        lastFocus = document.activeElement;
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, { passive: true });
        show(0);
    }

    function end() {
        clearSpot();
        $('guidePop').hidden = true;
        $('guideBackdrop').hidden = true;
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition);
        storage('set', '1');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function reposition() {
        if (!$('guidePop').hidden) position($('guidePop'), spot);
    }

    function onKey(e) {
        if (e.key === 'Escape') end();
        else if (e.key === 'ArrowRight') show(index + 1);
        else if (e.key === 'ArrowLeft') show(index - 1);
        else if (e.key === 'Tab') {
            // keep focus inside the dialog
            const items = [...$('guidePop').querySelectorAll('button:not([hidden])')];
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('startGuide').addEventListener('click', start);
        $('guideNext').addEventListener('click', () => (index === STEPS.length - 1 ? end() : show(index + 1)));
        $('guideBack').addEventListener('click', () => show(index - 1));
        $('guideSkip').addEventListener('click', end);
        $('guideBackdrop').addEventListener('click', end);

        // First visit only, and not when opening a shared link (the visitor wants to see that setup)
        if (!storage('get') && !OPENED_SHARED_LINK) setTimeout(start, 400);
    });
})();
