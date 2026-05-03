document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.getElementById('page-title');
  const summarizeBtn = document.getElementById('summarize-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loadingSpinner = document.getElementById('loading-spinner');
  const errorMessage = document.getElementById('error-message');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.title) {
      pageTitle.textContent = tab.title;
    } else {
      pageTitle.textContent = 'Unknown Page';
    }
  } catch (error) {
    console.error('Error fetching tab info:', error);
    pageTitle.textContent = 'AI Summarizer';
  }

  summarizeBtn.addEventListener('click', async () => {
    errorMessage.classList.add('hidden');
    summaryContainer.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    summarizeBtn.disabled = true;

    try {
      // Placeholder for AI summarization logic
      // In a real scenario, this would call a background script or API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      
      const mockSummary = "This is a placeholder summary for the current page. In the final version, this will be replaced with real AI-generated content.";
      
      summaryContent.textContent = mockSummary;
      summaryContainer.classList.remove('hidden');
    } catch (error) {
      errorMessage.textContent = "Failed to summarize page. Please try again.";
      errorMessage.classList.remove('hidden');
    } finally {
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
