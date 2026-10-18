import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import OpenAI from 'openai';
import { getProvider } from "./providers/index.ts";
import { readTool } from "./tools/read.ts";
import type { Message, Tool } from "./types.ts";

// load the .env next to the code, so mypi works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const {values} = parseArgs({
    options:{
        prompt: {type: "string", short:"p"},
        provider: {type: "string", default: "deepseek", short: "z"},
        model: {type: "string"}
    }
})

if(!values.prompt){
    console.log(`no prompt sirrrrr,write - npx mypi -p "prompt" -prov "meta"`);
    process.exit(1);
}

const provider = getProvider(values.provider);
const model = values.model ?? provider.defaultModel;
const messages:Message[] = [{role: "user", content: values.prompt}]
const tools:Tool[] = [readTool];

for await(const event of provider.stream({messages,model,tools})){
    if(event.type==="text_delta") process.stdout.write(event.delta);
    else {
        const {usage, stopReason}= event.message;
        console.log(`\n\n ${provider.name} ... ${model} ... ${usage.input} ... ${usage.output}  ... ${stopReason}`)
    }
}