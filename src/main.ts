import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { runAgent } from "./agent.ts";
import { parseArgs, printHelp, printVersion } from "./cli/arg.ts";
import { getProvider } from "./providers/index.ts";
import { bashTool } from "./tools/bash.ts";
import { readTool } from "./tools/read.ts";
import { writeTool } from "./tools/write.ts";
import type { Message, Tool } from "./types.ts";
import { editTool } from "./tools/edit.ts";

// load the .env next to the code, so nimi works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

// Read command-line flags: -p "prompt", -z provider, --model name.
// Bad flags exit with a short error instead of a stack trace.
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

// No prompt = nothing to do. Exit early with a usage hint.
if (!args.prompt) {
    console.error('No prompt given. Run "nimi --help" for usage.');
    process.exit(1);
}

// Pick the provider and model. The provider has a default and the
// prompt is checked above, so both are always set at this point.
const provider = getProvider(args.provider);
const model = args.model ?? provider.defaultModel;
// The conversation history. Starts with just the user's prompt;
// runAgent appends every reply and tool result to this same array.
const messages:Message[] = [{role: "user", content: args.prompt}]
// The tools the model may call. Adding a new tool = append it here.
const tools:Tool[] = [readTool, bashTool, writeTool, editTool];

// The whole agent loop lives in runAgent. onEvent fires for every
// AgentEvent (text piece, tool call, tool result, done) so we can
// print live progress while the loop runs underneath.
const final = await runAgent({
    provider,
    messages,
    model,
    tools,
    onEvent: (event) => {
        // Narrowing again: each branch knows exactly which fields exist.
        if (event.type === "text_delta") process.stdout.write(event.delta);
        else if (event.type === "tool_call") {
            console.log(`\n\n[tool] ${event.block.name} ${JSON.stringify(event.block.arguments)}`);
        } else if (event.type === "tool_result") {
            // Long outputs (whole files) would flood the terminal,
            // so show only the first 500 characters.
            const preview = event.content.length > 500
                ? event.content.slice(0, 500) + "..."
                : event.content;
            console.log(`[result] ${event.toolName}${event.isError ? " (error)" : ""}:\n${preview}`);
        }
    },
});

//console.log(`\n\n ######### ${provider.name} ... ${model} ... ${final.usage.input} ... ${final.usage.output} ... ${final.stopReason}`);
