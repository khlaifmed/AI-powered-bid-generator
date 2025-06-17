/**
 * background.js: Service worker for the Chrome Extension.
 * - Runs in the background, independent of any specific web page.
 * - Listens for messages from content scripts.
 * - Handles communication with the external Gemini API.
 * - Manages API key retrieval from chrome.storage.
 * - Sends results or errors back to the content script.
 * - Handles extension installation/update events (e.g., opening options page).
 */

console.log("Background service worker started.");

// --- API Key Management ---

/**
 * Asynchronously retrieves the Gemini API key from synchronized Chrome storage.
 * @returns {Promise<string|undefined>} A promise that resolves with the API key string, or undefined if not found or an error occurs.
 */
async function getApiKey() {
    try {
        // Use chrome.storage.sync to get the key (syncs across user's devices if signed in)
        // Use chrome.storage.local for local-only storage.
        const result = await chrome.storage.sync.get('geminiApiKey');
        if (chrome.runtime.lastError) {
            // Check for errors during storage access
            console.error("Error retrieving API key from storage:", chrome.runtime.lastError.message);
            return undefined;
        }
        console.log("Background: API Key retrieved from storage.");
        return result.geminiApiKey; // Access the key using the key name used during saving
    } catch (error) {
        console.error("Background: Exception while retrieving API key:", error);
        return undefined;
    }
}

// --- Gemini API Call ---

/**
 * Calls the Google Generative Language API (Gemini) to generate a bid.
 * @param {string} description - The job description text extracted by the content script.
 * @returns {Promise<string>} A promise that resolves with the generated bid text.
 * @throws {Error} Throws an error if the API key is missing, the API call fails, or the response is invalid/blocked.
 */
async function generateBidWithGemini(description) {
    // Assume getApiKey is defined elsewhere and correctly retrieves the API key
    const apiKey = await getApiKey();
    if (!apiKey) {
        console.error("Background: Gemini API Key not found in storage.");
        throw new Error("API Key not set. Please configure it via the extension options (right-click extension icon -> Options).");
    }

    // --- API Endpoint and Model Selection ---
    // Using 'gemini-1.5-flash-latest' as specified in the original code
    const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

    // --- Prompt Engineering (Using the NEW attention-grabbing prompt) ---
    const prompt = `
You are a bid proposal generator for a freelance platform. Your goal is to create a **concise (approximately 4-8 lines total)** and highly effective bid proposal that immediately grabs the client's attention by demonstrating understanding of their specific need and proposing a clear, valuable solution.

**Input:**

\`\`\`markdown
**Job Description:**
---
${description}
---
\`\`\`

**Required Output Structure and Content Focus:**

1.  **Immediate Connection & Understanding (1-2 sentences):**
    * Start by directly referencing the client's project or core problem (e.g., "Regarding your need for...", "I read your post about...").
    * Briefly state your understanding of their main goal or pain point based on the description. Show you've read carefully.

2.  **Brief Value Proposition / Approach (1-2 sentences):**
    * Explain, in simple terms, *how* you will solve their specific problem or achieve their goal.
    * Highlight the *benefit* or *outcome* for the client (e.g., "This will result in...", "Ensuring X and Y...").

3.  **Relevant Expertise Snippet (1 sentence):**
    * Naturally integrate 1-3 of your *most relevant skills* directly related to the solution you just proposed or the technologies mentioned in the job description. Avoid a generic list. Frame it as *how* your skills apply.

4.  **Call to Action & Professional Closing (1-2 sentences):**
    * Express enthusiasm or confidence in your ability to deliver.
    * Invite further discussion (e.g., "I'd love to discuss this further...", "Let's connect to chat about how I can help...").
    * End with a professional closing like "Best regards," or "Sincerely," followed by a comma.

**Strict Generation Rules:**

* Combine the four parts above into a **single block of text** in the specified order.
* The **total output** must be approximately **4-8 lines**. Be concise in each section.
* Tailor the language **specifically** to the provided Job Description. Avoid generic phrases where possible.
* Focus on demonstrating **value** and a clear path to **solving the client's problem**.
* Maintain a professional, confident, and approachable tone.
* **Do NOT** include section titles in the final output.
* **Do NOT** include any placeholders like "[Your Name]".
* **Do NOT** add any text or characters **after** the chosen professional closing comma (e.g., after "Best regards,").

**Generate the Attention-Grabbing Bid Proposal:**
`; // End of prompt template literal

    console.log("Background: Sending request to Gemini API...");

    try {
        // Make the API call using the fetch API
        const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7, // Slightly increased temperature for potentially more varied/engaging responses
                    // maxOutputTokens: 300, // Adjust if needed based on the 4-8 line target (more flexible than before)
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ]
            }),
        });

        const responseBody = await response.json();

        if (!response.ok) {
            console.error("Background: Gemini API Error Response:", response.status, responseBody);
            const errorDetails = responseBody?.error?.message || `API request failed with status ${response.status}. Check API key and endpoint.`;
            throw new Error(errorDetails);
        }

        if (responseBody.promptFeedback && responseBody.promptFeedback.blockReason) {
            const blockReason = responseBody.promptFeedback.blockReason;
            const safetyRatings = responseBody.promptFeedback.safetyRatings;
            console.error(`Background: Gemini API blocked the prompt: ${blockReason}`, safetyRatings);
            throw new Error(`Content blocked by API safety filters: ${blockReason}. Adjust prompt or content if possible.`);
        }

        if (responseBody.candidates && responseBody.candidates.length > 0 &&
            responseBody.candidates[0].content && responseBody.candidates[0].content.parts &&
            responseBody.candidates[0].content.parts.length > 0 &&
            responseBody.candidates[0].content.parts[0].text)
        {
            const generatedText = responseBody.candidates[0].content.parts[0].text;
            console.log("Background: Received successful response from Gemini.");
            return generatedText.trim();
        } else {
            console.error("Background: Unexpected Gemini API response format:", responseBody);
            throw new Error("Could not parse valid bid text from API response (unexpected format).");
        }
    } catch (error) {
        console.error("Background: Error during Gemini API call or processing:", error);
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}

// Note: The 'getApiKey()' function is assumed to be defined elsewhere in your project
// and is responsible for securely retrieving the user's Gemini API key.

// --- Message Listener ---

/**
 * Listens for messages sent from other parts of the extension (e.g., content scripts).
 * Handles the 'callGemini' action.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message action is the one we're interested in ('callGemini')
    if (request.action === "callGemini") {
        console.log("Background: Received 'callGemini' request from content script in tab:", sender.tab?.id);
        // The request should contain the extracted job description
        const jobDescription = request.description;
        // Also get the extracted bid amount and delivery time
        const extractedBidAmount = request.extractedBidAmount;
        const extractedDeliveryTime = request.extractedDeliveryTime;

        if (!jobDescription) {
            console.error("Background: 'callGemini' request received without description.");
            // Send an error response back immediately if description is missing
            sendResponse({ status: "error", message: "Job description was missing in the request." });
            return false; // Indicate synchronous response
        }

        // Call the asynchronous function to interact with the Gemini API
        generateBidWithGemini(jobDescription)
            .then(bidText => {
                // --- Success Case ---
                console.log("Background: Successfully generated bid. Sending back to content script.");
                // Send the successful result back to the content script that made the request
                // Include the extracted bid amount and delivery time in the response
                sendResponse({ 
                    status: "success", 
                    bid: bidText,
                    bidAmount: extractedBidAmount,
                    deliveryTime: extractedDeliveryTime
                });
            })
            .catch(error => {
                // --- Error Case ---
                console.error("Background: Error during Gemini call processing:", error);
                // Send the error details back to the content script
                // Still include extracted values even on error, so popup can show them
                sendResponse({ 
                    status: "error", 
                    message: error.message || "An unknown error occurred during bid generation.",
                    bidAmount: extractedBidAmount,
                    deliveryTime: extractedDeliveryTime
                });
            });

        // Return true to indicate that the sendResponse function will be called asynchronously
        // (after the generateBidWithGemini promise resolves or rejects). This is essential!
        return true;
    }

    // If the message action is not 'callGemini', ignore it.
    // Return false or undefined if this listener isn't handling the message asynchronously.
    return false;
});

// --- Extension Lifecycle Events ---

/**
 * Listens for the extension being installed or updated.
 * Useful for setting up initial state or guiding the user.
 */
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") {
        console.log("Background: Extension installed.");
        // Open the options page automatically on first install to prompt for API key setup
        try {
            chrome.runtime.openOptionsPage();
        } catch (e) {
            console.error("Error opening options page on install:", e);
        }
    } else if (details.reason === "update") {
        const newVersion = chrome.runtime.getManifest().version;
        console.log(`Background: Extension updated to version ${newVersion}.`);
        // You could add logic here for migrations or notifications if needed
    }
});
