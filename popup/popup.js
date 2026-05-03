document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.getElementById('page-title');
  const summarizeBtn = document.getElementById('summarize-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorMessage = document.getElementById('error-message');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');

  // Get current tab info
  let currentTab = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentTab = tab;
      pageTitle.textContent = tab.title || 'Unknown Page';
    } else {
      pageTitle.textContent = 'AI Summarizer';
    }
  } catch (error) {
    console.error('Error fetching tab info:', error);
    pageTitle.textContent = 'AI Summarizer';
  }

  async function summarizeContent(text) {
    if (!text || text.trim().length === 0) {
      showError("Could not read this page");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'SUMMARIZE', 
        content: text,
        url: currentTab.url
      });

      if (response && response.success) {
        displaySummary(response.summary);
      } else {
        showError("Summary failed. Please try again.");
      }
    } catch (error) {
      console.error('Error communicating with background script:', error);
      showError("Summary failed. Please try again.");
    }
  }

  function displaySummary(summary) {
    loadingSpinner.classList.add('hidden');
    summarizeBtn.disabled = false;
    
    if (!summary) {
      showError("Summary failed. Please try again.");
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
    if (!currentTab) return;

    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    
    // Check for chrome internal pages
    if (currentTab.url && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('edge://') || currentTab.url.startsWith('about:'))) {
      showError("Cannot summarise this page");
      return;
    }

    loadingSpinner.classList.remove('hidden');
    summarizeBtn.disabled = true;

    try {
      // Trigger extraction in content script and wait for response
      const response = await chrome.tabs.sendMessage(currentTab.id, { type: 'GET_CONTENT' });
      
      if (response && response.success) {
        if (!response.content || response.content.trim().length === 0) {
          showError("Could not find any readable content on this page.");
        } else {
          await summarizeContent(response.content);
        }
      } else {
        showError("Could not read this page. Try refreshing it.");
      }
    } catch (error) {
      console.error('Error sending message to content script:', error);
      // Most common cause of error here is the content script not being injected yet
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
