/**
 * content.js: Injected into matching web pages. Extracts data, inserts bids, communicates. (Debug v1.6 - Attempt Default Value Timing)
 */

// Log immediately to confirm script injection and start time
const scriptStartTime = Date.now();
console.log(`[Content] Script Injected & Running at ${new Date(scriptStartTime).toISOString()}.`);

/**
 * Extracts the job description text, bid amount, and delivery time from the current web page's DOM.
 * Includes a small delay before reading input values to potentially capture dynamically set defaults.
 * Selectors updated based on provided HTML structure.
 * @returns {Promise<object | null>} A promise that resolves with an object containing the extracted data ({ description, bidAmount, deliveryTime }), or null if description extraction fails.
 */
async function extractJobDetails() { // Made async to use await
    const funcStartTime = Date.now();
    console.log(`[Content] ---> extractJobDetails function started at ${new Date(funcStartTime).toISOString()}.`);

    let titleText = '';
    let descriptionBodyText = '';
    let skillsText = '';
    let combinedDescription = '';
    let foundAnyElement = false; // Flag to check if at least title or description was found

    // --- Selectors for Description Parts (Based on provided HTML) ---
    const titleSelector = 'div.ProjectViewDetails-title[data-show-mobile="true"]';
    const descriptionSelector = 'div.ProjectDescription span.NativeElement';
    const skillsContainerSelector = 'div.ProjectViewDetailsSkills';
    const individualSkillSelector = 'fl-tag div.Content';
    // --- End Selectors for Description Parts ---

    // --- Selectors for Bid Form Fields (Verified from provided HTML) ---
    const bidTextAreaSelector = 'textarea#descriptionTextArea';
    const bidAmountInputSelector = 'input#bidAmountInput';
    const deliveryTimeInputSelector = 'input#periodInput';
    // Alternative selectors in case the primary ones don't work
    const alternativeBidAmountSelectors = [
        'input#bidAmountInput',
        'input[name="bidAmount"]',
        'input[placeholder*="bid" i]',
        'input[placeholder*="amount" i]',
        'input[type="number"]'
    ];
    const alternativeDeliveryTimeSelectors = [
        'input#periodInput',
        'input[name="deliveryTime"]',
        'input[name="period"]',
        'input[placeholder*="day" i]',
        'input[placeholder*="time" i]'
    ];
    const sponsoredCheckboxSelector = 'fl-list-item[fltrackinglabel="BidFormUpgrades.Sponsored"] input[type="checkbox"]';
    const sealedCheckboxSelector = 'fl-list-item[fltrackinglabel="BidFormUpgrades.Sealed"] input[type="checkbox"]';
    const highlightCheckboxSelector = 'fl-list-item[fltrackinglabel="BidFormUpgrades.Highlight"] input[type="checkbox"]';
    // --- End Selectors ---

    // 1. Extract Description parts
    console.log(`[Content] extractJobDetails: Attempting to find Title with selector: '${titleSelector}'`);
    try {
        const titleElement = document.querySelector(titleSelector);
        if (titleElement) {
            titleText = (titleElement.innerText || titleElement.textContent || '').trim();
            console.log(`[Content] extractJobDetails: SUCCESS - Found Title. Text length: ${titleText.length}`);
            foundAnyElement = true;
        } else {
            console.log(`[Content] extractJobDetails: Title selector '${titleSelector}' did not match. Trying desktop title...`);
            const desktopTitleSelector = 'h2.ng-star-inserted div.ProjectViewDetails-title';
            console.log(`[Content] extractJobDetails: Trying desktop title selector: '${desktopTitleSelector}'`);
            const desktopTitleElement = document.querySelector(desktopTitleSelector);
             if (desktopTitleElement) {
                titleText = (desktopTitleElement.innerText || desktopTitleElement.textContent || '').trim();
                if (titleText.toLowerCase() === 'project details') {
                    console.log(`[Content] extractJobDetails: Ignoring generic 'Project Details' title.`);
                    titleText = '';
                } else {
                    console.log(`[Content] extractJobDetails: SUCCESS - Found Desktop Title. Text length: ${titleText.length}`);
                    foundAnyElement = true;
                }
             } else {
                 console.log(`[Content] extractJobDetails: Desktop title selector '${desktopTitleSelector}' also did not match.`);
             }
        }
    } catch (e) {
        console.error(`[Content] extractJobDetails: Error querying title selector '${titleSelector}':`, e);
    }

    console.log(`[Content] extractJobDetails: Attempting to find Description Body with selector: '${descriptionSelector}'`);
     try {
        const descriptionElement = document.querySelector(descriptionSelector);
        if (descriptionElement) {
            descriptionBodyText = (descriptionElement.innerText || descriptionElement.textContent || '').trim();
            console.log(`[Content] extractJobDetails: SUCCESS - Found Description Body. Text length: ${descriptionBodyText.length}`);
            foundAnyElement = true;
        } else {
            console.log(`[Content] extractJobDetails: Description body selector '${descriptionSelector}' did not match.`);
        }
    } catch (e) {
        console.error(`[Content] extractJobDetails: Error querying description selector '${descriptionSelector}':`, e);
    }

    console.log(`[Content] extractJobDetails: Attempting to find Skills Container with selector: '${skillsContainerSelector}'`);
     try {
        const skillsContainer = document.querySelector(skillsContainerSelector);
        if (skillsContainer) {
             console.log(`[Content] extractJobDetails: SUCCESS - Found skills container. Querying individual skills with selector: '${individualSkillSelector}'`);
             const skillTags = skillsContainer.querySelectorAll(individualSkillSelector);
             console.log(`[Content] extractJobDetails: Found ${skillTags.length} potential skill tag elements.`);
             const skills = Array.from(skillTags)
                                .map(tag => (tag.innerText || tag.textContent || '').trim())
                                .filter(Boolean); // Filter out empty strings

             if (skills.length > 0) {
                skillsText = "Skills: " + skills.join(', ');
                console.log(`[Content] extractJobDetails: Extracted skills: ${skills.join(', ')}`);
                // skills don't necessarily mean the core description was found, so no need to set foundAnyElement here
             } else {
                 console.log(`[Content] extractJobDetails: Skills container found, but no skill text matched the inner selector '${individualSkillSelector}'.`);
             }
        } else {
             console.log(`[Content] extractJobDetails: Skills container selector '${skillsContainerSelector}' did not match.`);
        }
     } catch (e) {
         console.error(`[Content] extractJobDetails: Error querying skills selector '${skillsContainerSelector}' or processing skills:`, e);
     }

    // Combine the extracted description parts
    if (titleText) {
        combinedDescription += titleText + "\n\n";
    }
    if (descriptionBodyText) {
         combinedDescription += descriptionBodyText + "\n\n";
    }
     if (skillsText) {
         combinedDescription += skillsText;
    }

    combinedDescription = combinedDescription.trim();

    if (!foundAnyElement || !combinedDescription) {
        console.error("[Content] extractJobDetails: DESCRIPTION EXTRACTION FAILED. Could not extract sufficient title or description body information.");
        // We still attempt to get bid amount/time even if description extraction fails,
        // as the user might want to manually enter the description but use the page's defaults for other fields.
        // So, we don't return null yet for the whole function.
    } else {
         console.log("[Content] extractJobDetails: Description extraction successful.");
         console.log("[Content] extractJobDetails: Final Combined Description Text (first 500 chars):\n", combinedDescription.substring(0, 500) + (combinedDescription.length > 500 ? '...' : ''));
    }

    // --- Add a small delay before reading input values ---
    // This is an attempt to wait for platform scripts to set defaults.
    // Adjust the delay (in milliseconds) as needed based on observation.
    const readDelay = 200; // 200ms delay
    console.log(`[Content] extractJobDetails: Waiting for ${readDelay}ms before reading input values...`);
    await new Promise(resolve => setTimeout(resolve, readDelay));
    console.log(`[Content] extractJobDetails: Delay finished. Attempting to read input values.`);
    // --- End Delay ---


    // 2. Extract Bid Amount and Delivery Time
    let bidAmountValue = null;
    let deliveryTimeValue = null;

    // Try to find bid amount input using fallback selectors
    let bidAmountInput = null;
    let foundBidAmountSelector = null;
    for (const selector of alternativeBidAmountSelectors) {
        bidAmountInput = document.querySelector(selector);
        if (bidAmountInput) {
            foundBidAmountSelector = selector;
            console.log(`[Content] extractJobDetails: Found bid amount input with selector: '${selector}'`);
            break;
        }
    }
    
    if (bidAmountInput) {
        bidAmountValue = parseFloat(bidAmountInput.value);
        // Check if parsing resulted in NaN (e.g., field was empty or non-numeric)
        if (isNaN(bidAmountValue)) {
             bidAmountValue = null; // Treat non-numeric/empty as null
             console.warn(`[Content] extractJobDetails: Bid amount input found but value is not a valid number or is empty. Selector: '${foundBidAmountSelector}'`);
        } else {
            console.log(`[Content] extractJobDetails: Extracted bid amount: ${bidAmountValue}. Selector: '${foundBidAmountSelector}'`);
        }
    } else {
         console.warn(`[Content] extractJobDetails: Bid amount input field not found using any selector: [${alternativeBidAmountSelectors.join(', ')}]`);
    }

    // Try to find delivery time input using fallback selectors
    let deliveryTimeInput = null;
    let foundDeliveryTimeSelector = null;
    for (const selector of alternativeDeliveryTimeSelectors) {
        deliveryTimeInput = document.querySelector(selector);
        if (deliveryTimeInput) {
            foundDeliveryTimeSelector = selector;
            console.log(`[Content] extractJobDetails: Found delivery time input with selector: '${selector}'`);
            break;
        }
    }
    
    if (deliveryTimeInput) {
        deliveryTimeValue = parseInt(deliveryTimeInput.value, 10);
         // Check if parsing resulted in NaN (e.g., field was empty or non-numeric)
        if (isNaN(deliveryTimeValue)) {
             deliveryTimeValue = null; // Treat non-numeric/empty as null
             console.warn(`[Content] extractJobDetails: Delivery time input found but value is not a valid integer or is empty. Selector: '${foundDeliveryTimeSelector}'`);
        } else {
            console.log(`[Content] extractJobDetails: Extracted delivery time: ${deliveryTimeValue}. Selector: '${foundDeliveryTimeSelector}'`);
        }
    } else {
         console.warn(`[Content] extractJobDetails: Delivery time input field not found using any selector: [${alternativeDeliveryTimeSelectors.join(', ')}]`);
    }


    // Return the combined data, even if description extraction failed,
    // as amount and time might still be useful.
    const result = {
        description: combinedDescription || null, // Return null if description is empty
        bidAmount: bidAmountValue,
        deliveryTime: deliveryTimeValue
    };

    console.log(`[Content] ---< extractJobDetails function finished at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms. Result:`, result);
    return result;
}

/**
 * Tries multiple selectors to find an input element and set its value.
 * @param {Array<string>} selectors - Array of CSS selectors to try in order.
 * @param {string | number | null | undefined} value - The value to set.
 * @returns {boolean} True if successful, false otherwise.
 */
function setInputValueWithFallback(selectors, value) {
    console.log(`[Content] Attempting to set input value using selectors: [${selectors.join(', ')}] to '${value}'`);
    
    for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        console.log(`[Content] Trying selector ${i + 1}/${selectors.length}: '${selector}'`);
        
        const inputElement = document.querySelector(selector);
        if (inputElement) {
            console.log(`[Content] Found element with selector '${selector}':`, inputElement);
            return setInputValue(selector, value);
        } else {
            console.log(`[Content] Selector '${selector}' did not find any element`);
        }
    }
    
    console.warn(`[Content] None of the selectors found an element: [${selectors.join(', ')}]`);
    // Log all input elements on the page to help debug
    const allInputs = document.querySelectorAll('input');
    console.log(`[Content] Available input elements on page (${allInputs.length} total):`);
    allInputs.forEach((input, index) => {
        console.log(`[Content] Input ${index}: id="${input.id}", name="${input.name}", type="${input.type}", value="${input.value}", placeholder="${input.placeholder}"`);
    });
    return false;
}

/**
 * Sets the value of a text or number input field and dispatches necessary events.
 * Handles null/undefined/empty string by setting value to empty string.
 * @param {string} selector - The CSS selector for the input element.
 * @param {string | number | null | undefined} value - The value to set.
 * @returns {boolean} True if successful, false otherwise.
 */
function setInputValue(selector, value) {
    console.log(`[Content] Attempting to set input value for selector: '${selector}' to '${value}'`);
    const inputElement = document.querySelector(selector);
    if (inputElement) {
        try {
            // Set value to empty string if value is null, undefined, or empty string after trimming
            const valueToSet = (value === null || value === undefined || String(value).trim() === '') ? '' : value;
            console.log(`[Content] Setting value '${valueToSet}' for element:`, inputElement);
            inputElement.value = valueToSet;
            // Dispatch events to simulate user typing and trigger framework updates
            inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            inputElement.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[Content] Successfully set value '${valueToSet}' and dispatched events for selector: '${selector}'`);
            console.log(`[Content] Element value after setting: '${inputElement.value}'`);
            return true;
        } catch (e) {
            console.error(`[Content] Error setting value or dispatching events for '${selector}':`, e);
            return false;
        }
    } else {
        console.warn(`[Content] Input element not found for selector: '${selector}'`);
        return false;
    }
}

/**
 * Sets the checked state of a checkbox and dispatches necessary events.
 * @param {string} selector - The CSS selector for the checkbox element.
 * @param {boolean} checked - True to check the box, false to uncheck.
 * @returns {boolean} True if successful, false otherwise.
 */
function setCheckboxState(selector, checked) {
     console.log(`[Content] Attempting to set checkbox state for selector: '${selector}' to '${checked}'`);
    const checkboxElement = document.querySelector(selector);
    if (checkboxElement) {
        try {
            // Only change if the state is different
            if (checkboxElement.checked !== checked) {
                 checkboxElement.checked = checked;
                 // Dispatch events to simulate user interaction
                 checkboxElement.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                 checkboxElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                 console.log(`[Content] Successfully set checked state and dispatched events for selector: '${selector}'`);
            } else {
                console.log(`[Content] Checkbox for selector '${selector}' is already in the desired state (${checked}).`);
            }
            return true;
        } catch (e) {
            console.error(`[Content] Error setting checked state or dispatching events for '${selector}':`, e);
            return false;
        }
    } else {
        console.warn(`[Content] Checkbox element not found for selector: '${selector}'`);
        return false;
    }
}


/**
 * Inserts the provided bid text and fills other bid form fields on the page.
 * Uses selectors based on the provided HTML. Handles optional amount and time.
 * @param {object} bidData - An object containing bid details.
 * @param {string} bidData.bidText - The generated bid text. (Required)
 * @param {number | null | undefined} [bidData.bidAmount] - The bid amount. (Optional)
 * @param {number | null | undefined} [bidData.deliveryTime] - The delivery time in days. (Optional)
 * @param {object} [bidData.upgrades] - Object specifying upgrade selections. (Optional)
 * @param {boolean} [bidData.upgrades.sponsored] - Whether to select the Sponsored upgrade.
 * @param {boolean} [bidData.upgrades.sealed] - Whether to select the Sealed upgrade.
 * @param {boolean} [bidData.upgrades.highlight] - Whether to select the Highlight upgrade.
 * @returns {boolean} True if filling was successful, false otherwise (based on description).
 */
function fillBidForm(bidData) {
     const funcStartTime = Date.now();
    console.log(`[Content] ---> fillBidForm function started at ${new Date(funcStartTime).toISOString()}.`);
    console.log("[Content] fillBidForm received data:", bidData);

    let success = true; // Track overall success, primarily based on description filling

    // --- Selectors for Bid Form Fields (Verified from provided HTML) ---
    const bidTextAreaSelector = 'textarea#descriptionTextArea';
    const bidAmountInputSelector = 'input#bidAmountInput';
    const deliveryTimeInputSelector = 'input#periodInput';
    // Alternative selectors in case the primary ones don't work
    const alternativeBidAmountSelectors = [
        'input#bidAmountInput',
        'input[name="bidAmount"]',
        'input[placeholder*="bid" i]',
        'input[placeholder*="amount" i]',
        'input[type="number"]'
    ];
    const alternativeDeliveryTimeSelectors = [
        'input#periodInput',
        'input[name="deliveryTime"]',
        'input[name="period"]',
        'input[placeholder*="day" i]',
        'input[placeholder*="time" i]'
    ];
    const sponsoredCheckboxSelector = 'fl-list-item[fltrackinglabel="BidFormUpgrades.Sponsored"] input[type="checkbox"]';
    const sealedCheckboxSelector = 'fl-list-item[fltrackinglabel="BidFormUpgrades.Sealed"] input[type="checkbox"]';
    const highlightCheckboxSelector = 'fl-list-item[fltrackinglabel="BidFormUpgrades.Highlight"] input[type="checkbox"]';
    // --- End Selectors ---

    // 1. Insert Bid Description (Required by popup for this action)
    console.log(`[Content] fillBidForm: Attempting to fill bid description textarea with selector: '${bidTextAreaSelector}'`);
    const bidTextArea = document.querySelector(bidTextAreaSelector);
    if (bidTextArea && bidData.bidText !== undefined && bidData.bidText !== null) {
        try {
            bidTextArea.value = bidData.bidText;
            // Dispatch events to simulate user typing and trigger framework updates
            bidTextArea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
             bidTextArea.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
             bidTextArea.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log("[Content] fillBidForm: Successfully filled bid description.");
        } catch (e) {
            console.error("[Content] fillBidForm: Error setting bid description value or dispatching events:", e);
            success = false; // Mark as failed
        }
    } else if (!bidTextArea) {
        console.error(`[Content] fillBidForm: Bid description textarea not found using selector: '${bidTextAreaSelector}'.`);
        success = false; // Mark as failed
    } else {
         console.warn("[Content] fillBidForm: No bid text provided in bidData.");
         // If bid text is missing, consider this a failure to fill the *main* part
         success = false;
    }


    // 2. Set Bid Amount (Optional)
    // setInputValue handles null/undefined/empty string gracefully
    console.log(`[Content] fillBidForm: About to set bid amount to '${bidData.bidAmount}' using selector '${bidAmountInputSelector}'`);
    // Add a small delay to ensure form fields are fully loaded
    setTimeout(() => {
        setInputValueWithFallback(alternativeBidAmountSelectors, bidData.bidAmount);
    }, 100);


    // 3. Set Delivery Time (Optional)
    // setInputValue handles null/undefined/empty string gracefully
    console.log(`[Content] fillBidForm: About to set delivery time to '${bidData.deliveryTime}' using selector '${deliveryTimeInputSelector}'`);
    // Add a small delay to ensure form fields are fully loaded
    setTimeout(() => {
        setInputValueWithFallback(alternativeDeliveryTimeSelectors, bidData.deliveryTime);
    }, 150);


    // 4. Set Optional Upgrades (assuming bidData.upgrades is an object)
    if (bidData.upgrades) {
         console.log("[Content] fillBidForm: Processing upgrades...");
        if (bidData.upgrades.sponsored !== undefined) {
             setCheckboxState(sponsoredCheckboxSelector, bidData.upgrades.sponsored);
        }
        if (bidData.upgrades.sealed !== undefined) {
             setCheckboxState(sealedCheckboxSelector, bidData.upgrades.sealed);
        }
        if (bidData.upgrades.highlight !== undefined) {
             setCheckboxState(highlightCheckboxSelector, bidData.upgrades.highlight);
        }
         console.log("[Content] fillBidForm: Finished processing upgrades.");
    } else {
        console.log("[Content] fillBidForm: No upgrade data provided in bidData. Not changing checkbox states.");
        // If no upgrade data is provided, we don't change the state of the checkboxes on the page.
    }


    console.log(`[Content] ---< fillBidForm function finished at ${new Date().toISOString()}. Duration: ${Date.now() - funcStartTime}ms. Overall success (based on description): ${success}`);
    // Return overall success based primarily on if the description was found/filled.
    return success;
}

// --- Message Listener ---
// Updated flag and log message
if (!window.hasGeminiBidContentListenerEnhancedV5) {
    window.hasGeminiBidContentListenerEnhancedV5 = true;
    console.log("[Content] Setting up chrome.runtime.onMessage listener (Enhanced V5 - Attempt Read Default Timing)...");

    try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            const messageStartTime = Date.now();
            console.log(`[Content] === Message Received === at ${new Date(messageStartTime).toISOString()}`);
            console.log(`[Content] Message Action: '${request.action}'`);
            let isAsync = false;

            if (request.action === "getJobDescription") { // Action name remains the same
                console.log("[Content] Message Handler: Matched action 'getJobDescription'. Calling extractJobDetails()...");
                // extractJobDetails is now async and includes a delay
                extractJobDetails().then(jobDetails => {
                     if (jobDetails && jobDetails.description) { // Only proceed if description was extracted
                        console.log("[Content] Message Handler: Details extracted. Sending 'callGemini' to background with description, amount, and time...");
                         // Send all relevant details to the background
                        chrome.runtime.sendMessage({
                            action: "callGemini",
                            description: jobDetails.description,
                            extractedBidAmount: jobDetails.bidAmount, // Include extracted amount
                            extractedDeliveryTime: jobDetails.deliveryTime // Include extracted time
                        }, (response) => {
                            const responseReceivedTime = Date.now();
                            console.log(`[Content] === Background Response Received === at ${new Date(responseReceivedTime).toISOString()}.`);
                            if (chrome.runtime.lastError) {
                                console.error("[Content] Background Response Callback: ERROR:", chrome.runtime.lastError.message);
                                sendResponse({ status: "error", message: `Background script error: ${chrome.runtime.lastError.message}` }); return;
                            }
                            console.log("[Content] Background Response Callback: Relaying to popup:", response);
                            // The background script is expected to return:
                            // { status: 'success', bid: generatedBid, bidAmount: ..., deliveryTime: ... }
                            // or { status: 'error', message: ... }
                            sendResponse(response);
                        });

                    } else {
                        console.error("[Content] Message Handler: Description extraction failed. Sending error response to popup.");
                        // Still send the extracted amount and time even if description failed
                         sendResponse({
                             status: "error",
                             message: "Failed to extract job description from page. Please ensure you are on a valid project page.",
                             // Include potentially extracted amount and time for the popup to display
                             bidAmount: jobDetails ? jobDetails.bidAmount : null,
                             deliveryTime: jobDetails ? jobDetails.deliveryTime : null
                        });
                    }
                }).catch(error => {
                    console.error("[Content] Message Handler: Error during extractJobDetails:", error);
                    sendResponse({ status: "error", message: `Error extracting job details: ${error.message}` });
                });
                isAsync = true; // Indicate that the response will be sent asynchronously

            } else if (request.action === "fillBidForm") {
                console.log("[Content] Message Handler: Matched action 'fillBidForm'.");
                // Expecting bidData object with text, optional amount, time, and optional upgrades
                if (request.bidData) {
                    // Check if bidText, the only required field from the popup's perspective for filling, is present
                     if (request.bidData.bidText !== undefined && request.bidData.bidText !== null && request.bidData.bidText.trim() !== '') {
                        if (fillBidForm(request.bidData)) {
                            console.log("[Content] Message Handler: fillBidForm success. Sending success response.");
                            sendResponse({ status: "success" });
                        } else {
                            console.error("[Content] Message Handler: fillBidForm failed. Sending error response.");
                            sendResponse({ status: "error", message: "Failed to fill one or more bid form fields. Check selectors in content.js and page console." });
                        }
                     } else {
                         console.error("[Content] Message Handler: 'fillBidForm' bidText is missing or empty. Sending error.");
                         sendResponse({ status: "error", message: "Bid description text is required for filling the form." });
                     }
                } else {
                    console.error("[Content] Message Handler: 'fillBidForm' missing bidData object. Sending error.");
                    sendResponse({ status: "error", message: "Bid data object was missing in the fill request." });
                }
            } else if (request.action === "placeBid") {
                console.log("[Content] Message Handler: Matched action 'placeBid'.");
                
                // Try to find the specific Freelancer.com bid button
                let bidButton = null;
                let foundMethod = null;
                
                // Method 1: Look for the specific button structure
                const flButtonSelectors = [
                    'fl-button[fltrackinglabel="PlaceBidButton"] button',
                    'fl-button.BidFormBtn button',
                    'div.BidFormBtn button',
                    'button.ButtonElement'
                ];
                
                for (const selector of flButtonSelectors) {
                    const buttons = document.querySelectorAll(selector);
                    console.log(`[Content] Found ${buttons.length} buttons with selector: '${selector}'`);
                    
                    for (const button of buttons) {
                        const buttonText = (button.textContent || button.innerText || '').toLowerCase().trim();
                        console.log(`[Content] Button text: '${buttonText}'`);
                        
                        if (buttonText === 'place bid') {
                            bidButton = button;
                            foundMethod = `fl-button selector: ${selector}`;
                            console.log(`[Content] Found exact match with selector: '${selector}'`);
                            break;
                        }
                    }
                    if (bidButton) break;
                }
                
                // Method 2: Look for any button with "Place Bid" text
                if (!bidButton) {
                    const allButtons = document.querySelectorAll('button');
                    console.log(`[Content] Searching through ${allButtons.length} total buttons for "Place Bid" text`);
                    
                    for (const button of allButtons) {
                        const buttonText = (button.textContent || button.innerText || '').toLowerCase().trim();
                        if (buttonText === 'place bid') {
                            bidButton = button;
                            foundMethod = 'text search';
                            console.log(`[Content] Found button with exact text match: '${buttonText}'`);
                            break;
                        }
                    }
                }
                
                if (bidButton) {
                    try {
                        console.log(`[Content] Attempting to click bid button found via: ${foundMethod}`);
                        console.log(`[Content] Button element:`, bidButton);
                        console.log(`[Content] Button text: '${bidButton.textContent.trim()}'`);
                        console.log(`[Content] Button class: '${bidButton.className}'`);
                        console.log(`[Content] Button disabled: ${bidButton.disabled}`);
                        console.log(`[Content] Button type: ${bidButton.type}`);
                        console.log(`[Content] Button tabindex: ${bidButton.tabIndex}`);
                        
                        // Check if button is disabled
                        if (bidButton.disabled) {
                            console.warn("[Content] Button is disabled, cannot click");
                            sendResponse({ status: "error", message: "The bid button is disabled. Please check if all required fields are filled." });
                            return;
                        }
                        
                        // Add a small delay to ensure the page is ready
                        console.log("[Content] Waiting 500ms before attempting to click...");
                        
                        setTimeout(() => {
                            // Try multiple click methods with different event types
                            let clickSuccess = false;
                            
                            // Method 1: Direct click
                            try {
                                console.log("[Content] Trying direct .click() method...");
                                bidButton.click();
                                clickSuccess = true;
                                console.log("[Content] Successfully clicked bid button using .click()");
                            } catch (clickError) {
                                console.log("[Content] .click() failed:", clickError);
                            }
                            
                            // Method 2: Mouse events
                            if (!clickSuccess) {
                                try {
                                    console.log("[Content] Trying mouse events...");
                                    bidButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                                    bidButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                                    bidButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                    clickSuccess = true;
                                    console.log("[Content] Successfully clicked bid button using mouse events");
                                } catch (mouseError) {
                                    console.log("[Content] Mouse events failed:", mouseError);
                                }
                            }
                            
                            // Method 3: Try clicking the parent fl-button element
                            if (!clickSuccess) {
                                try {
                                    console.log("[Content] Trying to click parent fl-button element...");
                                    const parentFlButton = bidButton.closest('fl-button');
                                    if (parentFlButton) {
                                        console.log("[Content] Found parent fl-button, attempting to click it...");
                                        parentFlButton.click();
                                        clickSuccess = true;
                                        console.log("[Content] Successfully clicked parent fl-button");
                                    } else {
                                        console.log("[Content] No parent fl-button found");
                                    }
                                } catch (parentError) {
                                    console.log("[Content] Parent fl-button click failed:", parentError);
                                }
                            }
                            
                            // Method 4: Touch events (for mobile-like behavior)
                            if (!clickSuccess) {
                                try {
                                    console.log("[Content] Trying touch events...");
                                    bidButton.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
                                    bidButton.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
                                    clickSuccess = true;
                                    console.log("[Content] Successfully clicked bid button using touch events");
                                } catch (touchError) {
                                    console.log("[Content] Touch events failed:", touchError);
                                }
                            }
                            
                            // Method 5: Focus and Enter key
                            if (!clickSuccess) {
                                try {
                                    console.log("[Content] Trying focus and Enter key...");
                                    bidButton.focus();
                                    bidButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
                                    bidButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }));
                                    clickSuccess = true;
                                    console.log("[Content] Successfully clicked bid button using Enter key");
                                } catch (keyError) {
                                    console.log("[Content] Enter key method failed:", keyError);
                                }
                            }
                            
                            if (clickSuccess) {
                                sendResponse({ status: "success" });
                            } else {
                                console.error("[Content] All click methods failed");
                                sendResponse({ status: "error", message: "Could not click the bid button. Please try placing your bid manually." });
                            }
                        }, 500);
                        
                        return true; // Indicate async response
                    } catch (error) {
                        console.error("[Content] Error clicking bid button:", error);
                        sendResponse({ status: "error", message: `Error clicking bid button: ${error.message}` });
                    }
                } else {
                    console.warn("[Content] Could not find bid button with any method.");
                    // Log all buttons on the page to help debug
                    const allButtons = document.querySelectorAll('button');
                    console.log(`[Content] Available buttons on page (${allButtons.length} total):`);
                    allButtons.forEach((button, index) => {
                        const buttonText = (button.textContent || button.innerText || '').trim();
                        const buttonClass = button.className || '';
                        const buttonId = button.id || '';
                        const buttonType = button.type || '';
                        const buttonDisabled = button.disabled || false;
                        console.log(`[Content] Button ${index}: text="${buttonText}", type="${buttonType}", class="${buttonClass}", id="${buttonId}", disabled="${buttonDisabled}"`);
                    });
                    sendResponse({ status: "error", message: "Could not find the bid button on the page. Please place your bid manually." });
                }
            } else {
                 console.warn(`[Content] Message Handler: Received unknown message action: '${request.action}'. Ignoring.`);
                 // Send a response for unknown actions to prevent the port from staying open
                 sendResponse({ status: "error", message: `Unknown action: ${request.action}` });
            }
            console.log(`[Content] Message Handler: Finished processing action '${request.action}'. Returning ${isAsync} for async.`);
            return isAsync; // Return true if sendResponse will be called later
        });
        console.log("[Content] Message listener added successfully (Enhanced V5).");
    } catch (e) {
        console.error("[Content] CRITICAL ERROR setting up message listener:", e);
    }
} else {
     console.warn("[Content] Listener flag V5 already set. Skipping addListener setup.");
}

console.log(`[Content] Script execution finished at ${new Date().toISOString()}. Total time: ${Date.now() - scriptStartTime}ms`);