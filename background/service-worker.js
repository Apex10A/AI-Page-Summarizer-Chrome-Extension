importScripts('../config.js');

console.log("Background service worker initialized.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE') {
    handleSummarize(request.content)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('Summarization error:', error);
        sendResponse({ success: false, error: error.message || 'Something went wrong. Please try again.' });
      });
    return true; // Keep channel open for async response
  }
});

async function handleSummarize(content) {
  // If no API key is set, return a mock response for development purposes
  if (!CONFIG.AI_API_KEY || CONFIG.AI_API_KEY === 'YOUR_API_KEY_HERE') {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          summary: {
            bullets: [
              "This is a mock bullet point based on your page content.",
              "The system correctly extracted and sent the text to the background.",
              "Add a real API key in config.js to get actual AI summaries."
            ],
            insights: [
              "The extension is properly configured for background processing.",
              "Security rules are followed: the API key is handled only in the service worker."
            ],
            readingTime: '1 min'
          }
        });
      }, 1500);
    });
  }

  // Real API call logic
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Summarize the following text. Return a JSON object with 'bullets' (array of strings), 'insights' (array of strings), and 'readingTime' (string)."
          },
          {
            role: "user",
            content: content
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Assuming the AI returns a JSON string in the expected format
    const aiResponse = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      summary: aiResponse
    };
  } catch (error) {
    throw new Error('Failed to connect to AI service. Please check your API key and connection.');
  }
}
