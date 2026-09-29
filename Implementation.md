# Module Build Order & Iteration Log

## 1. Project Setup & Config

**Core Objective:** Setting up project files, installing needed packages, and checking `.env` settings early so the app stops immediately if any key is missing.

**Sub-features:**

- Project setup and package installation:
  - Initialized `package.json` with modern `import/export` support and run scripts (`npm start`),
  - Installed required libraries (`telegram`, `dotenv`, `@google/genai`, `node-telegram-bot-api`, `input`),
  - Created `.gitignore` to hide secret files like `.env` and login sessions,
  - Created `.env` & `.env.example` showing all keys needed to run the bot,
  - Created `src/config.js` to check all required keys on startup and show clear error messages if any are missing,
  - Created initial `index.js` as the main starting point.

## 2. GramJS Login & Persistent State

**Core Objective:** Log in to Telegram once, save the session so you don't have to enter the SMS code every time, and create a simple JSON file to save watched channels and settings.

**Sub-features:**

- Persistent State Management (`src/storage.js`):
  - Created JSON data store (`channels.json`) to persist watchlist, destination channel, and Gemini prompt,
  - Implemented automatic directory and file creation on first run with graceful error handling,
  - Added helper functions (`loadState`, `saveState`, `addChannel`, `removeChannel`, `setPrompt`, `setDestChannel`),
  - Added username and channel identifier normalization (stripping leading `@` and lowercase conversion).
- GramJS Client & Session Persistence (`src/telegram.js`):
  - Created Telegram MTProto client initialization with `TelegramClient` and `StringSession`,
  - Implemented interactive console authentication for phone number, SMS verification code, and 2FA password,
  - Added persistent session storage to disk (`.session`), enabling zero-prompt instant re-authentication on subsequent startups,
  - Verified user authentication by logging authenticated user profile information (`id`, `username`, `firstName`),
  - Integrated persistent state and client initialization into `index.js`.

## 3. Channel Listener

**Core Objective:** Listen for new posts in your watched channels and prepare the text for checking.

**Sub-features:**

- Added `src/channelListener.js` with a GramJS `NewMessage` event listener for posts in the persisted watchlist.
- Resolved saved channel usernames/IDs to Telegram entities and filtered incoming updates by channel ID.
- Prepared text posts as a normalized callback payload containing channel, channel ID, message ID, text, date, and original GramJS message for Module 4.
- Skipped media-only posts with no text and isolated callback errors so one failed post does not stop the listener.
- Added `syncWatchedChannels()` for reloading subscriptions after runtime watchlist changes and `stopChannelListener()` for clean shutdown.
- Started the listener from `index.js`; the current handoff logs each prepared post until Module 4 supplies its filtering callback.

## 4. LLM Filter & Forward

**Core Objective:** Send post text to Gemini AI to decide "yes" or "no", and forward matching posts to your chosen destination.

**Sub-features:**

- Added `src/filterForward.js` using the Google Gen AI SDK and configured Gemini model to classify each prepared post against the saved prompt.
- Asked Gemini for a strict `YES`/`NO` decision, treated post text as untrusted input, and rejected unexpected responses safely.
- Forwarded matching original Telegram posts through the authenticated GramJS user session to the configured destination.
- Added clear skip paths for a missing API key, prompt, or destination; missing API keys no longer prevent the app from starting.
- Connected the Module 3 post callback to the filter-and-forward pipeline from `index.js`.

## 5. Bot Commands & Management

**Core Objective:** Set up a Telegram management bot that only you can control, allowing you to add channels, remove channels, and change the prompt using simple chat commands (`/addchannel`, `/removechannel`, `/prompt`, etc.).

**Sub-features:**

- (to be filled in after completion)

## 6. Resilience & Multi-Channel Concurrency

**Core Objective:** Automatically reconnect if the internet drops, safely handle API errors without crashing the app, and make sure watching multiple channels works smoothly.

**Sub-features:**

- (to be filled in after completion)

## 7. End-to-End Integration Pass

**Core Objective:** Test the complete system from start to finish: add a channel, receive a post, check it with AI, and forward it.

**Sub-features:**

- (to be filled in after completion)

> ## V2: Multi-user support & real-time deployment is coming next
