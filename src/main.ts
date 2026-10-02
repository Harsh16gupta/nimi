import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import OpenAI from 'openai';

// load the .env next to the code, so mypi works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });


const apiKey = process.env.MODEL_API_KEY;
if (!apiKey) {
  throw new Error('MODEL_API_KEY is not set');
}

const {values} = parseArgs({
    options:{
        prompt: {type: "string", short:"p"},
        model: {type: "string", default:"muse-spark-1.3-contributor"}
    }
})

if(!values.prompt){
    console.log("no prompt sirrrrr");
    process.exit(1);
}

const client = new OpenAI({
  baseURL: 'https://api.meta.ai/v1',
  apiKey,
});

const stream = await client.responses.create({
  model: values.model,
  input: values.prompt,
  max_output_tokens: 1024,
  temperature: 1,
  stream: true
});

for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
        process.stdout.write(event.delta);
    } 

}
