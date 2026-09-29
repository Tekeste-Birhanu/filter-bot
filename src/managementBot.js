import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";
import { config } from "./config.js";
import {
  addChannels,
  getDestChannel,
  getPrompt,
  getWatchedChannels,
  normalizeChannel,
  removeChannel,
  setDestChannel,
  setPrompt,
} from "./storage.js";
import { syncWatchedChannels } from "./channelListener.js";

const HELP = [
  "Available commands:",
  "/addchannel @channel1 @channel2 ... - add up to 20 channels",
  "/removechannel @username - remove a watched channel",
  "/listchannels - show the current watchlist",
  "/prompt your filter instructions - set the Gemini filter prompt",
  "/destchannel @username - set where matches are forwarded",
  "/settings - show prompt and destination status",
  "/help - show this help",
].join("\n");

function cleanChannelInput(value) {
  const input = value.trim().replace(/^https?:\/\/(www\.)?t\.me\//i, "").split(/[?#]/, 1)[0];
  return normalizeChannel(input.replace(/^@/, "").replace(/\/$/, ""));
}

function parsePrompt(value) {
  const prompt = value.trim();
  if (prompt.length >= 2 && ((prompt.startsWith('"') && prompt.endsWith('"')) || (prompt.startsWith("'") && prompt.endsWith("'")))) {
    return prompt.slice(1, -1).trim();
  }
  return prompt;
}

async function resolveChannel(client, channel, { requireBroadcast = false } = {}) {
  const entity = await client.getEntity(channel);
  if (requireBroadcast && (!entity || entity.className !== "Channel" || !entity.broadcast)) {
    throw new Error("That username does not resolve to a Telegram broadcast channel the account can access.");
  }
  return entity;
}

let pollingTask = null;

export function startManagementBot(client) {
  const bot = new Bot(config.telegram.botToken);

  bot.catch((error) => {
    console.error("[Management Bot] Update handler failed:", error.message || error);
  });

  bot.on("message", async (context) => {
    const message = context.message;
    if (context.chat?.type !== "private" || context.from?.id !== config.telegram.allowedUserId) return;
    if (typeof message?.text !== "string") return;

    const match = /^\/([a-z]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(message.text.trim());
    if (!match) return;

    const command = match[1].toLowerCase();
    const argument = match[2] || "";
    const reply = async (text) => context.reply(text);

    try {
      switch (command) {
        case "start":
        case "help":
          await reply(HELP);
          break;

        case "addchannel": {
          const channels = [...new Set(argument.split(/[\s,]+/).map(cleanChannelInput).filter(Boolean))];
          if (!channels.length) return await reply("Usage: /addchannel @channel1 @channel2");
          if (channels.length > 20) return await reply("Add up to 20 channels per command.");

          const valid = [];
          const failures = [];
          for (const channel of channels) {
            try {
              await resolveChannel(client, channel, { requireBroadcast: true });
              valid.push(channel);
            } catch (error) {
              failures.push(`- @${channel}: ${error.message.slice(0, 160)}`);
            }
          }

          const results = await addChannels(valid);
          const added = results.filter((result) => result.success).map((result) => `- @${result.channel}`);
          const duplicates = results.filter((result) => !result.success).map((result) => `- @${result.channel}: already watched`);
          if (added.length) await syncWatchedChannels();

          const lines = [
            added.length ? `Added (${added.length}):\n${added.join("\n")}` : "No channels added.",
            duplicates.length ? `Already watched:\n${duplicates.join("\n")}` : "",
            failures.length ? `Could not add:\n${failures.join("\n")}` : "",
          ].filter(Boolean);
          await reply(lines.join("\n\n"));
          break;
        }

        case "removechannel": {
          const channel = cleanChannelInput(argument);
          if (!channel) return await reply("Usage: /removechannel @username");
          const result = await removeChannel(channel);
          if (result.success) {
            await syncWatchedChannels();
          }
          await reply(result.message);
          break;
        }

        case "listchannels": {
          const channels = await getWatchedChannels();
          await reply(channels.length ? `Watched channels:\n${channels.map((name) => `- @${name}`).join("\n")}` : "No channels are being watched yet.");
          break;
        }

        case "prompt": {
          const prompt = parsePrompt(argument);
          if (!prompt) return await reply("Usage: /prompt describe which posts should match");
          await setPrompt(prompt);
          await reply("Filter prompt saved.");
          break;
        }

        case "destchannel": {
          const destination = cleanChannelInput(argument);
          if (!destination) return await reply("Usage: /destchannel @username");
          await resolveChannel(client, destination);
          await setDestChannel(destination);
          await reply(`Forward destination set to @${destination}.`);
          break;
        }

        case "settings": {
          const [prompt, destination] = await Promise.all([getPrompt(), getDestChannel()]);
          await reply([
            `Filter prompt: ${prompt || "(not set)"}`,
            `Destination: ${destination ? `@${destination}` : "(not set)"}`,
          ].join("\n\n"));
          break;
        }

        default:
          await reply("Unknown command. Send /help to see available commands.");
      }
    } catch (error) {
      console.error(`[Management Bot] /${command} failed:`, error.message);
      try {
        await reply(`Could not complete /${command}: ${error.message}`);
      } catch (replyError) {
        console.error("[Management Bot] Could not send command error reply:", replyError.message);
      }
    }
  });

  pollingTask = run(bot, {
    retry: true,
    retryDelayMs: 1000,
    onError: (error) => console.error("[Management Bot] Polling error:", error.message || error),
  });
  console.log("[Management Bot] Started polling for owner commands.");
  return bot;
}

export async function stopManagementBot(bot) {
  if (bot) bot.stop();
  if (pollingTask) {
    await pollingTask;
    pollingTask = null;
  }
}
