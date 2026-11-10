import { config } from "dotenv";
import { createInterface } from "node:readline";
import { runAgent } from "./agent.ts";
import { parseArgs, getVersion, printHelp, printVersion } from "./cli/arg.ts";
import { buildSystemPrompt } from "./config/system-prompt.ts";
import { loadSettings } from "./config/settings.ts";
import { allowAll, createPromptPermission } from "./permissions.ts";
import { MissingApiKeyError, getProvider, getProviderDefaultModel } from "./providers/index.ts";
import { saveApiKey } from "./config/auth.ts";
import type { Provider } from "./types.ts";
import { appendEntry, appendMessages, listSessions, loadSession, newSessionId } from "./session/store.ts";
import { createTraceRecorder, withTrace } from "./trace/recorder.ts";
import { ALL_TOOLS } from "./tools/index.ts";
import type { Message } from "./types.ts";

// dotenv loads .env from the current working directory, so nimi picks up
// keys wherever it is invoked (global installs must not read the package dir).
config({ quiet: true });

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

const settings = await loadSettings();

// --list-sessions needs no provider, so it runs before key resolution
// (a missing key must not block listing saved sessions).
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

// Precedence: CLI flag > project settings > global settings > env > default.
// A missing key is NOT fatal here: interactive modes open the /login wizard
// (pi behavior) instead of crashing before the TUI renders.
const providerName = args.provider ?? settings.provider ?? "meta";
let provider: Provider | null = null;
let missingAuth: { providerName: string; envVar: string } | null = null;
let model: string;
try {
  provider = getProvider(providerName);
  model = args.model ?? settings.model ?? provider.defaultModel;
} catch (e) {
  if (e instanceof MissingApiKeyError) {
    missingAuth = { providerName: e.provider, envVar: e.envVar };
    try {
      model = args.model ?? settings.model ?? getProviderDefaultModel(providerName);
    } catch (unknownProvider) {
      console.error(unknownProvider instanceof Error ? unknownProvider.message : String(unknownProvider));
      process.exit(1);
    }
  } else {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
const system = await buildSystemPrompt(settings.systemPromptExtra);

// Piped / non-interactive: keep the old one-shot behavior so scripts
// and non-TTY environments still work. --print forces it in a TTY too.
// --classic always wins: an explicit REPL request beats pipe detection.
if (!args.classic && (args.print || !process.stdin.isTTY || !process.stdout.isTTY)) {
  // Headless: no wizard possible, so a missing key is a hard error with
  // the interactive fix attached (pi prints its /login hint here too).
  if (missingAuth) {
    console.error(`No API key found for ${missingAuth.providerName}. Set ${missingAuth.envVar}, or run "nimi" interactively and use /login ${missingAuth.providerName}.`);
    process.exit(1);
  }
  if (!provider) {
    console.error("No provider configured.");
    process.exit(1);
  }
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
    await appendEntry(sessionId, { type: "session_info", id: sessionId, created_at: new Date().toISOString(), model, provider: provider.name });
  }
  console.error(`Session ${sessionId} — resume with: --session ${sessionId}`);
  const before = messages.length;
  // --trace tees every event to JSONL for the showcase site; the loop
  // below renders exactly as without it (withTrace yields through).
  const trace = args.trace
    ? createTraceRecorder(args.trace, {
        session: sessionId,
        provider: provider.name,
        model,
        prompt: args.prompt,
        argv: process.argv.slice(2),
        tools: ALL_TOOLS.map((t) => ({ name: t.name, readOnly: t.readOnly })),
      })
    : null;
  // --yolo skips prompts; otherwise ask y/a/n for each write tool.
  const rl = args.yolo ? null : createInterface({ input: process.stdin, output: process.stdout });
  const canUseTool = args.yolo ? allowAll() : createPromptPermission(rl!);
  try {
    const stream = runAgent({
      provider,
      model,
      system,
      messages,
      tools: ALL_TOOLS,
      contextLimit: args.contextLimit,
      canUseTool,
    });
    for await (const event of trace ? withTrace(stream, trace, messages) : stream) {
      if (event.type === "text_delta") process.stdout.write(event.delta);
      else if (event.type === "compacted") {
        console.log(`\n[compacted ${event.before} → ${event.after} messages]`);
      } else if (event.type === "tool_start") {
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
  await appendEntry(tuiSessionId, { type: "session_info", id: tuiSessionId, created_at: new Date().toISOString(), model, provider: provider?.name ?? providerName });
}

if (args.classic) {
  // Classic REPL can't render the Ink wizard: ask for the key inline once,
  // save it to ~/.nimi/auth.json, then continue with the normal loop.
  if (!provider && missingAuth) {
    const askRl = createInterface({ input: process.stdin, output: process.stdout });
    const answer: string = await new Promise((resolve) => askRl.question(`No API key for ${missingAuth.providerName}. Enter ${missingAuth.envVar} (saved to ~/.nimi/auth.json): `, resolve));
    askRl.close();
    if (!answer.trim()) {
      console.error(`No API key given. Set ${missingAuth.envVar} or run "nimi" and use /login.`);
      process.exit(1);
    }
    await saveApiKey(missingAuth.providerName, answer.trim());
    try {
      provider = getProvider(missingAuth.providerName);
      model = args.model ?? settings.model ?? provider.defaultModel;
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  }
  if (!provider) {
    console.error("No provider configured.");
    process.exit(1);
  }
  const { runClassic } = await import("./modes/classic.ts");
  await runClassic({ provider, model, system, tools: ALL_TOOLS, sessionId: tuiSessionId, initialMessages: tuiMessages, yolo: args.yolo, contextLimit: args.contextLimit, tracePath: args.trace });
  process.exit(0);
}

render(
  <App provider={provider} model={model} version={getVersion()} system={system} tools={ALL_TOOLS} initialPrompt={args.prompt} yolo={args.yolo} sessionId={tuiSessionId} initialMessages={tuiMessages} contextLimit={args.contextLimit} initialSetup={missingAuth} />,
);
