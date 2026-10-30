import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runAgent } from "./agent.ts";
import { getProvider } from "./providers/index.ts";
import { bashTool } from "./tools/bash.ts";
import { readTool } from "./tools/read.ts";
import type { Message, Tool } from "./types.ts";

// load the .env next to the code, so mypi works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

// Read command-line flags: -p "prompt", -z provider, --model name.
const {values} = parseArgs({
    options:{
        prompt: {type: "string", short:"p"},
        provider: {type: "string", default: "meta", short: "z"},
        model: {type: "string"}
    }
})

// No prompt = nothing to do. Exit early with a usage hint.
if(!values.prompt){
    console.log(`no prompt sirrrrr,write - npx mypi -p "prompt" -prov "meta"`);
    process.exit(1);
}

// Pick the provider and model. "!" tells TypeScript "this is not
// undefined here" (we checked values.prompt above, and provider has
// a default, so both are always set at this point).
const provider = getProvider(values.provider!);
const model = values.model ?? provider.defaultModel;
// The conversation history. Starts with just the user's prompt;
// runAgent appends every reply and tool result to this same array.
const messages:Message[] = [{role: "user", content: values.prompt}]
// The tools the model may call. Adding a new tool = append it here.
const tools:Tool[] = [readTool, bashTool];

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

// "final" is the model's last reply. usage = tokens spent (cost),
// stopReason = why it stopped ("stop" = normal answer).
console.log(`\n\n ${provider.name} ... ${model} ... ${final.usage.input} ... ${final.usage.output} ... ${final.stopReason}`);
