function addBanner(status){
    // create the notification element itself
    const notification = document.createElement("div");

    // create the notification text element
    const notificationText = document.createElement("div");
    notificationText.className = "verifyit_banner_text";

    // Set proper banner
    switch (status){
        case "safe":
            notification.className = "verifyit_banner banner success-banner";
            notificationText.innerText = "No viruses detected in any of the attachments!";
            break;
        case "loading":
            notification.className = "verifyit_banner banner loading-banner";
            notificationText.innerText = "Loading...";
            break;
        case "uploading":
            notification.className = "verifyit_banner banner loading-banner";
            notificationText.innerText = "Uploading attachment...";
            break;
        case "polling":
            notification.className = "verifyit_banner banner loading-banner";
            notificationText.innerText = "Polling for attachment results...";
            break;
        case "warning":
            notification.className = "verifyit_banner banner warning-banner";
            notificationText.innerText = "Error fetching analysis result: Max retries reached...";
            break;
        case "invalid-key":
            notification.className = "verifyit_banner banner warning-banner";
            notificationText.innerText = "No API key has been specified, must specify it in the preferences before using";
            break;
        case "danger":
            notification.className = "verifyit_banner banner danger-banner";
            notificationText.innerText = "One or more of the attachments appear to contain a virus, proceed with caution!";
            break;
    }

    // add text and button to the notification
    notification.appendChild(notificationText);

    // and insert it as the very first element in the message
    document.body.insertBefore(notification, document.body.firstChild);
}
const showNotification = async () => {

    let { shouldUpdateBanner } = await browser.storage.local.get("shouldUpdateBanner");
    let existingBanner = document.querySelector(".verifyit_banner");

    // Check if there is an update
    if (shouldUpdateBanner) {
        // Clear the update flag
        await browser.storage.local.remove("shouldUpdateBanner");

        // Get current status
        let { currentStatus } = await browser.storage.local.get("currentStatus");

        // Remove existing banner if it exist
        if (existingBanner)
            existingBanner.remove();

        addBanner(currentStatus);
    }
};

// Poll the browser.storage.local for changes every 500 milliseconds
setInterval(showNotification, 50);