// Function to update switch selection dropdown based on the selected switch family and redundancy options
function updateDropdownOptions() {
    const m4350Family = document.getElementById('m4350Family').checked;
    const m4250Family = document.getElementById('m4250Family').checked;
    const psuRedundancy = document.getElementById('psuRedundancy').checked;
    const noPsuRedundancy = document.getElementById('noPsuRedundancy').checked;
    const switchSelection = document.getElementById('switchSelection');

    // Clear current options except for the default and custom
    for (let i = switchSelection.options.length - 1; i >= 0; i--) {
        if (switchSelection.options[i].value !== "default" && switchSelection.options[i].value !== "custom") {
            switchSelection.remove(i);
        }
    }

    // Enable or disable PSU redundancy checkboxes based on family selection
    document.getElementById('psuRedundancy').disabled = !m4350Family;
    document.getElementById('noPsuRedundancy').disabled = !m4350Family;

    // Populate the dropdown based on selected options
    if (m4350Family) {
        if (psuRedundancy) {
            switchSelection.options[switchSelection.options.length] = new Option('M4250-10G2F-PoE+ + APS1200 (125W)', 'M4250-10G2F-PoE+ + APS1200 (125W)');
            // Add more M4350 options with redundant PSU here
        } else if (noPsuRedundancy) {
            switchSelection.options[switchSelection.options.length] = new Option('M4250-10G2F-PoE+ (125W)', 'M4250-10G2F-PoE+ (125W)');
            // Add more M4350 options without redundant PSU here
        } else {
            switchSelection.options[switchSelection.options.length] = new Option('M4250-10G2F-PoE+ + APS1200 (125W)', 'M4250-10G2F-PoE+ + APS1200 (125W)');
            switchSelection.options[switchSelection.options.length] = new Option('M4250-10G2F-PoE+ (125W)', 'M4250-10G2F-PoE+ (125W)');
            // Add more M4350 options with and without redundant PSU here
        }
        // Add any other M4350 options that do not depend on PSU redundancy here
    }
    if (m4250Family) {
        switchSelection.options[switchSelection.options.length] = new Option('M4250-10G2F-PoE+ (125W)', 'M4250-10G2F-PoE+ (125W)');
        // Add more M4250 options here
    }
    // Reset redundancy checkboxes if no family is selected
    if (!m4350Family && !m4250Family) {
        document.getElementById('psuRedundancy').checked = false;
        document.getElementById('noPsuRedundancy').checked = false;
    }
    calculateLeftoverBudget(); // Recalculate budget whenever the dropdown options update
}

// Function to toggle redundancy options based on M4350/M4250 family selection
function toggleRedundancyOptions(isChecked, family) {
    // Get the redundancy options container
    const redundancyOptions = document.getElementById('psuRedundancyOptions');
    
    // Show or hide the redundancy options based on M4350 family checkbox
    redundancyOptions.style.display = (isChecked && family === 'm4350') ? 'block' : 'none';

    // If M4250 is checked or none is checked, ensure redundancy options are hidden
    if (family === 'm4250' || (!isChecked && family === 'm4350')) {
        redundancyOptions.style.display = 'none';
        document.getElementById('psuRedundancy').checked = false;
        document.getElementById('noPsuRedundancy').checked = false;
    }

    // Make sure the M4250 family checkbox is unchecked when M4350 is checked and vice versa
    if (family === 'm4350') {
        document.getElementById('m4250Family').checked = false;
    } else if (family === 'm4250') {
        document.getElementById('m4350Family').checked = false;
        // Also, disable PSU redundancy options
        document.getElementById('psuRedundancy').disabled = true;
        document.getElementById('noPsuRedundancy').disabled = true;
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