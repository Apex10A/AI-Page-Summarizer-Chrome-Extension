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
      console.log('Received page content, sending to background...');
      summarizeContent(request.content);
    }
  });

  async function summarizeContent(text) {
    if (!text || text.trim().length === 0) {
      showError("Could not find any meaningful content to summarize.");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'SUMMARIZE', 
        content: text 
      });

      if (response && response.success) {
        displaySummary(response.summary);
      } else {
        showError(response?.error || "Failed to generate summary.");
      }
    } catch (error) {
      console.error('Error communicating with background script:', error);
      showError("Connection error. Please try again.");
    }
  }

  function displaySummary(summary) {
    loadingSpinner.classList.add('hidden');
    summarizeBtn.disabled = false;
    
    if (!summary) {
      showError("AI returned an empty summary.");
      return;
    }

    // Format the summary structured data into the display area
    let html = '';
    
    if (summary.readingTime) {
      html += `<p><strong>Reading Time:</strong> ${summary.readingTime}</p>`;
    }

    if (summary.bullets && summary.bullets.length > 0) {
      html += `<h3>Key Points</h3><ul>`;
      summary.bullets.forEach(bullet => {
        html += `<li>${bullet}</li>`;
      });
      html += `</ul>`;
    }

    if (summary.insights && summary.insights.length > 0) {
      html += `<h3>Insights</h3><ul>`;
      summary.insights.forEach(insight => {
        html += `<li>${insight}</li>`;
      });
      html += `</ul>`;
    }

    summaryContent.innerHTML = html;
    summaryContainer.classList.remove('hidden');
  }

  function showError(message) {
    loadingSpinner.classList.add('hidden');
    summarizeBtn.disabled = false;
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
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
      showError("Please refresh the page and try again.");
    }
  });

  // Clear button handler
  clearBtn.addEventListener('click', () => {
    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    summaryContent.innerHTML = '';
    summarizeBtn.disabled = false;
  });
});
