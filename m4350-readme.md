# M4350 Quick Reference Guide

## Key Features Added

### 1. Switch Selection Enhancement
```
M4250 Series (Fixed PSU) ← Existing switches
├── M4250-10G2F-PoE+ (125W)
├── M4250-10G2XF-PoE+ (240W)
└── ... [all existing M4250 models]

M4350 Series (Modular PSU) ← NEW!
├── M4350-24G4XF (GSM4328)
├── M4350-48G4XF (GSM4352)
├── M4350-8M2V (MSM4310)
└── ... [14 M4350 models total]
```

### 2. Dynamic PSU Configuration UI

When M4350 is selected, the interface displays:

```
┌─────────────────────────────────────────┐
│ M4350 Modular PSU Configuration         │
├─────────────────────────────────────────┤
│ Internal PSU: [Connected ▼]             │
│ PSU Slot 1:   [Disconnected ▼]          │
│ PSU Slot 2:   [Disconnected ▼]  (if available)
└─────────────────────────────────────────┘
```

### 3. PSU Module Options by Switch Type

#### GSM/MSM Series Switches
- GSM4328 (M4350-24G4XF)
- GSM4352 (M4350-48G4XF)
- MSM4310 (M4350-8M2V) - APS254W only
- MSM4332 (M4350-24M4X4V)
- MSM4352 (M4350-44M4X4V)
- MSM4328F (M4350-24F4X)

**Available PSUs:**
- APS350W
- APS600Wv2
- APS920W
- APS2000W (110VAC or 220VAC)

#### XSM/VSM Series Switches
- XSM4328CV (M4350-24X4V)
- XSM4328FV (M4350-24F4V)
- XSM4340CV (M4350-36X4V)
- XSM4340V (M4350-24X8F8V)
- XSM4340FV (M4350-32F8V)
- VSM4320C (M4350-16V4C)
- XSM4344C (M4350-40X4C)
- XSM4344FC (M4350-40F4C)

**Available PSUs:**
- APS600Wv3
- APS1200Wv2 (110VAC or 220VAC)
- APS2000Wv2 (110VAC or 220VAC)

## Configuration Examples

### Example 1: M4350-48G4XF with Dual PSUs
```
Switch: M4350-48G4XF (GSM4352)
Internal PSU: Connected (550W)
PSU Slot 1: APS920W
PSU Slot 2: APS920W
─────────────────────────────
Available PoE Budget: 1440W
```

### Example 2: M4350-24M4X4V with Single External PSU
```
Switch: M4350-24M4X4V (MSM4332)
Internal PSU: Connected (800W)
PSU Slot 1: APS2000Wv2 220VAC
PSU Slot 2: Disconnected
─────────────────────────────
Available PoE Budget: 1972W
```

### Example 3: M4350-24G4XF with Internal PSU Only
```
Switch: M4350-24G4XF (GSM4328)
Internal PSU: Connected (880W)
PSU Slot 1: Disconnected
PSU Slot 2: N/A (not available)
─────────────────────────────
Available PoE Budget: 648W
```

## PoE Budget Calculation Logic

### For M4350 Switches:
1. **Check configuration**: Internal PSU + Slot 1 + Slot 2 status
2. **Lookup exact value**: Use datasheet-based lookup table
3. **Calculate devices**: Subtract device power consumption
4. **Display result**: Show available leftover budget

### Configuration String Format:
```
{internal_status}-{slot1_psu}-{slot2_psu}

Examples:
- "connected-disconnected-disconnected"
- "connected-APS920W-APS920W"
- "disconnected-APS2000Wv2 220VAC-disconnected"
```

## PSU Power Ratings

| PSU Module          | PoE Power Output |
|---------------------|------------------|
| APS254W             | 119W            |
| APS350W             | 218W            |
| APS600Wv2           | 468W            |
| APS600Wv3           | 360W            |
| APS920W             | 720W            |
| APS1200Wv2 110VAC   | 800W            |
| APS1200Wv2 220VAC   | 960W            |
| APS2000W 110VAC     | 720W            |
| APS2000W 220VAC     | 720W            |
| APS2000Wv2 110VAC   | 800W            |
| APS2000Wv2 220VAC   | 1800W           |

## Code Structure

### Main Functions Added/Modified

#### `switchChanged()`
- Detects M4350 switch selection
- Shows/hides PSU configuration UI
- Calls `setupM4350PsuDropdowns()`

#### `setupM4350PsuDropdowns(switchModel)`
- Populates PSU slot dropdowns with compatible modules
- Shows/hides Slot 2 based on switch capabilities

#### `getM4350PoEBudget(switchModel)`
- Reads current PSU configuration
- Looks up PoE budget from datasheet table
- Returns accurate available PoE wattage

#### `getSelectedSwitchBudget()`
- Routes to appropriate budget calculation
- Handles M4250, M4350, and custom configurations

### Data Structures

```javascript
// Switch definitions
m4350Switches = {
    'M4350-24G4XF': { internalPSU: 880, slots: 1 },
    // ... more switches
}

// Compatible PSUs per switch
availablePSUs = {
    'M4350-24G4XF': ['APS350W', 'APS600Wv2', ...],
    // ... more mappings
}

// Exact PoE budgets from datasheet
m4350PoEBudgets = {
    'M4350-24G4XF': {
        'connected-disconnected-disconnected': 648,
        'connected-APS350W-disconnected': 720,
        // ... all configurations
    }
}
```

## Testing Checklist

- [ ] Select each M4350 switch model
- [ ] Verify correct PSU modules appear in dropdowns
- [ ] Test internal PSU connected/disconnected toggle
- [ ] Test various PSU slot combinations
- [ ] Verify PoE budget calculations match datasheet
- [ ] Add device counts and verify leftover calculation
- [ ] Test with negative leftover (oversubscription)
- [ ] Verify PSU Slot 2 appears only when supported
- [ ] Test M4250 switches still work correctly
- [ ] Test custom budget option still works

## Troubleshooting

### PSU Slot 2 Not Showing
- Check if selected switch supports 2 PSU slots
- Only these models have 2 slots:
  - M4350-48G4XF
  - M4350-8M2V
  - M4350-24M4X4V
  - M4350-44M4X4V

### Incorrect PoE Budget
- Verify exact configuration string matches datasheet
- Check internal PSU connection status
- Confirm PSU module selections

### Budget Not Updating
- Ensure `calculateLeftoverBudget()` is called on changes
- Check browser console for JavaScript errors
- Verify all dropdowns have `onchange` event handlers

## Browser Developer Console Commands

```javascript
// Check current configuration
console.log(getSelectedSwitchBudget());

// View selected switch
console.log(document.getElementById('switchSelection').value);

// View PSU configuration
console.log({
    internal: document.getElementById('internalPsuConnected').value,
    slot1: document.getElementById('psuSlot1').value,
    slot2: document.getElementById('psuSlot2').value
});
```

---

For detailed implementation, see README.md
For issues, visit: https://github.com/MichaelDNTGR/PoE-calculator/issues