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
        } else {
          console.log('Cache expired for:', url);
        }
      }
    } catch (error) {
      console.warn('Error reading from cache:', error);
    }
  }

  // If no API key is set, return a mock response for development purposes
  if (!CONFIG.AI_API_KEY || CONFIG.AI_API_KEY === 'YOUR_API_KEY_HERE') {
    const mockSummary = {
      bullets: [
        "This is a mock bullet point based on your page content.",
        "The system correctly extracted and sent the text to the background.",
        "Add a real API key in config.js to get actual AI summaries."
      ],
      insights: [
        "The extension is properly configured for background processing.",
        "Security rules are followed: the API key is handled only in the service worker."
      ],
      readingTime: '1 min read'
    };

    // Even mock summaries can be cached
    if (url) {
      await chrome.storage.local.set({
        [cacheKey]: {
          summary: mockSummary,
          timestamp: Date.now()
        }
      });
    }

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          summary: mockSummary
        });
      }, 1500);
    });
  }

  const prompt = `You are a helpful assistant that summarises web pages.
Given the following page content, return a JSON object with exactly this shape:
{"bullets": ["key point 1", "key point 2", "key point 3"],"insights": ["insight 1", "insight 2"],"readingTime": "X min read"}
Return only the JSON. No explanation. No markdown.
Page content:
${content}`;

  try {
    const apiUrl = `${CONFIG.GEMINI_API_URL}?key=${CONFIG.AI_API_KEY}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error details:', errorData);
      throw new Error(`API error: ${response.statusText}`);
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
    
    // Remove markdown code blocks if the AI included them despite instructions
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
      console.error('Failed to parse Gemini response:', textResponse);
      return {
        success: false,
        error: 'The AI returned an invalid response format. Please try again.'
      };
    }
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error(`Failed to connect to Gemini AI: ${error.message}`);
  }
}
