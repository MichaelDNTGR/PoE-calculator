# Changelog

## Version 3.0.0 - Redesign, full datasheet data, and switch finder (November 26, 2026)

### Added
- **Find a Switch** tab: recommends every switch and power setup that can carry a load, best fit first, with a Use This Switch button (closes GitHub issues #2 and #3).
  - Inputs: required PoE budget, PoE ports, highest per-port power, series, and "must survive a PSU failure".
  - Auto-fills from the device list and safety headroom.
- **One dropdown for all M-series switches** with budget ranges and SKU in the label (closes GitHub issue #1).
- **Missing switches**: M4250-9G1F-PoE+ (110 W), M4250-8G2XF-PoE+ (220 W), M4350-16M4V (530 W up to 1,130 W), and the M4300 PoE models (28G-PoE+, 52G-PoE+, 16X, 96X).
- **AC input voltage** (100 - 127 V / 200 - 240 V): APS2000W, APS1200Wv2, APS2000Wv2, and M4300 budgets depend on it.
- **Redundancy check**: shows the PoE budget left if any single PSU fails, per configuration.
- **Power supply recommendations**: PSU options shown as cards with the resulting budget; the smallest setup that fits (and the smallest redundant one) is recommended with one-click Apply.
- **Redundant power required** toggle: recommendations, checks, the finder, and the PDF report then require full redundancy.
- **AV / IT mode** with NETGEAR AV or NETGEAR Enterprise branding and switch portfolio, chosen in a first-visit pop-over.
- **Light and dark theme** for both modes, following the device setting until changed.
- Branded **PDF report** (Print / Save as PDF).
- **Device list** with name, PoE class, quantity, and optional measured wattage per device.
- **Checks**: PoE port count, PoE++ (802.3bt) requirement, per-port limit, headroom, and redundancy.
- **Safety headroom** setting (default 10 %).
- **Copy Link** to share an exact setup, and a print stylesheet.
- New first-time **guided tour** (no external library, stored in localStorage instead of a cookie), restartable with Take the Tour.
- Load Example button with a typical meeting room setup.

### Changed
- Redesigned in the NETGEAR AV brand: Outfit typeface, AV green on Gray 7, official NETGEAR AV logo and icons.
- All PoE budgets now come straight from the datasheet tables in `data.js`. The previous 80 % estimate for unknown combinations is gone: only published combinations can be selected.
- Removed Bootstrap, Shepherd.js, and js-cookie. The site has no third-party scripts.
- Class 8 PD power corrected to 71.3 W (IEEE 802.3bt).

### Fixed
- M4350 PoE budgets that were missing or wrong. Unlisted combinations used an 80 % estimate that could overstate the budget, for example:
  - M4350-48G4XF with 1x APS920W: showed 1,176 W, datasheet says 892 W.
  - M4350-44M4X4V with 1x APS920W: showed 1,176 W, datasheet says 850 W.
  - M4350-24M4X4V: 110 V and 220 V values were mixed without saying which applied.
  - M4350-24X4V, -36X4V, -24X8F8V, -40X4C: most PSU combinations fell back to the estimate.
  - "Internal PSU disconnected" budgets were missing for most models.
- Non-PoE M4350 models (24F4X, 24F4V, 32F8V, 16V4C, 40F4C) removed from the PoE dropdown.

### Notes
- M4350-44M4X4V, internal PSU disconnected + 1x APS2000W at 220 V: the datasheet lists 1,794 W, higher than with the internal PSU connected (1,714 W). This looks like a datasheet error, so the calculator uses 1,714 W. Please confirm with product management.

## Version 2.0.0 - M4350 Series Support (October 18, 2025)

### Added
- **M4350 Switch Support**: Added 14 new M4350 series switches with modular PSU configurations
  - M4350-24G4XF (GSM4328)
  - M4350-48G4XF (GSM4352)
  - M4350-8M2V (MSM4310)
  - M4350-24M4X4V (MSM4332)
  - M4350-44M4X4V (MSM4352)
  - M4350-24F4X (MSM4328F)
  - M4350-24X4V (XSM4328CV)
  - M4350-24F4V (XSM4328FV)
  - M4350-36X4V (XSM4340CV)
  - M4350-24X8F8V (XSM4340V)
  - M4350-32F8V (XSM4340FV)
  - M4350-16V4C (VSM4320C)
  - M4350-40X4C (XSM4344C)
  - M4350-40F4C (XSM4344FC)

- **Modular PSU Configuration UI**: New interface section that appears when M4350 switches are selected
  - Internal PSU connection toggle (Connected/Disconnected)
  - PSU Slot 1 dropdown with compatible PSU modules
  - PSU Slot 2 dropdown (shown only for switches that support it)
  - Info alert explaining the configuration options

- **11 PSU Module Types**: Support for various NETGEAR PSU modules
  - APS254W (119W PoE)
  - APS350W (218W PoE)
  - APS600Wv2 (468W PoE)
  - APS600Wv3 (360W PoE)
  - APS920W (720W PoE)
  - APS1200Wv2 110VAC (800W PoE)
  - APS1200Wv2 220VAC (960W PoE)
  - APS2000W 110VAC (720W PoE)
  - APS2000W 220VAC (720W PoE)
  - APS2000Wv2 110VAC (800W PoE)
  - APS2000Wv2 220VAC (1800W PoE)

- **Accurate PoE Budget Lookup Table**: Comprehensive data structure containing exact PoE budgets from NETGEAR datasheets for all M4350 PSU configurations
  - 200+ configuration combinations
  - Values sourced from official RPS+EPS Wattages-at-a-Glance tables
  - Covers all documented PSU combinations

- **Documentation**: Three comprehensive documentation files
  - README.md: Full project documentation
  - QUICK_REFERENCE.md: Quick reference guide for developers
  - CHANGELOG.md: Version history and changes

### Changed
- **Switch Selection Dropdown**: Reorganized with optgroups
  - M4250 Series (Fixed PSU)
  - M4350 Series (Modular PSU)
  - Custom option

- **calc.js**: Major refactoring
  - Added `m4350Switches` object for switch configurations
  - Added `availablePSUs` object for PSU compatibility mapping
  - Added `psuWattages` object for PSU power ratings
  - Added `m4350PoEBudgets` lookup table with datasheet values
  - Implemented `setupM4350PsuDropdowns()` function
  - Implemented `getM4350PoEBudget()` function
  - Enhanced `switchChanged()` function to handle M4350 switches
  - Enhanced `getSelectedSwitchBudget()` to route calculations

- **index.html**: Enhanced UI structure
  - Added M4350 PSU configuration section
  - Updated "How to Use" instructions
  - Improved accessibility with clear labels

- **style.css**: Added new styles
  - M4350 PSU configuration section styling
  - Alert box styling
  - Maintained consistent design language

- **shepherd.js**: Updated tutorial
  - Modified step 2 to mention M4350 modular PSU options

### Technical Details
- Compatible PSU modules are dynamically loaded based on switch model
- PSU Slot 2 visibility is controlled based on switch capabilities
- PoE budget calculations prioritize datasheet lookup values
- Fallback calculation uses 80% efficiency estimate for unlisted configurations

### Performance
- No significant performance impact
- All calculations remain client-side
- Efficient lookup table for instant budget retrieval

### Browser Support
- Maintained compatibility with modern browsers
- No new dependencies introduced
- Uses existing Bootstrap 5.3.3 and Shepherd.js 10.0.1

---

## Version 1.0.0 - Initial Release

### Added
- M4250 series switch support with fixed PSU configurations
- PoE class calculator (Class 0-8)
- Custom PoE budget option
- Real-time leftover budget calculation
- PoE power allocation reference table
- Power management modes information
- Shepherd.js guided tour
- Responsive design with Bootstrap 5
- GitHub issue integration for feature requests

### Features
- 12 M4250 switch models with preset PoE budgets
- Support for all IEEE 802.3af/at/bt PoE classes
- Dynamic power consumption calculation
- User-friendly interface
- Educational content about PoE standards
- Mobile-responsive design

---

## Future Roadmap

### Version 2.1.0 (Planned)
- [ ] Add visual indicators for RPS vs EPS mode
- [ ] Include power redundancy calculations
- [ ] Add configuration export functionality (JSON/CSV)
- [ ] Enhanced mobile interface

### Version 3.0.0 (Planned)
- [ ] Multi-switch configurations
- [ ] Power budget planning tools
- [ ] Integration with NETGEAR Insight API
- [ ] Save/load configuration profiles
- [ ] PDF report generation

---

For the latest updates and issues, visit:
https://github.com/MichaelDNTGR/PoE-calculator

Created by Michael Dijk - AV Systems Engineer at NETGEAR