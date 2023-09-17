/* Initialize settings */
browser.storage.local.get("delay").then((item) => {if (Object.entries(item).length==0){browser.storage.local.set({"delay":1000})}})
browser.storage.local.get("retries").then((item) => {if (Object.entries(item).length==0){browser.storage.local.set({"retries":60})}})
browser.storage.local.get("apiKey").then((item) => {if (Object.entries(item).length==0){browser.storage.local.set({"apiKey":""})}})

/* Initialize state */
browser.storage.local.set({currentStatus: "none"});
browser.storage.local.remove("shouldUpdateBanner");

browser.messageDisplayScripts.register({
    js: [
        { file: "scripts/message-script.js" }
    ],
    css: [
        { file: "scripts/message-script.css" }
    ]
})

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
    // Get the current message ID from the message object
    let newMessageId = message.id;

    // Retrieve the previously displayed message ID from storage
    let { currentMessageId } = await browser.storage.local.get("currentMessageId");

    // Check if the current message ID is different from the previous message ID
    if (currentMessageId !== newMessageId) {
        console.log("A different message is clicked");

        // Clear status
        await browser.storage.local.set({currentStatus: "none"});
    }
});

messenger.messageDisplayAction.onClicked.addListener(async (tab) =>{
    browser.messageDisplay.getDisplayedMessage(tab.id).then(async (message) => {
        await browser.storage.local.set({currentMessageId: message.id});

        // Check current status
        let { currentStatus } = await browser.storage.local.get("currentStatus");

        newStatus = "loading"

        if (newStatus !== currentStatus) {
            updateStatus("loading");
        }

        onButtonClick(tab.id, message);
    });
});

async function onButtonClick(tabId, message) {
    const attachments = await browser.messages.listAttachments(message.id);
    let { apiKey } = await browser.storage.local.get("apiKey");

    // Scan attachments with VirusTotal
    if (apiKey === "")
        updateStatus("invalid-key")
    else {
        let results = [];
        if (attachments.length === 0) // There are no attachments
            updateStatus("no-attachments")
        else {
            for (let attachment of attachments) {
                const result = await scanWithVirusTotal(message, attachment);
                results.push(result);
            }
            showResults(results);
        }
    }
}

async function scanWithVirusTotal(message, attachment) {
    try {
        const result = await performScanAndPolling(message, attachment);
        return {
            filename: attachment.name,
            result,
        };
    } catch (error) {
        return {
            filename: attachment.name,
            error: error.message,
        };
    }
}

async function performScanAndPolling(message, attachment) {
    let { apiKey } = await browser.storage.local.get("apiKey");
    const apiUrl = "https://www.virustotal.com/api/v3/files";

    // Download the attachment
    let attachmentBlob = await messenger.messages.getAttachmentFile(message.id, attachment.partName);
    let formData = new FormData();
    formData.append("file", attachmentBlob);

    // Update status
    updateStatus("uploading")

    // Upload the attachment to VirusTotal
    response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "x-apikey": apiKey,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Error uploading to VirusTotal: ${response.statusText}`);
    }

    // Get the analysis ID
    let data = await response.json();
    const analysisId = data.data.id;

    // Update status
    updateStatus("polling");

    // Poll for the analysis result
    return await pollVirusTotalResult(analysisId);
}

async function pollVirusTotalResult(analysisId) {
    let { retries } = await browser.storage.local.get("retries");
    let delayBetweenRetries = await browser.storage.local.get("delay");

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


    while (retries > 0) {
        try {
            return await performPolling(analysisId);
        } catch (error) {
            retries--;
            console.log(retries);
            if (retries === 0) {
                updateStatus("warning");
            }
            await delay(delayBetweenRetries.delay);
        }
    }
}
async function performPolling(analysisId) {
    let { apiKey } = await browser.storage.local.get("apiKey");
    const apiUrl = `https://www.virustotal.com/api/v3/analyses/${analysisId}`;

    const response = await fetch(apiUrl, {
        headers: {
            "x-apikey": apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`Error fetching analysis result: ${response.statusText}`);
    }

    const data = await response.json();
    const status = data.data.attributes.status;

    if (status === "completed") {
        return data.data.attributes;
    } else if (status === "failed") {
        throw new Error("VirusTotal analysis failed");
    } else {
        throw new Error("Analysis status unknown");
    }
}

async function showResults(results){
    let foundMalicious = false;
    let noResults = false;

    results.forEach(function (result, _) {
        if (result.result !== undefined) {
            if (result.result.stats.malicious > 0 || result.result.stats.suspicious > 0){
                foundMalicious = true;
                updateStatus("danger")
            }
        } else {
            noResults = true;
        }
    })

    if (!foundMalicious && !noResults){
        updateStatus("safe")
    }
}

async function updateStatus(status){
    await browser.storage.local.set({currentStatus: status});
    await browser.storage.local.set({shouldUpdateBanner: "true"});
}
