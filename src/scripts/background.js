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
            let results = [];
            let attachmentsToScan = [];

            // Check attachment hashes
            updateStatus("checking");
            for (let attachment of attachments) {
                const result = await hashAndCheckWithVirusTotal(message, attachment, apiKey);
                if (result.alreadyScanned) {
                    results.push(result);
                } else {
                    attachmentsToScan.push(attachment);
                }
            }

            // Upload the attachments that have not been scanned before and store the analysis IDs
            updateStatus("uploading")
            let analysisIds = [];
            for (let attachment of attachmentsToScan) {
                const analysisId = await uploadAndScanWithVirusTotal(message, attachment, apiKey);
                analysisIds.push(analysisId);
            }

            // Poll each analysis ID
            updateStatus("polling");
            for (let analysisId of analysisIds) {
                const result = await pollVirusTotalResult(analysisId, apiKey);
                results.push(result);
            }

            showResults(results);
        }
    }
}

async function hashAndCheckWithVirusTotal(message, attachment, apiKey) {
    let hashHex = await calculateAttachmentHash(message, attachment);
    const report = await queryVirusTotal(hashHex, apiKey);
    if (report)
        return {
            filename: attachment.name,
            stats: report,
            alreadyScanned: true
        };
    else
        return {
            alreadyScanned: false
        };
}

async function calculateAttachmentHash(message, attachment) {
    let attachmentBlob = await messenger.messages.getAttachmentFile(message.id, attachment.partName);
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(attachmentBlob);
    const arrayBuffer = await new Promise((resolve) => {
        fileReader.onload = () => {
            resolve(fileReader.result);
        };
    });
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // Convert bytes to hex string
}

async function queryVirusTotal(hash, apiKey) {
    const response = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
        method: 'GET',
        headers: {
            'x-apikey': apiKey
        }
    });
    if (response.ok) {
        const data = await response.json();
        return data.data.attributes.last_analysis_stats; // Return the analysis stats
    } else if (response.status === 404) {
        return null; // If the file has not been scanned before, return null
    } else {
        throw new Error(`Error: ${response.status}`);
    }
}

async function uploadAndScanWithVirusTotal(message, attachment, apiKey) {
    const apiUrl = "https://www.virustotal.com/api/v3/files";

    // Download the attachment
    let attachmentBlob = await messenger.messages.getAttachmentFile(message.id, attachment.partName);
    let formData = new FormData();
    formData.append("file", attachmentBlob);

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
    return data.data.id;
}

async function pollVirusTotalResult(analysisId, apiKey) {
    let { retries } = await browser.storage.local.get("retries");
    let delayBetweenRetries = await browser.storage.local.get("delay");

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


    while (retries > 0) {
        try {
            return await performPolling(analysisId, apiKey);
        } catch (error) {
            retries--;
            if (retries === 0) {
                updateStatus("warning");
            }
            await delay(delayBetweenRetries.delay);
        }
    }
}
async function performPolling(analysisId, apiKey) {
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

    results.forEach(function (result, _) {
        if (result.result !== undefined) {
            if (result.stats.malicious > 0 || result.stats.suspicious > 0){
                foundMalicious = true;
                updateStatus("danger");
            }
        }
    })

    if (!foundMalicious){
        updateStatus("safe");
    }
}

async function updateStatus(status){
    await browser.storage.local.set({currentStatus: status});
    await browser.storage.local.set({shouldUpdateBanner: "true"});
}
