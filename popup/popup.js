document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.getElementById('page-title');
  const summarizeBtn = document.getElementById('summarize-btn');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorMessage = document.getElementById('error-message');
  const emptyState = document.getElementById('empty-state');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) {
      pageTitle.textContent = tab.title || 'AI Summarizer';
    }
  } catch (error) {
    console.error('Error fetching tab info:', error);
  }

  async function summarizeContent(text, url) {
    if (!text || text.trim().length === 0) {
      showError("Could not find any readable content on this page.");
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'SUMMARIZE', 
        content: text,
        url: url
      });

      if (response && response.success) {
        displaySummary(response.summary);
      } else {
        showError(response?.error || "Summary failed. Please try again.");
      }
    } catch (error) {
      console.error('Error communicating with background script:', error);
      showError("Connection error. Please check background worker.");
    }
  }

  function displaySummary(summary) {
    loadingSpinner.classList.add('hidden');
    emptyState.classList.add('hidden');
    summarizeBtn.disabled = false;
    
    if (!summary) {
      showError("Summary failed. Please try again.");
      return;
    }
    summaryContent.innerHTML = '';
    
    if (summary.readingTime) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'reading-time';
      timeSpan.textContent = `⏱️ ${summary.readingTime}`;
      summaryContent.appendChild(timeSpan);
    }

    if (summary.bullets && summary.bullets.length > 0) {
      const title = document.createElement('h3');
      title.textContent = 'Key Points';
      summaryContent.appendChild(title);

      const ul = document.createElement('ul');
      summary.bullets.forEach(bullet => {
        const li = document.createElement('li');
        li.textContent = bullet;
        ul.appendChild(li);
      });
      summaryContent.appendChild(ul);
    }

    if (summary.insights && summary.insights.length > 0) {
      const insightsDiv = document.createElement('div');
      insightsDiv.className = 'insights-section';
      
      const title = document.createElement('h3');
      title.textContent = 'Insights';
      insightsDiv.appendChild(title);

      const ul = document.createElement('ul');
      summary.insights.forEach(insight => {
        const li = document.createElement('li');
        li.textContent = insight;
        ul.appendChild(li);
      });
      insightsDiv.appendChild(ul);
      summaryContent.appendChild(insightsDiv);
    }

    summaryContainer.classList.remove('hidden');
  }

  function showError(message) {
    loadingSpinner.classList.add('hidden');
    emptyState.classList.add('hidden');
    summarizeBtn.disabled = false;
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  summarizeBtn.addEventListener('click', async () => {
    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    emptyState.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    summarizeBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab) {
        showError("Could not find active tab.");
        return;
      }


      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://'))) {
        showError("Cannot summarise this page");
        return;
      }

      console.log("Requesting content from tab:", tab.id);

      try {
        let response;
        try {
          response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });
        } catch (msgError) {
          console.log("Content script not found, injecting now...");
          // 2. Inject content script on demand (more secure/minimal)
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          });
          // Try sending message again after injection
          response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });
        }
        
        if (response && response.success) {
          await summarizeContent(response.content, tab.url);
        } else {
          throw new Error("Content script returned unsuccessful response");
        }
      } catch (error) {
        console.error("Content extraction failed:", error);
        showError("Could not read this page. Try refreshing it.");
      }
    } catch (error) {
      console.error('Fatal error in summarize button handler:', error);
      showError("An unexpected error occurred.");
    }
  });

  copyBtn.addEventListener('click', () => {
    const textToCopy = summaryContent.innerText;
    
    // Use the modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showCopySuccess();
      }).catch(err => {
        console.error('Clipboard API failed: ', err);
        fallbackCopyText(textToCopy);
      });
    } else {
      fallbackCopyText(textToCopy);
    }
  });

  function showCopySuccess() {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('success');
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove('success');
    }, 2000);
  }

  function fallbackCopyText(text) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Ensure textarea is not visible but part of the DOM
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showCopySuccess();
      } else {
        console.error('Fallback copy failed');
      }
    } catch (err) {
      console.error('Fallback copy error: ', err);
    }
  }

  clearBtn.addEventListener('click', async () => {
    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    emptyState.classList.remove('hidden');
    summaryContent.innerHTML = '';
    summarizeBtn.disabled = false;

    // Optional: Clear cache for this specific URL when user clicks clear
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab && tab.url) {
        const cacheKey = `summary_${tab.url}`;
        await chrome.storage.local.remove(cacheKey);
        console.log("Cache cleared for:", tab.url);
      }
    } catch (e) {
      console.error("Error clearing cache:", e);
    }
  });
});
