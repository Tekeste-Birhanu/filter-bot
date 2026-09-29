import { config } from "./src/config.js";
import { loadState } from "./src/storage.js";
import { initTelegramClient } from "./src/telegram.js";
import { startChannelListener } from "./src/channelListener.js";

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

  await startChannelListener(client, {
    onPost: async (post) => {
      console.log(`[Listener] New post from @${post.channel} (message ${post.messageId})`);
      // Module 4 will consume this prepared post object for LLM filtering.
    },
  });

  console.log("Module 3 (Channel Listener) initialized successfully.");
}

main().catch((err) => {
  console.error("Fatal initialization error:", err.message);
  process.exit(1);
});
