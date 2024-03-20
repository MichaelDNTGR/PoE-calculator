function updateDropdownOptions() {
    const m4350Family = document.getElementById('m4350Family').checked;
    const m4250Family = document.getElementById('m4250Family').checked;
    const psuRedundancy = document.getElementById('psuRedundancy').checked;
    const switchSelection = document.getElementById('switchSelection');

    // Clear current options except for the default and custom
    for (let i = switchSelection.options.length - 1; i >= 0; i--) {
        if (switchSelection.options[i].value !== "default" && switchSelection.options[i].value !== "custom") {
            switchSelection.remove(i);
        }
    }

    if (m4350Family) {
        if (psuRedundancy) {
            // Add M4350 options with PSU redundancy here
            switchSelection.options[switchSelection.options.length] = new Option('PSURED-M4350-10G2F-PoE+ + APS1200 (125W)', 'PSURED-M4350-10G2F-PoE+ + APS1200 (125W)');
            // More M4350 options with redundancy can be added here
        } else {
            // Add M4350 options without PSU redundancy here
            switchSelection.options[switchSelection.options.length] = new Option('M4350-10G2F-PoE+ (125W)', 'M4350-10G2F-PoE+ (125W)');
            // More M4350 options without redundancy can be added here
        }
    } else if (m4250Family) {
        // Add M4250 options here since PSU redundancy is not applicable
        switchSelection.options[switchSelection.options.length] = new Option('M4250-50G2F-PoE+ (125W)', 'M4250-50G2F-PoE+ (125W)');
        switchSelection.options[switchSelection.options.length] = new Option('M4250-100G2F-PoE+ (125W)', 'M4250-100G2F-PoE+ (125W)');
        // More M4250 options can be added here
    }
    
    calculateLeftoverBudget(); // Recalculate budget whenever the dropdown options update
}



// Function to toggle redundancy options based on M4350/M4250 family selection
function toggleRedundancyOptions(isChecked, family) {
    const redundancyOptions = document.getElementById('psuRedundancyOptions');
    const psuRedundancyCheckbox = document.getElementById('psuRedundancy');

    // Show or hide the redundancy options based on M4350 family checkbox
    if (isChecked && family === 'm4350') {
        redundancyOptions.style.display = 'block';
        psuRedundancyCheckbox.disabled = false; // Ensure the checkbox is enabled
    } else {
        redundancyOptions.style.display = 'none';
        psuRedundancyCheckbox.checked = false; // Uncheck and disable the checkbox when M4250 is selected or when none is selected
        psuRedundancyCheckbox.disabled = true;
    }

    // Make sure the M4250 family checkbox is unchecked when M4350 is checked and vice versa
    if (family === 'm4350') {
        document.getElementById('m4250Family').checked = false;
        psuRedundancyCheckbox.disabled = false; // Re-enable the checkbox when M4350 is selected
    } else if (family === 'm4250') {
        document.getElementById('m4350Family').checked = false;
        psuRedundancyCheckbox.disabled = true; // Disable the checkbox when M4250 is selected
    }

    updateDropdownOptions(); // Update the dropdown options based on the selection
}



// Function to retrieve the selected switch's budget
function getSelectedSwitchBudget() {
    const switchSelection = document.getElementById('switchSelection');
    const selectedValue = switchSelection.value;

    // The regular expression matches strings like "Model (WattageW)" and captures the wattage value
    const wattageRegex = /\((\d+)W\)/;

    // Check if the selected value is not 'custom' and contains a wattage value
    if (selectedValue !== 'custom' && wattageRegex.test(selectedValue)) {
        const match = selectedValue.match(wattageRegex);
        return parseInt(match[1], 10); // Convert the captured wattage value to an integer
    } else if (selectedValue === 'custom') {
        return parseInt(document.getElementById('customBudget').value, 10) || 0;
    }
    return 0; // Return 0 if there's no match or 'custom' is not selected
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

    // Get the total budget from the selected switch's option
    let totalBudget = getSelectedSwitchBudget();

    // Check if the totalBudget is a number before attempting to subtract
    if (typeof totalBudget === 'number' && !isNaN(totalBudget)) {
        const leftoverBudget = totalBudget - totalPower;
        document.getElementById('leftoverBudget').value = leftoverBudget;
    } else {
        // If there's an error or the totalBudget is not a number, log it and reset the leftover budget to a safe value
        console.error("Error: Total budget is not a number.");
        document.getElementById('leftoverBudget').value = 'N/A';
    }
}

// Function to show or hide the custom PoE budget field based on selection
function toggleCustomBudgetField() {
    const switchSelection = document.getElementById('switchSelection');
    const customBudgetField = document.getElementById('customBudgetField');
    if (switchSelection.value === 'custom') {
        customBudgetField.style.display = 'block';
    } else {
        customBudgetField.style.display = 'none';
        calculateLeftoverBudget();
    }
}

// Call updateDropdownOptions when the script loads to initialize the dropdown
document.addEventListener('DOMContentLoaded', function() {
    updateDropdownOptions();
    toggleCustomBudgetField(); // Check if custom option is selected initially
});

// Add event listener for switch selection change
document.getElementById('switchSelection').addEventListener('change', function() {
    toggleCustomBudgetField();
});

// Add event listener for custom budget input change
document.getElementById('customBudget').addEventListener('input', function() {
    calculateLeftoverBudget();
});