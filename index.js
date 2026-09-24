import { config } from "./src/config.js";

async function main() {
  console.log("==========================================");
  console.log("       Telegram Filter-Bot Starting       ");
  console.log("==========================================");
  console.log(`[Config] Telegram API ID: ${config.telegram.apiId}`);
  console.log(`[Config] Allowed User ID: ${config.telegram.allowedUserId}`);
  console.log(`[Config] Gemini Model: ${config.gemini.model}`);
  console.log(`[Config] Session Storage: ${config.telegram.sessionFilePath}`);
  console.log(`[Config] Channels Store: ${config.storage.channelsFilePath}`);
  console.log("Environment configuration validated successfully.");
}

main().catch((err) => {
  console.error("Fatal initialization error:", err.message);
  process.exit(1);
});
