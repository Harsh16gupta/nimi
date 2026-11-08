import { Provider } from "../types.ts";
import { createAnthropic } from "./anthropic.ts";
import { createOpenAICompat } from "./openai-compat.ts";

// Friendly error instead of cryptic "undefined" client crash.
function requireKey(envVar: string, provider: string): string {
    const key = process.env[envVar];
    if (!key) throw new Error(`Missing ${envVar} for ${provider}. Add it to .env or environment.`);
    return key;
}

const providers:Record<string, ()=>Provider>={
    anthropic:createAnthropic,
    "anthropic-openai":()=>createOpenAICompat("anthropic-openai","https://api.anthropic.com/v1/",requireKey("ANTHROPIC_API_KEY","anthropic-openai"),"claude-sonnet-5"),
    "groq":()=>createOpenAICompat("groq","https://api.groq.com/openai/v1",requireKey("GROQ_API_KEY","groq"),"qwen/qwen3.8-27b"),
    "meta":()=>createOpenAICompat("meta","https://api.meta.ai/v1",requireKey("META_API_KEY","meta"),"muse-spark-1.3-contributor"),
    "deepseek":()=>createOpenAICompat("deepseek","https://api.deepseek.com",requireKey("DEEPSEEK_API_KEY","deepseek"),"deepseek-flash"),
    "openai":()=>createOpenAICompat("openai","https://api.openai.com/v1",requireKey("OPENAI_API_KEY","openai"),"gpt-4o-mini")
}

export function getProvider(name:string):Provider {
    const create = providers[name];
    if(!create){
        throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(providers).join(", ")}`)
    }
    return create();
}
