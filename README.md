# PoE Calculator

![PoE Calculator Logo](Calculator-icon.png)

Plan the PoE budget of NETGEAR M4250, M4300 and M4350 managed switches, including modular power supplies, AC voltage, and power supply redundancy. Or let the calculator find the right switch for your devices.

## AV and IT modes

Use the **AV / IT** switch in the header:

- **AV**: NETGEAR AV branding (AV green) with the M4250 AV Line and M4350 switches.
- **IT**: NETGEAR Enterprise branding (Enterprise teal) with the M4350 and M4300 switches.

On a first visit, a pop-over asks whether the visitor is planning for AV or IT. The switch list, the switch finder, and the PDF report follow the selected mode. Link straight to a mode with `?mode=av` or `?mode=it`, for example `index.html?mode=it` (this skips the pop-over). The last used mode is remembered.

Both modes have a **light and dark theme**. The page follows the device setting until the visitor uses the Light Mode / Dark Mode button, which is remembered. The PDF report is always white.

## Features

- **Check a Switch**: choose a switch and power setup, add your devices, and see the budget, what is left, and what happens if one power supply fails.
- **Find a Switch**: enter a load (or use your device list) and get every switch and power setup that fits, best fit first.
- Every PoE budget comes from the official NETGEAR datasheets (see `data.js`).
- Power supply options shown as cards with the resulting PoE budget, plus a recommended setup (and a redundant one) for your devices. Turn on Redundant power required to only recommend setups that survive a PSU failure.
- Checks for PoE port count, PoE++ (802.3bt) needs, per-port limits, safety headroom, and redundancy.
- Share an exact setup with Copy Link, or Print / Save as PDF for a branded one-page report.
- Guided tour for first-time users (restart it any time with Take the Tour).

## Supported switches

| Series | PoE models |
|---|---|
| M4250 AV Line | 9G1F-PoE+, 8G2XF-PoE+, 10G2F-PoE+, 10G2XF-PoE+, 10G2XF-PoE++, 26G4F-PoE+, 26G4F-PoE++, 26G4XF-PoE+, 40G8F-PoE+, 40G8XF-PoE+, 40G8XF-PoE++ |
| M4350 AV and IT | 8M2V, 16M4V, 24G4XF, 48G4XF, 24M4X4V, 44M4X4V, 24X4V, 36X4V, 24X8F8V, 40X4C |
| M4300 Intelligent Edge | 28G-PoE+ (550 W and 1,000 W PSU), 52G-PoE+ (550 W and 1,000 W PSU), 16X (299 W and 600 W PSU), 96X |

For any other switch, choose "Other switch" and type its PoE budget.

## Usage

Open `index.html` in a browser, or visit the GitHub Pages site. No build step and no dependencies.

To run it locally with a web server:

```bash
python3 -m http.server 8765
```

## Updating switch data

All switch data lives in `data.js`:

- `fixedPower(budget)` for switches with one fixed PSU.
- `psuCountPower([...])` for fixed multi-PSU switches (budget per number of connected PSUs).
- `m4350Power({...})` for M4350 modular PSUs, copied row by row from the datasheet table.
- `m4300Power([...])` for M4300 PSU modes, with 110 V and 220 V budgets.

Only combinations that the datasheet publishes are offered, so the calculator never estimates.

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page layout |
| `style.css` | NETGEAR AV styling |
| `data.js` | Switch catalog, PSU configurations, and PoE classes |
| `calc.js` | Calculator, switch finder, and share link |
| `guide.js` | First-time guided tour |
| `assets/` | NETGEAR AV logo and icons |

## Feature requests

Open an issue on [GitHub](https://github.com/MichaelDNTGR/PoE-calculator/issues) and pick the Feature Request template.

## Author

Michael Dijk, AV Systems Engineer at NETGEAR.
