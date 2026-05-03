document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.getElementById('page-title');
  const summarizeBtn = document.getElementById('summarize-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorMessage = document.getElementById('error-message');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');

  // Get current tab info
  let currentTabId = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentTabId = tab.id;
      pageTitle.textContent = tab.title || 'Unknown Page';
    } else {
      pageTitle.textContent = 'AI Summarizer';
    }
  } catch (error) {
    console.error('Error fetching tab info:', error);
    pageTitle.textContent = 'AI Summarizer';
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'PAGE_CONTENT') {
      console.log('Received page content:', request.content);
      // For now, we just display the extracted text as a "summary" to confirm it works
      // In the next step, this would be sent to an AI for actual summarization
      displaySummary(request.content);
    }
  });

  function displaySummary(text) {
    loadingSpinner.classList.add('hidden');
    summarizeBtn.disabled = false;
    
    if (!text || text.trim().length === 0) {
      errorMessage.textContent = "Could not find any meaningful content to summarize.";
      errorMessage.classList.remove('hidden');
      return;
    }

    // Mocking the AI part for now by showing the first few hundred characters of extracted text
    const previewText = text.length > 500 ? text.substring(0, 500) + "..." : text;
    summaryContent.textContent = "Extracted Content Preview:\n\n" + previewText;
    summaryContainer.classList.remove('hidden');
  }

  // Summarize button handler
  summarizeBtn.addEventListener('click', async () => {
    if (!currentTabId) return;

    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    summarizeBtn.disabled = true;

    try {
      // Trigger extraction in content script
      await chrome.tabs.sendMessage(currentTabId, { type: 'EXTRACT_CONTENT' });
    } catch (error) {
      console.error('Error sending message to content script:', error);
      errorMessage.textContent = "Please refresh the page and try again.";
      errorMessage.classList.remove('hidden');
      loadingSpinner.classList.add('hidden');
      summarizeBtn.disabled = false;
    }
  });

  // Clear button handler
  clearBtn.addEventListener('click', () => {
    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    summaryContent.textContent = '';
    summarizeBtn.disabled = false;
  });
});
