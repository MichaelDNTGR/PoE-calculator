// Function to update switch selection dropdown based on the selected switch family and redundancy options
function updateDropdownOptions() {
    const m4350Family = document.getElementById('m4350Family').checked;
    const m4250Family = document.getElementById('m4250Family').checked;
    const psuRedundancy = document.getElementById('psuRedundancy');
    const noPsuRedundancy = document.getElementById('noPsuRedundancy');
    
    // Clear current options except for the default and custom
    const switchSelection = document.getElementById('switchSelection');
    Array.from(switchSelection.options).forEach(option => {
        if (option.value !== "default" && option.value !== "custom") {
            option.remove();
        }
    });

    // Enable PSU redundancy checkboxes based on family selection
    psuRedundancy.disabled = !m4350Family;
    noPsuRedundancy.disabled = !m4350Family;

    // Populate the dropdown based on selected options
    if (m4350Family) {
        switchSelection.options[switchSelection.options.length] = new Option('M4350-10G2F-PoE+ (125W)', 'M4350-10G2F-PoE+ (125W)');
        // ... Add other M4350 options here ...
        
        if (psuRedundancy.checked) {
            switchSelection.options[switchSelection.options.length] = new Option('Redundant - M4350-10G2F-PoE+ (125W)', 'M4350-10G2F-PoE+ (125W)');
        } else if (noPsuRedundancy.checked) {
            // ... Add options without PSU redundancy ...
        }
    } else if (m4250Family) {
        switchSelection.options[switchSelection.options.length] = new Option('M4250-10G2F-PoE+ (125W)', 'M4250-10G2F-PoE+ (125W)');
        // ... Add other M4250 options here ...
    }
    
    // Reset redundancy checkboxes if no family is selected
    if (!m4350Family && !m4250Family) {
        psuRedundancy.checked = false;
        noPsuRedundancy.checked = false;
        psuRedundancy.disabled = true;
        noPsuRedundancy.disabled = true;
    }
}

// Function to handle switch selection change
function switchChanged() {
    const switchSelection = document.getElementById('switchSelection');
    const customBudgetField = document.getElementById('customBudgetField');

    if (switchSelection.value === 'custom') {
        customBudgetField.style.display = 'block';
    } else {
        customBudgetField.style.display = 'none';
    }

    calculateLeftoverBudget();
}

// Function to retrieve the selected switch's budget
function getSelectedSwitchBudget() {
    const switchSelection = document.getElementById('switchSelection');
    if (switchSelection.value !== 'custom') {
        return parseInt(switchSelection.value.split(" (")[1].split("W")[0]);
    } else {
        return parseInt(document.getElementById('customBudget').value) || 0;
    }
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