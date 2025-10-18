// M4350 switch configurations with their internal PSU wattage
const m4350Switches = {
    'M4350-24G4XF': { internalPSU: 880, slots: 1, poe: true },
    'M4350-48G4XF': { internalPSU: 550, slots: 2, poe: true },
    'M4350-8M2V': { internalPSU: 254, slots: 2, poe: true },
    'M4350-24M4X4V': { internalPSU: 800, slots: 2, poe: true },
    'M4350-44M4X4V': { internalPSU: 550, slots: 2, poe: true },
    'M4350-24F4X': { internalPSU: 240, slots: 1, poe: false },
    'M4350-24X4V': { internalPSU: 880, slots: 1, poe: true },
    'M4350-24F4V': { internalPSU: 240, slots: 1, poe: false },
    'M4350-36X4V': { internalPSU: 750, slots: 1, poe: true },
    'M4350-24X8F8V': { internalPSU: 750, slots: 1, poe: true },
    'M4350-32F8V': { internalPSU: 420, slots: 1, poe: false },
    'M4350-16V4C': { internalPSU: 420, slots: 1, poe: false },
    'M4350-40X4C': { internalPSU: 750, slots: 1, poe: true },
    'M4350-40F4C': { internalPSU: 420, slots: 1, poe: false }
};

// Available PSU modules for each switch model
const availablePSUs = {
    'M4350-24G4XF': ['APS350W-100NES/AJS', 'APS600W-200NES/AJS', 'APS920W-100NES/AJS', 'APS2000W-100NES/AJS'],
    'M4350-48G4XF': ['APS350W-100NES/AJS', 'APS600W-200NES/AJS', 'APS920W-100NES/AJS', 'APS2000W-100NES/AJS'],
    'M4350-8M2V': ['APS254W-10000S'],
    'M4350-24M4X4V': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-44M4X4V': ['APS350W-100NES/AJS', 'APS600W-200NES/AJS', 'APS920W-100NES/AJS', 'APS2000W-100NES/AJS'],
    'M4350-24F4X': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-24X4V': ['APS350W-100NES/AJS', 'APS600W-200NES/AJS', 'APS920W-100NES/AJS', 'APS2000W-100NES/AJS'],
    'M4350-24F4V': ['APS350W-100NES/AJS', 'APS600W-200NES/AJS', 'APS920W-100NES/AJS', 'APS2000W-100NES/AJS'],
    'M4350-36X4V': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-24X8F8V': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-32F8V': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-16V4C': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-40X4C': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS'],
    'M4350-40F4C': ['APS600W-300NES/AJS', 'APS1200W-200NES/AJS', 'APS2000W-200NES/AJS']
};

// PSU wattage values (nominal)
const psuWattages = {
    'APS254W-10000S': 254,
    'APS350W-100NES/AJS': 350,
    'APS600W-200NES/AJS': 600,
    'APS600W-300NES/AJS': 600,
    'APS920W-100NES/AJS': 920,
    'APS1200W-200NES/AJS': 1200,
    'APS2000W-100NES/AJS': 2000,
    'APS2000W-200NES/AJS': 2000
};

// M4350 PoE budget lookup table based on configuration
const m4350PoEBudgets = {
    'M4350-24G4XF': {
        'connected-disconnected-disconnected': 648,
        'connected-APS350W-100NES/AJS-disconnected': 720,
        'disconnected-APS350W-100NES/AJS-disconnected': 218,
        'connected-APS600W-200NES/AJS-disconnected': 720,
        'disconnected-APS600W-200NES/AJS-disconnected': 468,
        'connected-APS920W-100NES/AJS-disconnected': 720,
        'connected-APS2000W-100NES/AJS-disconnected': 720
    },
    'M4350-48G4XF': {
        'connected-disconnected-disconnected': 236,
        'connected-APS600W-200NES/AJS-disconnected': 636,
        'connected-APS600W-200NES/AJS-APS600W-200NES/AJS': 1116,
        'connected-APS920W-100NES/AJS-APS920W-100NES/AJS': 1440,
        'connected-APS2000W-100NES/AJS-APS2000W-100NES/AJS': 1440
    },
    'M4350-8M2V': {
        'connected-disconnected-disconnected': 119,
        'connected-APS254W-10000S-disconnected': 322,
        'connected-APS254W-10000S-APS254W-10000S': 551
    },
    'M4350-24M4X4V': {
        'connected-disconnected-disconnected': 522,
        'connected-APS600W-300NES/AJS-disconnected': 852,
        'connected-APS1200W-200NES/AJS-disconnected': 1172,
        'connected-APS1200W-200NES/AJS-APS1200W-200NES/AJS': 1972,
        'connected-APS2000W-200NES/AJS-APS2000W-200NES/AJS': 2520
    },
    'M4350-44M4X4V': {
        'connected-disconnected-disconnected': 194,
        'connected-APS600W-200NES/AJS-disconnected': 594,
        'connected-APS920W-100NES/AJS-APS920W-100NES/AJS': 1586,
        'connected-APS2000W-100NES/AJS-APS2000W-100NES/AJS': 3314
    },
    'M4350-24F4X': { 'connected-disconnected-disconnected': 0 },
    'M4350-24X4V': {
        'connected-disconnected-disconnected': 576,
        'connected-APS600W-200NES/AJS-disconnected': 720
    },
    'M4350-24F4V': { 'connected-disconnected-disconnected': 0 },
    'M4350-36X4V': {
        'connected-disconnected-disconnected': 280,
        'connected-APS600W-300NES/AJS-disconnected': 640,
        'connected-APS2000W-200NES/AJS-disconnected': 1760
    },
    'M4350-24X8F8V': {
        'connected-disconnected-disconnected': 290,
        'connected-APS600W-300NES/AJS-disconnected': 650,
        'connected-APS2000W-200NES/AJS-disconnected': 1770
    },
    'M4350-32F8V': { 'connected-disconnected-disconnected': 0 },
    'M4350-16V4C': { 'connected-disconnected-disconnected': 0 },
    'M4350-40X4C': {
        'connected-disconnected-disconnected': 196,
        'connected-APS600W-300NES/AJS-disconnected': 556,
        'connected-APS2000W-200NES/AJS-disconnected': 1676
    },
    'M4350-40F4C': { 'connected-disconnected-disconnected': 0 }
};


// Function to handle switch selection change
function switchChanged() {
    const switchSelection = document.getElementById('switchSelection');
    const customBudgetField = document.getElementById('customBudgetField');
    const m4350PsuConfig = document.getElementById('m4350PsuConfig');
    const selectedSwitch = switchSelection.value;

    // Check if it's a M4350 switch
    if (m4350Switches[selectedSwitch]) {
        // Show M4350 PSU configuration
        m4350PsuConfig.style.display = 'block';
        customBudgetField.style.display = 'none';
        
        // Setup PSU dropdowns
        setupM4350PsuDropdowns(selectedSwitch);
    } else if (selectedSwitch === 'custom') {
        customBudgetField.style.display = 'block';
        m4350PsuConfig.style.display = 'none';
    } else {
        customBudgetField.style.display = 'none';
        m4350PsuConfig.style.display = 'none';
    }

    calculateLeftoverBudget();
}

// Function to setup M4350 PSU dropdowns based on switch model
function setupM4350PsuDropdowns(switchModel) {
    const config = m4350Switches[switchModel];
    const psuSlot1 = document.getElementById('psuSlot1');
    const psuSlot2 = document.getElementById('psuSlot2');
    const psuSlot2Row = document.getElementById('psuSlot2Row');
    
    // Clear existing options
    psuSlot1.innerHTML = '<option value="disconnected">Disconnected</option>';
    psuSlot2.innerHTML = '<option value="disconnected">Disconnected</option>';
    
    // Add available PSUs for this switch model
    const psus = availablePSUs[switchModel];
    psus.forEach(psu => {
        const option1 = document.createElement('option');
        option1.value = psu;
        option1.textContent = psu;
        psuSlot1.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = psu;
        option2.textContent = psu;
        psuSlot2.appendChild(option2);
    });
    
    // Show/hide slot 2 based on configuration
    if (config.slots >= 2) {
        psuSlot2Row.style.display = 'flex';
    } else {
        psuSlot2Row.style.display = 'none';
    }
}

// Function to retrieve the selected switch's budget
function getSelectedSwitchBudget() {
    const switchSelection = document.getElementById('switchSelection');
    const selectedValue = switchSelection.value;
    
    // Check if it's a M4350 switch
    if (m4350Switches[selectedValue]) {
        return getM4350PoEBudget(selectedValue);
    } else if (selectedValue !== 'custom' && selectedValue !== 'default') {
        // M4250 switches - extract wattage from value
        return parseInt(selectedValue.split(" (")[1].split("W")[0]);
    } else if (selectedValue === 'custom') {
        return parseInt(document.getElementById('customBudget').value) || 0;
    }
    
    return 0;
}

// Function to get M4350 PoE budget based on PSU configuration
function getM4350PoEBudget(switchModel) {
    const internalPsuConnected = document.getElementById('internalPsuConnected').value;
    const psuSlot1 = document.getElementById('psuSlot1').value;
    const psuSlot2 = document.getElementById('psuSlot2').value;
    
    // Create configuration key
    const configKey = `${internalPsuConnected}-${psuSlot1}-${psuSlot2}`;
    
    // Look up in the PoE budget table
    if (m4350PoEBudgets[switchModel] && m4350PoEBudgets[switchModel][configKey]) {
        return m4350PoEBudgets[switchModel][configKey];
    }
    
    // If not found in table, calculate estimate (fallback)
    let totalBudget = 0;
    
    if (internalPsuConnected === 'connected') {
        totalBudget += m4350Switches[switchModel].internalPSU;
    }
    
    if (psuSlot1 !== 'disconnected' && psuWattages[psuSlot1]) {
        totalBudget += psuWattages[psuSlot1];
    }
    
    if (psuSlot2 !== 'disconnected' && psuWattages[psuSlot2]) {
        totalBudget += psuWattages[psuSlot2];
    }
    
    // Apply a conservative efficiency factor (80%)
    return Math.floor(totalBudget * 0.8);
}

// Function to get power based on PoE class
async function getPower(className) {
    switch (className) {
        case 'class0':
            return 15.4;
        case 'class1':
            return 4;
        case 'class2':
            return 7;
        case 'class3':
            return 15.4;
        case 'class4':
            return 30;
        case 'class5':
            return 45;
        case 'class6':
            return 60;
        case 'class7':
            return 75;
        case 'class8':
            return 90;
        default:
            return 0;
    }
}

// Update the calculateLeftoverBudget function to consider the selected switch's budget
async function calculateLeftoverBudget() {
    // Get values of each PoE class input
    const classInputs = document.querySelectorAll('.class-input');
    let totalPower = 0;
    for (let i = 0; i < classInputs.length; i++) {
        totalPower += parseInt(classInputs[i].value) * await getPower(classInputs[i].id);
    }

    // Subtract total power from total budget (considering the selected switch's budget) to get leftover budget
    const totalBudget = getSelectedSwitchBudget();
    const leftoverBudget = totalBudget - totalPower;

    // Update the leftover budget field
    document.getElementById('leftoverBudget').value = leftoverBudget;
}