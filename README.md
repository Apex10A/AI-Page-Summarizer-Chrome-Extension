# AI Summarizer Extension

A browser extension that generates concise, bulleted summaries of web pages using Google Gemini AI. It identifies the core content of an article, extracts key points and insights, and estimates reading time.

## Project Overview
This extension solves the problem of "information overload" by allowing users to quickly digest long-form articles without leaving their current tab. It uses a secure architecture to protect API credentials while providing a seamless user experience.

## How to Install (Local Installation)

### 1. Prerequisites
- **Node.js** installed on your machine.
- A **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com/)).

### 2. Setup the Proxy Server (Backend)
To protect your API key, this extension uses a Vercel serverless function as a proxy.
1. Clone the repository to your local machine.
2. Install the Vercel CLI: `npm i -g vercel`.
3. Create a `.env` file in the root directory and add your key:
   ```text
   GEMINI_AI_API_KEY=your_actual_key_here
   ```
4. Run the proxy locally: `vercel dev`. This will start the server at `http://localhost:3000`.

### 3. Setup the Extension (Frontend)
1. Create `config.js` by copying `config.example.js`:
   ```bash
   cp config.example.js config.js
   ```
2. Open `config.js` and ensure the `PROXY_URL` points to your local server:
   ```javascript
   const CONFIG = {
     PROXY_URL: 'http://localhost:3000/api/summarize'
   };
   ```
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer Mode** (toggle in the top right corner).
5. Click **Load unpacked** and select the project folder.
6. Pin the AI Summarizer to your toolbar for easy access.

## Architecture Explanation

The extension is composed of four primary components that communicate via Chrome's message-passing API:

- **manifest.json**: The blueprint of the extension. It defines permissions (`activeTab`, `scripting`, `storage`), host permissions for the proxy, and identifies the background and popup files.
- **Popup (UI Layer)**: The `popup.html` and `popup.js` files handle the user interface. It triggers the content extraction and displays the final summary.
- **Content Script (Page Reading Layer)**: `content.js` is injected into the active tab on demand. It uses a heuristic approach to find the main article body and strips away noise (ads, nav, footers).
- **Background Service Worker (AI + Security Layer)**: `service-worker.js` acts as the coordinator. It receives text from the popup, checks the local cache for existing summaries, and communicates with the **Proxy Server** to fetch AI results.

## AI Integration

- **API**: Uses the Google Gemini API (via our Vercel proxy).
- **Prompt Structure**: The request is wrapped in a system prompt that enforces a specific JSON output:
  - `bullets`: Key takeaways.
  - `insights`: Deeper analysis points.
  - `readingTime`: An estimate based on content length.
- **Parsing**: The background worker cleans the AI response (removing any markdown formatting) and parses the JSON string into a structured object for the UI.

## Security Decisions

- **Background Isolation**: The API key and proxy logic are isolated from the content script. This prevents websites you visit from ever seeing your credentials.
- **GitIgnored Config**: Sensitive files like `config.js` and `.env` are included in `.gitignore` to prevent accidental leaks to version control.
- **Sanitized Injection**: To prevent XSS (Cross-Site Scripting), the extension uses `textContent` and `createElement` instead of `innerHTML` when displaying AI-generated summaries.
- **Minimal Permissions**: The extension uses `activeTab` instead of broad `<all_urls>` permissions, meaning it only gains access to a site when you explicitly click the extension icon.

## Trade-offs and Limitations

- **Local Extension**: Not currently published to the Web Store; requires manual installation in Developer Mode.
- **Secrets Management**: While the proxy hides the API key from the browser, the key is stored in a local `.env` file for development.
- **Heuristic Extraction**: The content reader looks for `<article>` or `<main>` tags. On highly complex or non-standard pages, extraction accuracy may vary.
- **Basic Rate Limiting**: The extension relies on the Gemini API's standard rate limits. High-frequency usage may result in temporary cooling-off periods.
