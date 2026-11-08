import { config } from "dotenv";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { runAgent } from "./agent.ts";
import { parseArgs, printHelp, printVersion } from "./cli/arg.ts";
import { buildSystemPrompt } from "./config/system-prompt.ts";
import { allowAll, createPromptPermission } from "./permissions.ts";
import { getProvider } from "./providers/index.ts";
import { appendEntry, appendMessages, listSessions, loadSession, newSessionId } from "./session/store.ts";
import { ALL_TOOLS } from "./tools/index.ts";
import type { Message } from "./types.ts";

// load the .env next to the code, so nimi works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

let args: ReturnType<typeof parseArgs>;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('Run "nimi --help" for usage.');
  process.exit(1);
}

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.version) {
  printVersion();
  process.exit(0);
}

const provider = getProvider(args.provider);
const model = args.model ?? provider.defaultModel;
const system = await buildSystemPrompt();

// List saved sessions (id + date + first prompt) newest first, then exit.
if (args.listSessions) {
  const ids = await listSessions();
  if (ids.length === 0) console.log("No saved sessions yet.");
  for (let i = ids.length - 1; i >= 0; i--) {
    const loaded = await loadSession(ids[i]!);
    let first = "(no prompt)";
    if (loaded) {
      for (const m of loaded.messages) {
        if (m.role === "user") {
          first = m.content.replace(/\s+/g, " ").slice(0, 60);
          break;
        }
      }
      console.log(`${loaded.info.id} ${loaded.info.created_at} [${loaded.info.provider}/${loaded.info.model}] ${first}`);
    }
  }
  process.exit(0);
}

// Piped / non-interactive: keep the old one-shot behavior so scripts
// and non-TTY environments still work. Needs an explicit prompt.
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  if (!args.prompt) {
    console.error('No prompt given. Run "nimi --help" for usage.');
    process.exit(1);
  }
  // Resume keeps prior messages so the model continues with context;
  // fresh runs mint an id and store session_info first.
  let messages: Message[];
  let sessionId: string;
  if (args.session) {
    const loaded = await loadSession(args.session);
    if (!loaded) {
      console.error(`No such session: ${args.session}. Run "--list-sessions" to see saved ids.`);
      process.exit(1);
    }
    messages = [...loaded.messages, { role: "user", content: args.prompt }];
    sessionId = loaded.info.id;
  } else {
    sessionId = newSessionId();
    messages = [{ role: "user", content: args.prompt }];
    await appendEntry(sessionId, { type: "session_info", id: sessionId, created_at: new Date().toISOString(), model, provider: args.provider });
  }
  console.error(`Session ${sessionId} — resume with: --session ${sessionId}`);
  const before = messages.length;
  // --yolo skips prompts; otherwise ask y/a/n for each write tool.
  const rl = args.yolo ? null : createInterface({ input: process.stdin, output: process.stdout });
  const canUseTool = args.yolo ? allowAll() : createPromptPermission(rl!);
  try {
    for await (const event of runAgent({
      provider,
      model,
      system,
      messages,
      tools: ALL_TOOLS,
      canUseTool,
    })) {
      if (event.type === "text_delta") process.stdout.write(event.delta);
      else if (event.type === "tool_start") {
        console.log(`\n\n[tool] ${event.name} ${JSON.stringify(event.input)}`);
      } else if (event.type === "denied") {
        console.log(`\n[denied] ${event.name}: ${event.reason}`);
      } else if (event.type === "tool_end") {
        const preview = event.result.length > 500 ? event.result.slice(0, 500) + "..." : event.result;
        console.log(`[result] ${event.name}${event.isError ? " (error)" : ""}:\n${preview}`);
      }
    }
  } finally {
    rl?.close();
  }
  // runAgent mutates messages in place: persist only what this run added.
  await appendMessages(sessionId, messages.slice(before));
  process.exit(0);
}

// Interactive: always launch the Ink TUI.
const { render } = await import("ink");
const { default: App } = await import("./tui/App.tsx");

// TUI sessions persist like print mode: resume loads history,
// fresh runs store session_info up front, each turn appends after.
let tuiMessages: Message[];
let tuiSessionId: string;
if (args.session) {
  const loaded = await loadSession(args.session);
  if (!loaded) {
    console.error(`No such session: ${args.session}. Run "--list-sessions" to see saved ids.`);
    process.exit(1);
  }
  tuiMessages = loaded.messages;
  tuiSessionId = loaded.info.id;
} else {
  tuiSessionId = newSessionId();
  tuiMessages = [];
  await appendEntry(tuiSessionId, { type: "session_info", id: tuiSessionId, created_at: new Date().toISOString(), model, provider: args.provider });
}

render(
  <App provider={provider} model={model} system={system} tools={ALL_TOOLS} initialPrompt={args.prompt} yolo={args.yolo} sessionId={tuiSessionId} initialMessages={tuiMessages} />,
);
