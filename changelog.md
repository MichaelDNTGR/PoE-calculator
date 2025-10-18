# Changelog

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