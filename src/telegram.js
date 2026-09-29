import fs from "node:fs/promises";
import fsSync from "node:fs";
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { config } from "./config.js";

let telegramClient = null;

/**
 * Loads the saved session string from environment or disk.
 *
 * @returns {Promise<string>}
 */
async function loadSessionString() {
  // 1. Direct session string from environment
  if (config.telegram.sessionString) {
    return config.telegram.sessionString;
  }

  // 2. Read from disk file (.session)
  const sessionPath = config.telegram.sessionFilePath;
  try {
    if (fsSync.existsSync(sessionPath)) {
      const data = await fs.readFile(sessionPath, "utf-8");
      return data.trim();
    }
  } catch (error) {
    console.warn(`[Telegram] Could not read session file at ${sessionPath}:`, error.message);
  }

  return "";
}

/**
 * Saves the session string to disk so future startups don't require SMS re-login.
 *
 * @param {string} sessionString
 * @returns {Promise<void>}
 */
async function saveSessionString(sessionString) {
  if (!sessionString) return;
  const sessionPath = config.telegram.sessionFilePath;
  try {
    await fs.writeFile(sessionPath, sessionString, "utf-8");
  } catch (error) {
    console.error(`[Telegram] Failed to save session to ${sessionPath}:`, error.message);
  }
}

/**
 * Initializes and connects the GramJS Telegram client with session persistence.
 *
 * @returns {Promise<TelegramClient>}
 */
export async function initTelegramClient() {
  if (telegramClient && telegramClient.connected) {
    return telegramClient;
  }

  const sessionString = await loadSessionString();
  const session = new StringSession(sessionString);

  console.log("[Telegram] Initializing GramJS MTProto client...");
  telegramClient = new TelegramClient(
    session,
    config.telegram.apiId,
    config.telegram.apiHash,
    {
      connectionRetries: 5,
    }
  );

  await telegramClient.start({
    phoneNumber: async () => {
      return await input.text("Enter your Telegram phone number (e.g. +251...): ");
    },
    password: async () => {
      return await input.password("Enter your Telegram 2FA password (if enabled): ");
    },
    phoneCode: async () => {
      return await input.text("Enter the verification code received on Telegram/SMS: ");
    },
    onError: (err) => {
      console.error("[Telegram Auth Error]", err.message);
    },
  });

  // Save the authenticated session to disk
  const newSessionString = telegramClient.session.save();
  await saveSessionString(newSessionString);

  // Verify authentication and fetch current user
  const me = await telegramClient.getMe();
  const username = me.username ? `@${me.username}` : "No username";
  const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ");

  console.log(`[Telegram] Successfully logged in as: ${fullName} (${username}, ID: ${me.id})`);
  console.log(`[Telegram] Session saved persistently to: ${config.telegram.sessionFilePath}`);

  return telegramClient;
}

/**
 * Returns the active Telegram client instance, or null if not yet initialized.
 *
 * @returns {TelegramClient|null}
 */
export function getTelegramClient() {
  return telegramClient;
}

/**
 * Disconnects the Telegram client gracefully.
 *
 * @returns {Promise<void>}
 */
export async function disconnectTelegramClient() {
  if (telegramClient) {
    try {
      await telegramClient.disconnect();
      console.log("[Telegram] MTProto client disconnected.");
    } catch (error) {
      console.error("[Telegram] Error while disconnecting:", error.message);
    } finally {
      telegramClient = null;
    }
  }
}
