# FILTER-BOT

- A lightweight userbot that continuously
  - monitors Telegram channels using GramJS (MTProto),
  - filters posts in real time using the **Google Gemini API**,
  - forwards relevant matches straight to your bot/channel/ Saved Messages.

## How It Works

```
    ┌───────────────────┐
    │ Telegram Channels │ (managed via Bot commands)
    └───────────┬───────┘
                │ Real-time incoming post (GramJS MTProto)
                ▼
    ┌───────────────────┐
    │ Gemini LLM Filter │ Evaluates post against your custom prompt
    └──────────┬────────┘
               │
      ┌────────┴────────┐
      │                 │
    [YES]             [NO]
      │                 │
      ▼                 ▼
┌──────────────┐  ┌───────────────┐
│ Forwarded to │  │ Discarded,    │
│ your bot     │  │ no database   │
└──────────────┘  └───────────────┘
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Telegram User API Credentials** (MTProto):
   - Log in at [my.telegram.org](https://my.telegram.org).
   - Go to **API development tools**.
   - Note your `api_id` and `api_hash`.
3. **Your User ID**
   - Go to [@userinfobot](https://t.me/userinfobot)
   - Copy your Numeric `user_id`
4. **Google Gemini API Key**:
   - Generate a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Filtering is skipped while `GEMINI_API_KEY` is unset; you can add it to `.env` when ready.
5. **Chat-Bot Token (for managing channels via chat)**:
   - Open Telegram and message [@BotFather](https://t.me/BotFather).
   - Send `/newbot`, follow the prompts to choose a name and username.
   - Copy the HTTP API token provided by BotFather.

## Quick Start

### 1. Install Dependencies

```
npm init -y
```

```
npm install telegram
```

**telegram (GramJS)**: Native Node.js MTProto client library.

- Authenticates as a real Telegram user account (via api_id, api_hash, phone number),
- Listens to incoming posts across public/private channels in real time ,
- Forwards matching posts.

```
npm install dotenv
```

**dotenv**: Loads environment variables from the .env file into process.env on application boot.

```
npm install @google/genai
```

**@google/genai**: Official Google Gen AI SDK.

- Sends incoming Telegram message text to Google Gemini with a custom classification prompt and returns a strict "yes" or "no" relevance decision.

```
npm install node-telegram-bot-api
```

**node-telegram-bot-api**: Telegram Bot API client. Powers the interactive companion bot (@YourBot) that allows the authorized owner to manage watched channels via chat commands.

### 2. Configure Environment

Copy `.env.example` to `.env` and Fill in your keys in `.env`:

```
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash
GEMINI_API_KEY=your_gemini_api_key
BOT_TOKEN=your_botfather_bot_token
ALLOWED_USER_ID=your_numeric_telegram_user_id
```

### 3. Run the Bot

```
node index.js
```

- **First Run**: The console will prompt you for the Telegram verification code sent to your phone/Telegram app.
- The phone number is entered interactively during first login; it does not need to be stored in `.env`.
- Once authenticated, your session is saved to `.session` (gitignored).
- **Subsequent Runs**: Connects instantly without asking for codes!

## Managing Channels via Telegram Commands

Message your bot in Telegram to control your watch list in real time:

```
| Command                     | Description                              |
| --------------------------- | ---------------------------------------- |
| /help                       | Show available commands                  |
| /prompt "your prompt here"  | Set which messages to filter             |
| /settings                   | Show the saved prompt and destination     |
| /listchannels               | View all monitored channels              |
| /addchannel @one @two       | Add up to 20 channels to the watchlist   |
| /destchannel @username      | Set where matching messages are forwarded|
| /removechannel @username    | Remove a channel from the watchlist      |
```

Commands are accepted in a private chat with your management bot from the account whose numeric ID is set in `ALLOWED_USER_ID`.

> Relief for someone who is looking for a job (😂). You don't have to read 400+ messages just to find all of them are for accountants while you're searching for junior React dev roles.

> ## V2: Multi users support & realtime deployment is upcoming next
>
> ### Checkout [implementation.md](Implementation.md) for implementation steps followed in detail.
