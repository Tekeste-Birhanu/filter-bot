import { config } from "./src/config.js";
import { loadState } from "./src/storage.js";
import { disconnectTelegramClient, initTelegramClient } from "./src/telegram.js";
import { startChannelListener, stopChannelListener } from "./src/channelListener.js";
import { filterAndForwardPost } from "./src/filterForward.js";
import { startManagementBot, stopManagementBot } from "./src/managementBot.js";
import { createPostQueue } from "./src/postQueue.js";

async function main() {
  console.log("==========================================");
  console.log("       Telegram Filter-Bot Starting       ");
  console.log("==========================================");
  console.log(`[Config] Telegram API ID: ${config.telegram.apiId}`);
  console.log(`[Config] Allowed User ID: ${config.telegram.allowedUserId}`);
  console.log(`[Config] Gemini Model: ${config.gemini.model}`);
  console.log(`[Config] Session Storage: ${config.telegram.sessionFilePath}`);
  console.log(`[Config] Channels Store: ${config.storage.channelsFilePath}`);
  console.log("Environment configuration validated successfully.\n");

  // Initialize and load persistent JSON state (Module 2)
  console.log("[State] Initializing persistent storage...");
  const state = await loadState();
  console.log(`[State] Watched Channels: [${state.watchedChannels.join(", ")}]`);
  console.log(`[State] Destination Channel: ${state.destChannel || "(none set)"}`);
  console.log(`[State] Filter Prompt: ${state.prompt ? `"${state.prompt}"` : "(none set)"}\n`);

  // Initialize GramJS MTProto client & session persistence (Module 2)
  console.log("[Telegram] Connecting to Telegram MTProto...");
  const client = await initTelegramClient();
  console.log("[Telegram] MTProto connection established and authenticated.\n");

  const postQueue = createPostQueue((post) => filterAndForwardPost(client, post));
  await startChannelListener(client, { onPost: (post) => postQueue.enqueue(post) });

  const managementBot = startManagementBot(client);
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[Shutdown] Stopping Telegram clients...");
    try {
      await stopManagementBot(managementBot);
    } catch (error) {
      console.error("[Shutdown] Could not stop management bot cleanly:", error.message);
    }
    await stopChannelListener();
    await disconnectTelegramClient();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  console.log("Modules 3 (Channel Listener), 4 (LLM Filter & Forward), 5 (Bot Commands), and 6 (Resilience & Concurrency) initialized successfully.");
}

main().catch((err) => {
  console.error("Fatal initialization error:", err.message);
  process.exit(1);
});
