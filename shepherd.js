document.addEventListener('DOMContentLoaded', function () {
    // Check if the user has already seen the tour
    const hasSeenTour = Cookies.get('seenTour');

    // If the user has not seen the tour, start it
    if (!hasSeenTour) {
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'shepherd-theme-arrows',
                scrollTo: true,
                cancelIcon: {
                    enabled: true
                }
            },
        });

        tour.addStep({
            id: 'step1',
            text: 'Welcome to the PoE Calculator tutorial! This tutorial will guide you through the usage of this tool. You can skip the tutorial anytime, by pressing the "x".',
            attachTo: {
                element: '.containerall',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Skip',
                    action: tour.cancel,
                },
                {
                    text: 'Next',
                    action: tour.next,
                },
            ],
        });

        tour.addStep({
            id: 'step2',
            text: 'To get started, select a switch from the dropdown, or, select custom, and fill in the Wattage in the newly available field.',
            attachTo: {
                element: '#switchSelection',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Next',
                    action: tour.next,
                },
            ],
        });

        tour.addStep({
            id: 'step3',
            text: 'Now, enter the number of devices for each PoE class in the respective input fields.',
            attachTo: {
                element: '.classInputs',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Next',
                    action: tour.next,
                },
            ],
        });

        tour.addStep({
            id: 'step4',
            text: 'The calculator will dynamically compute the leftover budget after considering the power consumption of the devices.',
            attachTo: {
                element: '#leftoverBudget',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Next',
                    action: tour.next,
                },
            ],
        });

        tour.addStep({
            id: 'step5',
            text: 'You can view the PoE power allocation table to understand the power limits and standards for each class.',
            attachTo: {
                element: '#allocationTable',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Next',
                    action: tour.next,
                },
            ],
        });

        tour.addStep({
            id: 'step6',
            text: 'Toggle the power management modes table to learn about static and dynamic power management modes.',
            attachTo: {
                element: '#powerManagementMode',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Next',
                    action: tour.next,
                },
            ],
        });

        tour.addStep({
            id: 'step7',
            text: 'If something is missing, log a feature request 😁😁.',
            attachTo: {
                element: '#featureRequest',
                on: 'bottom',
            },
            buttons: [
                {
                    text: 'Finish',
                    action: tour.complete,
                },
            ],
        });

        // When the tour is completed, set a cookie to indicate that the user has seen it
        tour.on('complete', function () {
            Cookies.set('seenTour', true, { expires: 365 }); // Cookie expires after 1 year
        });

        // Start the tour
        tour.start();
    }
});