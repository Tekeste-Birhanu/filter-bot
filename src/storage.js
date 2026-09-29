import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { config } from "./config.js";

/**
 * Default initial state for persistent storage.
 */
const DEFAULT_STATE = {
  watchedChannels: [],
  destChannel: "",
  prompt: "",
};

let cachedState = null;

/**
 * Normalizes a channel username or ID.
 * Strips leading '@', trims whitespace, and converts string usernames to lowercase.
 *
 * @param {string|number} channel
 * @returns {string}
 */
export function normalizeChannel(channel) {
  if (!channel) return "";
  const str = String(channel).trim();
  if (str.startsWith("@")) {
    return str.slice(1).toLowerCase();
  }
  // If it's a numeric ID or link/username without @
  return str.toLowerCase();
}

/**
 * Loads state from persistent JSON storage.
 * If file does not exist, initializes it with default values.
 *
 * @returns {Promise<typeof DEFAULT_STATE>}
 */
export async function loadState() {
  const filePath = config.storage.channelsFilePath;

  try {
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    if (!fsSync.existsSync(filePath)) {
      cachedState = { ...DEFAULT_STATE };
      await saveState(cachedState);
      return cachedState;
    }

    const rawData = await fs.readFile(filePath, "utf-8");
    if (!rawData.trim()) {
      cachedState = { ...DEFAULT_STATE };
      await saveState(cachedState);
      return cachedState;
    }

    const parsed = JSON.parse(rawData);
    cachedState = {
      watchedChannels: Array.isArray(parsed.watchedChannels)
        ? parsed.watchedChannels.map(normalizeChannel).filter(Boolean)
        : [],
      destChannel: parsed.destChannel ? normalizeChannel(parsed.destChannel) : "",
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
    };

    return cachedState;
  } catch (error) {
    console.error(`[Storage] Failed to read ${filePath}:`, error.message);
    // Return default state in case of parse error
    cachedState = { ...DEFAULT_STATE };
    return cachedState;
  }
}

/**
 * Saves current state to persistent JSON storage.
 *
 * @param {typeof DEFAULT_STATE} state
 * @returns {Promise<void>}
 */
export async function saveState(state = cachedState) {
  const filePath = config.storage.channelsFilePath;
  const stateToSave = state || DEFAULT_STATE;

  try {
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    const jsonString = JSON.stringify(stateToSave, null, 2);
    await fs.writeFile(filePath, jsonString, "utf-8");
    cachedState = { ...stateToSave };
  } catch (error) {
    console.error(`[Storage] Failed to save state to ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Gets the current in-memory cached state or loads from disk.
 *
 * @returns {Promise<typeof DEFAULT_STATE>}
 */
export async function getState() {
  if (!cachedState) {
    return await loadState();
  }
  return cachedState;
}

/**
 * Returns the list of currently watched channels.
 *
 * @returns {Promise<string[]>}
 */
export async function getWatchedChannels() {
  const state = await getState();
  return [...state.watchedChannels];
}

/**
 * Adds a channel to the watchlist.
 *
 * @param {string} channel
 * @returns {Promise<{ success: boolean, message: string, channels: string[] }>}
 */
export async function addChannel(channel) {
  const normalized = normalizeChannel(channel);
  if (!normalized) {
    return { success: false, message: "Channel name cannot be empty.", channels: (await getState()).watchedChannels };
  }

  const state = await getState();
  if (state.watchedChannels.includes(normalized)) {
    return {
      success: false,
      message: `Channel '@${normalized}' is already in the watchlist.`,
      channels: state.watchedChannels,
    };
  }

  state.watchedChannels.push(normalized);
  await saveState(state);

  return {
    success: true,
    message: `Channel '@${normalized}' added successfully.`,
    channels: state.watchedChannels,
  };
}

/** Adds multiple normalized channels and persists the updated watchlist once. */
export async function addChannels(channels) {
  const state = await getState();
  const unique = [...new Set((Array.isArray(channels) ? channels : []).map(normalizeChannel).filter(Boolean))];
  const results = [];
  let changed = false;

  for (const channel of unique) {
    if (state.watchedChannels.includes(channel)) {
      results.push({ channel, success: false, reason: "already_watched" });
      continue;
    }
    state.watchedChannels.push(channel);
    results.push({ channel, success: true });
    changed = true;
  }

  if (changed) await saveState(state);
  return results;
}

/**
 * Removes a channel from the watchlist.
 *
 * @param {string} channel
 * @returns {Promise<{ success: boolean, message: string, channels: string[] }>}
 */
export async function removeChannel(channel) {
  const normalized = normalizeChannel(channel);
  if (!normalized) {
    return { success: false, message: "Channel name cannot be empty.", channels: (await getState()).watchedChannels };
  }

  const state = await getState();
  const index = state.watchedChannels.indexOf(normalized);

  if (index === -1) {
    return {
      success: false,
      message: `Channel '@${normalized}' was not found in the watchlist.`,
      channels: state.watchedChannels,
    };
  }

  state.watchedChannels.splice(index, 1);
  await saveState(state);

  return {
    success: true,
    message: `Channel '@${normalized}' removed successfully.`,
    channels: state.watchedChannels,
  };
}

/**
 * Sets the filter prompt.
 *
 * @param {string} prompt
 * @returns {Promise<void>}
 */
export async function setPrompt(prompt) {
  const state = await getState();
  state.prompt = typeof prompt === "string" ? prompt.trim() : "";
  await saveState(state);
}

/**
 * Gets the current filter prompt.
 *
 * @returns {Promise<string>}
 */
export async function getPrompt() {
  const state = await getState();
  return state.prompt;
}

/**
 * Sets the destination channel.
 *
 * @param {string} destChannel
 * @returns {Promise<void>}
 */
export async function setDestChannel(destChannel) {
  const state = await getState();
  state.destChannel = normalizeChannel(destChannel);
  await saveState(state);
}

/**
 * Gets the current destination channel.
 *
 * @returns {Promise<string>}
 */
export async function getDestChannel() {
  const state = await getState();
  return state.destChannel;
}
