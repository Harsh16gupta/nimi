import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { runAgent } from "./agent.ts";
import { parseArgs, printHelp, printVersion } from "./cli/arg.ts";
import { buildSystemPrompt } from "./config/system-prompt.ts";
import { getProvider } from "./providers/index.ts";
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

// Piped / non-interactive: keep the old one-shot behavior so scripts
// and non-TTY environments still work. Needs an explicit prompt.
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  if (!args.prompt) {
    console.error('No prompt given. Run "nimi --help" for usage.');
    process.exit(1);
  }
  const messages: Message[] = [{ role: "user", content: args.prompt }];
  await runAgent({
    provider,
    model,
    system,
    messages,
    tools: ALL_TOOLS,
    onEvent: (event) => {
      if (event.type === "text_delta") process.stdout.write(event.delta);
      else if (event.type === "tool_call") {
        console.log(`\n\n[tool] ${event.block.name} ${JSON.stringify(event.block.arguments)}`);
      } else if (event.type === "tool_result") {
        const preview = event.content.length > 500 ? event.content.slice(0, 500) + "..." : event.content;
        console.log(`[result] ${event.toolName}${event.isError ? " (error)" : ""}:\n${preview}`);
      }
    },
  });
  process.exit(0);
}

// Interactive: always launch the Ink TUI.
const { render } = await import("ink");
const { default: App } = await import("./tui/App.tsx");

render(
  <App provider={provider} model={model} system={system} tools={ALL_TOOLS} initialPrompt={args.prompt} />,
);
