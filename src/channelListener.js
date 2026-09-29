import { NewMessage } from "telegram/events/index.js";
import { getPeerId as getMarkedPeerId } from "telegram/Utils.js";
import { getWatchedChannels } from "./storage.js";

let activeListener = null;

function getPeerId(message) {
  const peerId = message.chatId ?? message.peerId?.channelId ?? message.peerId?.chatId;
  return peerId == null ? "" : peerId.toString();
}

/**
 * Starts listening for new posts in the persisted watchlist.
 * The callback receives a normalized post object suitable for Module 4.
 * Call syncWatchedChannels after changing the watchlist at runtime.
 */
export async function startChannelListener(client, { onPost = () => {} } = {}) {
  if (activeListener) {
    if (activeListener.client === client) return syncWatchedChannels();
    throw new Error("A channel listener is already running for another Telegram client.");
  }

  const listener = {
    client,
    onPost,
    event: new NewMessage({}),
    channelsByPeerId: new Map(),
    channelsByUsername: new Map(),
  };

  listener.handler = async (event) => {
    const message = event.message;
    const peerId = getPeerId(message);
    const channel = listener.channelsByPeerId.get(peerId);
    if (!channel) return;

    const text = typeof message.message === "string" ? message.message.trim() : "";
    if (!text) return; // Module 3 prepares text posts; media-only posts are skipped.

    try {
      await listener.onPost({
        channel,
        channelId: peerId,
        messageId: message.id,
        text,
        date: message.date ? new Date(message.date * 1000) : null,
        message,
      });
    } catch (error) {
      console.error(`[Listener] Post handler failed for @${channel}:`, error.message);
    }
  };

  activeListener = listener;
  await syncWatchedChannels();
  client.addEventHandler(listener.handler, listener.event);
  console.log(`[Listener] Listening to ${listener.channelsByPeerId.size} watched channel(s).`);
  return { watchedChannels: [...listener.channelsByUsername.keys()] };
}

/** Re-resolves the saved watchlist; use after addChannel/removeChannel. */
export async function syncWatchedChannels() {
  const listener = activeListener;
  if (!listener) return { added: [], removed: [] };

  const wanted = await getWatchedChannels();
  const nextByPeerId = new Map();
  const nextByUsername = new Map();
  const added = [];
  const removed = [];

  for (const channel of wanted) {
    try {
      const entity = await listener.client.getEntity(channel);
      const peerId = getMarkedPeerId(entity);
      if (!peerId) throw new Error("Telegram did not return a channel ID.");
      const username = entity.username?.toLowerCase() || channel;
      nextByPeerId.set(peerId, username);
      nextByUsername.set(username, peerId);
      if (!listener.channelsByUsername.has(username)) added.push(username);
    } catch (error) {
      console.error(`[Listener] Could not resolve '${channel}': ${error.message}`);
    }
  }

  for (const username of listener.channelsByUsername.keys()) {
    if (!nextByUsername.has(username)) removed.push(username);
  }

  listener.channelsByPeerId = nextByPeerId;
  listener.channelsByUsername = nextByUsername;
  if (added.length || removed.length) {
    console.log(`[Listener] Watchlist synced (${nextByPeerId.size} channel(s)).`);
  }
  return { added, removed };
}

export async function stopChannelListener() {
  if (!activeListener) return;
  const { client, handler, event } = activeListener;
  client.removeEventHandler(handler, event);
  activeListener = null;
}
