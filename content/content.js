function extractPageContent() {
  // Extraction priority: article -> main -> body
  let root = document.querySelector('article') || document.querySelector('main');
  
  // If article or main is found but empty, or not found at all, fallback to body
  if (!root || root.innerText.trim().length === 0) {
    root = document.body;
  }
  
  if (!root) return '';

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

  // Limit to 5000 characters
  return text.substring(0, 5000);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CONTENT') {
    try {
      const extractedText = extractPageContent();
      sendResponse({ success: true, content: extractedText });
    } catch (error) {
      console.error('Extraction error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});
