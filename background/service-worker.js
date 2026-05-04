importScripts('../config.js');

console.log("Background service worker initialized.");

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE') {
    handleSummarize(request.content, request.url)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('Summarization error:', error);
        sendResponse({ success: false, error: error.message || 'Something went wrong. Please try again.' });
      });
    return true; // Keep channel open for async response
  }
});

async function handleSummarize(content, url) {
  const cacheKey = `summary_${url}`;
  
  // 1. Check cache first if URL is provided
  if (url) {
    try {
      const cachedData = await chrome.storage.local.get(cacheKey);
      if (cachedData[cacheKey]) {
        const { summary, timestamp } = cachedData[cacheKey];
        const isExpired = Date.now() - timestamp > CACHE_EXPIRATION_MS;
        
        if (!isExpired) {
          console.log('Returning cached summary for:', url);
          return {
            success: true,
            summary: summary,
            cached: true
          };
        }
      }
    } catch (error) {
      console.warn('Error reading from cache:', error);
    }
  }

  try {
    // Call our new proxy endpoint
    const response = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content
      })
    });

   if (!response.ok) {
     const errorData = await response.json();
     throw new Error(`Proxy error ${response.status}: ${errorData?.error || response.statusText}`);
   }

    const data = await response.json();
    
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      throw new Error(`AI blocked content: ${data.promptFeedback.blockReason}`);
    }

    if (!data.candidates || !data.candidates[0]) {
      throw new Error('AI could not generate a response for this content.');
    }

    if (data.candidates[0].finishReason === 'SAFETY' || data.candidates[0].finishReason === 'RECITATION') {
      throw new Error(`AI refused to summarize: ${data.candidates[0].finishReason}`);
    }

    if (!data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
      throw new Error('Unexpected response format from Gemini API');
    }

    let textResponse = data.candidates[0].content.parts[0].text.trim();
    
    if (textResponse.startsWith('```')) {
      textResponse = textResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      const aiResponse = JSON.parse(textResponse);
      
      // Save to cache
      if (url) {
        await chrome.storage.local.set({
          [cacheKey]: {
            summary: aiResponse,
            timestamp: Date.now()
          }
        });
      }

      return {
        success: true,
        summary: aiResponse
      };
    } catch (parseError) {
      console.error('Failed to parse response:', textResponse);
      return {
        success: false,
        error: 'The AI returned an invalid response format. Please try again.'
      };
    }
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error(`${error.message}`);
  }
}
