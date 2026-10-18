import { Provider } from "../types.ts";
import { createAnthropic } from "./anthropic.ts";
import { createOpenAICompat } from "./openai-compat.ts";

const providers:Record<string, ()=>Provider>={
    anthropic:createAnthropic,
    "anthropic-openai":()=>createOpenAICompat("anthropic-openai","https://api.anthropic.com/v1/",process.env.ANTHROPIC_API_KEY!,"claude-sonnet-5"),
    "groq":()=>createOpenAICompat("groq","https://api.groq.com/openai/v1",process.env.GROQ_API_KEY!,"qwen/qwen3.8-27b"),
    "meta":()=>createOpenAICompat("meta","https://api.meta.ai/v1",process.env.META_API_KEY!,"muse-spark-1.3-contributor"),
    "deepseek":()=>createOpenAICompat("deepseek","https://api.deepseek.com",process.env.DEEPSEEK_API_KEY!,"deepseek-flash")
}

export function getProvider(name:string):Provider {
    const create = providers[name];
    if(!create){
        throw new Error("gdbd")
    }
    return create();
}