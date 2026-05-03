console.log("AI Summarizer content script loaded.");

function extractPageContent() {
  console.log("Starting content extraction...");
  
  try {
    // Extraction priority: article -> main -> body
    let root = document.querySelector('article') || document.querySelector('main');
    
    // If article or main is found but empty, or not found at all, fallback to body
    if (!root || root.innerText.trim().length === 0) {
      console.log("No article/main found, falling back to body");
      root = document.body;
    }
    
    if (!root) {
      console.error("No root element found for extraction");
      return '';
    }

    // Clone the root to avoid modifying the actual page
    const clone = root.cloneNode(true);

    // Tags to strip out
    const tagsToStrip = ['nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript', 'iframe'];
    tagsToStrip.forEach(tag => {
      clone.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Selectors for noise elements (sidebar, menu, ad, banner, cookie)
    const noiseSelectors = [
      '[class*="sidebar"]', '[id*="sidebar"]',
      '[class*="menu"]', '[id*="menu"]',
      '[class*="ad"]', '[id*="ad"]',
      '[class*="banner"]', '[id*="banner"]',
      '[class*="cookie"]', '[id*="cookie"]'
    ];

    noiseSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Extract text content
    let text = clone.innerText || clone.textContent || '';

    // Clean up whitespace
    text = text.replace(/\s\s+/g, ' ').trim();

    console.log(`Extraction complete. Length: ${text.length} chars.`);

    // If we stripped too much, fallback to a simpler extraction
    if (text.length < 100 && root !== document.body) {
      console.log("Extracted text too short, falling back to basic body text");
      return document.body.innerText.substring(0, 5000);
    }

    // Limit to 5000 characters
    return text.substring(0, 5000);
  } catch (error) {
    console.error("Error during extraction:", error);
    // Absolute final fallback
    return document.body.innerText.substring(0, 5000);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request.type);
  if (request.type === 'GET_CONTENT') {
    try {
      const extractedText = extractPageContent();
      console.log("Sending extracted content back to popup...");
      sendResponse({ success: true, content: extractedText });
    } catch (error) {
      console.error('Extraction error handler:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep channel open
  }
});
