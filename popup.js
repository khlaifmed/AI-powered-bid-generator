/**
 * popup.js: Handles popup UI logic. Sends messages, updates status. (Debug v1.5 - Read Default Bid Values)
 */
console.log("[Popup] Script loading.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Popup] DOM fully loaded and parsed.");
    // Get references
    const generateBtn = document.getElementById('generateBtn');
    const insertBtn = document.getElementById('insertBtn');
    const placeBidBtn = document.getElementById('placeBidBtn');
    const statusP = document.getElementById('status');
    const optionsLink = document.getElementById('optionsLink');
    const bidPreviewTextArea = document.getElementById('bidPreview');
    const previewContainer = document.getElementById('previewContainer'); // Get the container

    // Get references to new form fields
    const bidAmountInput = document.getElementById('bidAmount');
    const deliveryTimeInput = document.getElementById('deliveryTime');
    const upgradeSponsoredCheckbox = document.getElementById('upgradeSponsored');
    const upgradeSealedCheckbox = document.getElementById('upgradeSealed');
    const upgradeHighlightCheckbox = document.getElementById('upgradeHighlight');


    // --- SVG Icons (as strings) ---
    const icons = {
         info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
         success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
         error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>',
         warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
         loading: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="spin" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>', // Basic spinner
         apiKey: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>' // Key icon
    };

     // Add CSS for spinner animation if not already present
     // This is technically redundant if you put the @keyframes in popup.css
     // but keeping it doesn't hurt if popup.css doesn't have it.
     if (!document.getElementById('spinner-styles')) {
         const styleSheet = document.createElement("style");
         styleSheet.id = 'spinner-styles';
         styleSheet.innerText = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`;
         document.head.appendChild(styleSheet);
         console.log("[Popup] Spinner CSS added.");
     }


    /** Updates status message with icon */
    function updateStatus(message, type = 'info') {
        console.log(`[Popup] Updating status: ${message} (Type: ${type})`);
        const iconSvg = icons[type] || icons.info; // Get icon based on type

        // Ensure statusP exists before modifying
        if (statusP) {
            statusP.innerHTML = `${iconSvg}<span>${message}</span>`; // Set innerHTML to include SVG
            // Clear existing classes but preserve the base 'status-message' class if you added one
            // Assuming you are adding base class in HTML, just update type and loading classes
            statusP.classList.remove('success', 'error', 'warning', 'info', 'loading');
            statusP.classList.add(type); // Add class for styling (success, error, warning, info)

            // Add 'loading' class specifically for styling the loading state if needed
            if(type === 'loading') {
                 statusP.classList.add('loading'); // Keep this if you have specific .loading styles
            }
        } else {
            console.error("[Popup] Status paragraph element not found!");
        }
    }

     /** Toggles loading state on a button */
     function toggleButtonLoading(button, isLoading) {
         if (!button) return;
         console.log(`[Popup] toggleButtonLoading: ${isLoading ? 'enabling' : 'disabling'} loading state for button:`, button.id);
         // Using button.classList.add/remove('loading') now handles spinner/text opacity via CSS
         if (isLoading) {
             button.disabled = true;
             button.classList.add('loading');
             console.log(`[Popup] Button ${button.id} is now in loading state`);
         } else {
             button.disabled = false;
             button.classList.remove('loading');
             console.log(`[Popup] Button ${button.id} is now in normal state`);
         }
     }

    /** Handles "Generate Bid Preview" button click */
    generateBtn.addEventListener('click', async () => {
        console.log("[Popup] 'Generate Bid Preview' button clicked.");
        updateStatus('Requesting job details and generating bid...', 'loading'); // Updated status
        toggleButtonLoading(generateBtn, true); // Show loading state on button
        previewContainer.classList.remove('visible'); // Hide preview container immediately (Triggers CSS animation)

        // Short delay to allow UI update before potential blocking operations
        await new Promise(resolve => setTimeout(resolve, 50));

        // Reset state and disable insert button and new fields
        bidPreviewTextArea.value = '';
        insertBtn.disabled = true;
        // Also clear and disable new fields
        bidAmountInput.value = '';
        bidAmountInput.disabled = true;
        deliveryTimeInput.value = '';
        deliveryTimeInput.disabled = true;
        upgradeSponsoredCheckbox.checked = false;
        upgradeSponsoredCheckbox.disabled = true;
        upgradeSealedCheckbox.checked = false;
        upgradeSealedCheckbox.disabled = true;
        upgradeHighlightCheckbox.checked = false;
        upgradeHighlightCheckbox.disabled = true;
        bidPreviewTextArea.readOnly = true; // Make it read-only while waiting


        let tab;
        try {
            console.log("[Popup] Querying for active tab...");
            [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                throw new Error("Could not find active tab.");
            }
            console.log(`[Popup] Active tab found: ID=${tab.id}, URL=${tab.url}`);

            const expectedUrlPattern = "freelancer.com/projects/";
            if (!tab.url || !tab.url.includes(expectedUrlPattern)) {
                 console.warn(`[Popup] WARNING: Active tab URL (${tab.url}) does not match expected pattern (${expectedUrlPattern}).`);
                 // Update status for the user if they are on the wrong page
                  updateStatus(`Please navigate to a Freelancer project page (URL should contain '${expectedUrlPattern}').`, 'warning');
                  // Re-enable button on warning
                  toggleButtonLoading(generateBtn, false);
                  // Prevent further execution
                  return;
            }

            const actionToContent = "getJobDescription"; // Action name remains the same
            console.log(`[Popup] Sending action '${actionToContent}' to tab ${tab.id}...`);
            // Content script will now extract ALL details and send to background
            const response = await chrome.tabs.sendMessage(tab.id, { action: actionToContent });
            console.log("[Popup] sendMessage call completed.");

            if (chrome.runtime.lastError) {
                console.error("[Popup] *** chrome.runtime.lastError DETECTED after sendMessage:", chrome.runtime.lastError.message);
                 if (chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                    throw new Error(`Could not connect to page content script. \n1. Ensure you are on the correct job page (URL should contain '${expectedUrlPattern}'). \n2. REFRESH the job page (Ctrl+R or Cmd+R). \n3. Check the page's console (Inspect -> Console) for errors.`);
                 } else {
                    throw new Error(`Connection error: ${chrome.runtime.lastError.message}`);
                 }
            }
            console.log("[Popup] No chrome.runtime.lastError detected.");

            console.log("[Popup] Received response from background (via content script):", response);
            if (response) {
                // Expecting response to contain bid, bidAmount, and deliveryTime
                if (response.status === 'success' && response.bid !== undefined && response.bid !== null && response.bid.trim() !== '') {
                    updateStatus('Bid generated. Review and edit details below.', 'success'); // Updated status
                    bidPreviewTextArea.value = response.bid;
                    bidPreviewTextArea.readOnly = false; // Make editable

                    // Populate bid amount and delivery time from the response
                    // Use the extracted values if available, otherwise default to empty or a placeholder
                    bidAmountInput.value = response.bidAmount !== null && response.bidAmount !== undefined ? response.bidAmount : ''; // Use extracted value or empty
                    bidAmountInput.disabled = false;

                    deliveryTimeInput.value = response.deliveryTime !== null && response.deliveryTime !== undefined ? response.deliveryTime : ''; // Use extracted value or empty
                    deliveryTimeInput.disabled = false;

                    // Enable upgrade checkboxes (their state is not read from the page on generate)
                    upgradeSponsoredCheckbox.disabled = false;
                    upgradeSealedCheckbox.disabled = false;
                    upgradeHighlightCheckbox.disabled = false;


                    previewContainer.classList.add('visible'); // Animate container visible (Triggers CSS animation)
                    insertBtn.disabled = false; // Enable insert button
                    placeBidBtn.disabled = false; // Enable place bid button

                    console.log("[Popup] Bid and extracted details displayed in preview.");
                } else if (response.status === 'success' && (response.bid === undefined || response.bid === null || response.bid.trim() === '')) {
                     console.warn("[Popup] Received success status but no bid in response (or bid is empty).", response);
                     updateStatus('Job details extracted, but no bid was generated (empty response).', 'warning'); // Indicate partial success
                     // Still populate amount and time if available and allow manual entry
                     bidPreviewTextArea.value = ''; // Ensure it's empty
                     bidPreviewTextArea.readOnly = false; // Allow manual entry

                     bidAmountInput.value = response.bidAmount !== null && response.bidAmount !== undefined ? response.bidAmount : '';
                     bidAmountInput.disabled = false;
                     deliveryTimeInput.value = response.deliveryTime !== null && response.deliveryTime !== undefined ? response.deliveryTime : '';
                     deliveryTimeInput.disabled = false;

                     upgradeSponsoredCheckbox.disabled = false;
                     upgradeSealedCheckbox.disabled = false;
                     upgradeHighlightCheckbox.disabled = false;

                     previewContainer.classList.add('visible'); // Animate container visible
                     // The insert button might still be useful to insert manually entered text
                     insertBtn.disabled = false;
                     placeBidBtn.disabled = false; // Enable place bid button


                } else if (response.status === 'error') {
                    console.error("[Popup] Received error status from background/content:", response.message);
                    updateStatus(`Error: ${response.message}`, 'error'); // Display error message
                    // Ensure fields remain disabled on error
                     bidPreviewTextArea.readOnly = true;
                     bidAmountInput.disabled = true;
                     deliveryTimeInput.disabled = true;
                     upgradeSponsoredCheckbox.disabled = true;
                     upgradeSealedCheckbox.disabled = true;
                     upgradeHighlightCheckbox.disabled = true;
                     insertBtn.disabled = true;
                     placeBidBtn.disabled = true;

                } else {
                    console.warn("[Popup] Received unknown response structure after generation request:", response);
                    updateStatus('Received an unknown or invalid response.', 'warning');
                    // Ensure fields remain disabled on unknown response
                     bidPreviewTextArea.readOnly = true;
                     bidAmountInput.disabled = true;
                     deliveryTimeInput.disabled = true;
                     upgradeSponsoredCheckbox.disabled = true;
                     upgradeSealedCheckbox.disabled = true;
                     upgradeHighlightCheckbox.disabled = true;
                     insertBtn.disabled = true;
                     placeBidBtn.disabled = true;
                }
            } else {
                 console.warn("[Popup] Received undefined/null response after generation request.");
                 updateStatus('No valid response received.', 'warning');
                 // Ensure fields remain disabled on no response
                  bidPreviewTextArea.readOnly = true;
                  bidAmountInput.disabled = true;
                  deliveryTimeInput.disabled = true;
                  upgradeSponsoredCheckbox.disabled = true;
                  upgradeSealedCheckbox.disabled = true;
                  upgradeHighlightCheckbox.disabled = true;
                  insertBtn.disabled = true;
                  placeBidBtn.disabled = true;
            }

        } catch (error) {
            console.error("[Popup] Error in 'Generate Bid Preview' process:", error);
            updateStatus(`Error: ${error.message}`, 'error'); // Display error message
            // Ensure fields remain disabled on error
             bidPreviewTextArea.readOnly = true;
             bidAmountInput.disabled = true;
             deliveryTimeInput.disabled = true;
             upgradeSponsoredCheckbox.disabled = true;
             upgradeSealedCheckbox.disabled = true;
             upgradeHighlightCheckbox.disabled = true;
             insertBtn.disabled = true;
             placeBidBtn.disabled = true;
        } finally {
            console.log("[Popup] Re-enabling 'Generate Bid Preview' button.");
            toggleButtonLoading(generateBtn, false); // Hide loading state
        }
    });

    /** Handles "Insert Bid into Page" button click */
    insertBtn.addEventListener('click', async () => {
        console.log("[Popup] 'Insert Bid' button clicked.");
        // Get all data from popup fields
        const bidTextToInsert = bidPreviewTextArea.value.trim(); // Trim bid text
        // Get amount and time values, passing null if empty after trim
        const bidAmountValue = bidAmountInput.value.trim();
        const bidAmountToInsert = bidAmountValue === '' ? null : parseFloat(bidAmountValue);

        const deliveryTimeValue = deliveryTimeInput.value.trim();
        const deliveryTimeToInsert = deliveryTimeValue === '' ? null : parseInt(deliveryTimeValue, 10);

        const upgradesToInsert = {
            sponsored: upgradeSponsoredCheckbox.checked,
            sealed: upgradeSealedCheckbox.checked,
            highlight: upgradeHighlightCheckbox.checked,
        };

        // Validate only bidText is required for the popup to send the message
        if (!bidTextToInsert) {
            console.warn("[Popup] Bid description text is empty.");
            updateStatus('Bid description text is required to fill the form. Please generate or enter one.', 'warning');
             return; // Stop the send message if the required field is missing
        }


        updateStatus('Sending bid details to page for insertion...', 'loading');
        toggleButtonLoading(insertBtn, true); // Show loading on insert button

        // Short delay
        await new Promise(resolve => setTimeout(resolve, 50));

        let tab;
        try {
             console.log("[Popup] (Insert) Querying for active tab...");
            [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                 console.error("[Popup] (Insert) Failed to get active tab.");
                throw new Error("Could not find active tab to insert bid.");
            }
             console.log(`[Popup] (Insert) Active tab found: ID=${tab.id}, URL=${tab.url}`);

            const actionToContent = "fillBidForm";
            console.log(`[Popup] Sending action '${actionToContent}' to tab ${tab.id}...`);
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: actionToContent,
                bidData: { // Send all data as an object
                    bidText: bidTextToInsert,
                    bidAmount: bidAmountToInsert, // Will be null if input was empty
                    deliveryTime: deliveryTimeToInsert, // Will be null if input was empty
                    upgrades: upgradesToInsert
                }
            });
            console.log("[Popup] (Insert) sendMessage call completed.");

            if (chrome.runtime.lastError) {
                console.error("[Popup] *** chrome.runtime.lastError DETECTED after sendMessage (Insert):", chrome.runtime.lastError.message);
                 if (chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                    throw new Error(`Could not connect to the page content script to insert bid. Please REFRESH the job page (Ctrl+R or Cmd+R).`);
                 } else {
                    throw new Error(`Connection error during insert: ${chrome.runtime.lastError.message}`);
                 }
            }
             console.log("[Popup] (Insert) No chrome.runtime.lastError detected.");

            console.log("[Popup] Received response from content script after insertion:", response);
             if (response && response.status === 'success') {
                updateStatus('Bid form filled successfully! Review and place your bid on the page.', 'success');
                console.log("[Popup] Form filling reported successful by content script.");
                // Add a small delay before resetting button state
                setTimeout(() => {
                    toggleButtonLoading(insertBtn, false); // Return to normal state after successful insertion
                    console.log("[Popup] Insert button state reset after successful insertion");
                    
                    // Force reset as fallback
                    insertBtn.disabled = false;
                    insertBtn.classList.remove('loading');
                    console.log("[Popup] Force reset of insert button state");
                }, 100);
            } else if (response && response.status === 'error') {
                 console.error("[Popup] Form filling reported failed by content script:", response.message);
                updateStatus(`Error filling bid form: ${response.message}`, 'error');
                 toggleButtonLoading(insertBtn, false); // Re-enable on error
            } else {
                 console.warn("[Popup] Received unknown response structure after form filling request:", response);
                updateStatus('Received an unknown response after form filling request.', 'warning');
                 toggleButtonLoading(insertBtn, false); // Re-enable on unknown response
            }

        } catch (error) {
            console.error("[Popup] Error during bid form filling:", error);
            updateStatus(`${error.message}`, 'error');
            console.log("[Popup] Re-enabling 'Insert Bid' button due to error.");
            toggleButtonLoading(insertBtn, false); // Re-enable insert button on error
        } finally {
             console.log("[Popup] 'Insert Bid' process finished.");
        }
    });

    /** Handles "Place Bid" button click */
    placeBidBtn.addEventListener('click', async () => {
        console.log("[Popup] 'Place Bid' button clicked.");
        
        updateStatus('Attempting to place bid on the page...', 'loading');
        toggleButtonLoading(placeBidBtn, true); // Show loading on place bid button

        // Short delay
        await new Promise(resolve => setTimeout(resolve, 50));

        let tab;
        try {
            console.log("[Popup] (Place Bid) Querying for active tab...");
            [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                console.error("[Popup] (Place Bid) Failed to get active tab.");
                throw new Error("Could not find active tab to place bid.");
            }
            console.log(`[Popup] (Place Bid) Active tab found: ID=${tab.id}, URL=${tab.url}`);

            const actionToContent = "placeBid";
            console.log(`[Popup] Sending action '${actionToContent}' to tab ${tab.id}...`);
            const response = await chrome.tabs.sendMessage(tab.id, { action: actionToContent });
            console.log("[Popup] (Place Bid) sendMessage call completed.");

            if (chrome.runtime.lastError) {
                console.error("[Popup] *** chrome.runtime.lastError DETECTED after sendMessage (Place Bid):", chrome.runtime.lastError.message);
                if (chrome.runtime.lastError.message?.includes("Receiving end does not exist")) {
                    throw new Error(`Could not connect to the page content script to place bid. Please REFRESH the job page (Ctrl+R or Cmd+R).`);
                } else {
                    throw new Error(`Connection error during place bid: ${chrome.runtime.lastError.message}`);
                }
            }
            console.log("[Popup] (Place Bid) No chrome.runtime.lastError detected.");

            console.log("[Popup] Received response from content script after place bid attempt:", response);
            if (response && response.status === 'success') {
                updateStatus('Bid placed successfully! Check the page for confirmation.', 'success');
                console.log("[Popup] Bid placement reported successful by content script.");
                
                // Reset button state after successful bid placement
                setTimeout(() => {
                    toggleButtonLoading(placeBidBtn, false); // Return to normal state after successful placement
                    console.log("[Popup] Place bid button state reset after successful placement");
                    
                    // Force reset as fallback
                    placeBidBtn.disabled = false;
                    placeBidBtn.classList.remove('loading');
                    console.log("[Popup] Force reset of place bid button state");
                }, 100);
                
            } else if (response && response.status === 'error') {
                console.error("[Popup] Bid placement reported failed by content script:", response.message);
                updateStatus(`Error placing bid: ${response.message}`, 'error');
                toggleButtonLoading(placeBidBtn, false); // Re-enable on error
            } else {
                console.warn("[Popup] Received unknown response structure after place bid request:", response);
                updateStatus('Received an unknown response after place bid request.', 'warning');
                toggleButtonLoading(placeBidBtn, false); // Re-enable on unknown response
            }

        } catch (error) {
            console.error("[Popup] Error during bid placement:", error);
            updateStatus(`${error.message}`, 'error');
            console.log("[Popup] Re-enabling 'Place Bid' button due to error.");
            toggleButtonLoading(placeBidBtn, false); // Re-enable place bid button on error
        } finally {
            console.log("[Popup] 'Place Bid' process finished.");
        }
    });

    /** Handles "Configure API Key" link click */
    optionsLink.addEventListener('click', () => {
        console.log("[Popup] 'Configure API Key' link clicked. Opening options page.");
        chrome.runtime.openOptionsPage();
    });

    /** Checks for API key on popup open */
    function checkApiKey() {
        console.log("[Popup] Initializing: Checking for API key in storage...");
        chrome.storage.sync.get('geminiApiKey', (result) => {
            if (chrome.runtime.lastError) {
                 console.warn("[Popup] Error checking API key status on init:", chrome.runtime.lastError);
                 updateStatus('Could not check API key status.', 'warning');
                 generateBtn.disabled = true;
            } else if (!result.geminiApiKey) {
                console.log("[Popup] API key not found on init.");
                // Use API Key icon for warning, update status text
                updateStatus('API Key needed. Click "Configure API Key" below.', 'warning');
                 if (statusP) {
                     // Add the icon to the status message element
                     const iconElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                     iconElement.setAttribute("viewBox", "0 0 24 24");
                     iconElement.setAttribute("fill", "currentColor");
                     iconElement.innerHTML = '<path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>';
                     // Find the span inside statusP and prepend the icon to it
                     const statusSpan = statusP.querySelector('span');
                     if(statusSpan) {
                         statusP.insertBefore(iconElement, statusSpan);
                     } else {
                         // If for some reason there's no span, just set innerHTML directly
                         statusP.innerHTML = icons.apiKey + message; // This uses icons variable from the function scope
                     }
                 }

                generateBtn.disabled = true;
            } else {
                console.log("[Popup] API key found on init.");
                updateStatus('Ready to generate bid preview.', 'info');
                generateBtn.disabled = false;
            }
            // Ensure preview container and new fields are hidden/disabled on initial load
            if(previewContainer) previewContainer.classList.remove('visible');
             insertBtn.disabled = true;
             placeBidBtn.disabled = true;
             // Disable and clear new fields on init
             if (bidAmountInput) { bidAmountInput.disabled = true; bidAmountInput.value = ''; }
             if (deliveryTimeInput) { deliveryTimeInput.disabled = true; deliveryTimeInput.value = ''; }
             if (upgradeSponsoredCheckbox) { upgradeSponsoredCheckbox.disabled = true; upgradeSponsoredCheckbox.checked = false; }
             if (upgradeSealedCheckbox) { upgradeSealedCheckbox.disabled = true; upgradeSealedCheckbox.checked = false; }
             if (upgradeHighlightCheckbox) { upgradeHighlightCheckbox.disabled = true; upgradeHighlightCheckbox.checked = false; }
             if (bidPreviewTextArea) bidPreviewTextArea.readOnly = true;
        });
    }

    // Initial check when popup opens
    checkApiKey();

    console.log("[Popup] Script initialized and event listeners added (Enhanced UI with default read).");
});