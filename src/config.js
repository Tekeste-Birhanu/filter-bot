import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";

// Load environment variables from .env file
dotenv.config();

/**
 * Validates and exports application configuration.
 * Exits fail-fast if any required environment variable is missing or malformed.
 */
function loadAndValidateConfig() {
  const errors = [];

  const rawApiId = process.env.API_ID?.trim();
  const apiHash = process.env.API_HASH?.trim();
  const botToken = process.env.BOT_TOKEN?.trim();
  const rawAllowedUserId = process.env.ALLOWED_USER_ID?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  // Validate API_ID
  let apiId;
  if (!rawApiId) {
    errors.push("API_ID is required (obtain from https://my.telegram.org).");
  } else {
    apiId = Number.parseInt(rawApiId, 10);
    if (Number.isNaN(apiId)) {
      errors.push("API_ID must be a valid integer.");
    }
  }

  // Validate API_HASH
  if (!apiHash) {
    errors.push("API_HASH is required (obtain from https://my.telegram.org).");
  }

  // Validate BOT_TOKEN
  if (!botToken) {
    errors.push("BOT_TOKEN is required (obtain from @BotFather).");
  }

  // Validate ALLOWED_USER_ID
  let allowedUserId;
  if (!rawAllowedUserId) {
    errors.push("ALLOWED_USER_ID is required (obtain numeric ID from @userinfobot).");
  } else {
    allowedUserId = Number.parseInt(rawAllowedUserId, 10);
    if (Number.isNaN(allowedUserId)) {
      errors.push("ALLOWED_USER_ID must be a valid numeric Telegram ID.");
    }
  }

  // Validate GEMINI_API_KEY
  if (!geminiApiKey) {
    errors.push("GEMINI_API_KEY is required (obtain from https://aistudio.google.com/app/apikey).");
  }

  if (errors.length > 0) {
    console.error("\n❌ Configuration Error: Missing or invalid environment variables:");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    console.error("\nPlease check your .env file or copy .env.example to .env and configure all required variables.\n");
    throw new Error("Configuration validation failed");
  }

  return {
    telegram: {
      apiId,
      apiHash,
      phoneNumber: process.env.PHONE_NUMBER?.trim() || "",
      sessionString: process.env.SESSION_STRING?.trim() || "",
      sessionFilePath: path.resolve(process.cwd(), process.env.SESSION_FILE_PATH?.trim() || ".session"),
      botToken,
      allowedUserId,
    },
    gemini: {
      apiKey: geminiApiKey,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    },
    storage: {
      channelsFilePath: path.resolve(process.cwd(), process.env.DATA_STORE_PATH?.trim() || "channels.json"),
    },
  };
}

export const config = loadAndValidateConfig();
