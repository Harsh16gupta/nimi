import type { Provider } from "../types.ts";
import { formatNoApiKeyFoundMessage, resolveKeySync } from "../config/auth.ts";
import { createAnthropic } from "./anthropic.ts";
import { createOpenAICompat } from "./openai-compat.ts";

export type ProviderMeta = {
    id: string;
    label: string;
    envVar: string;
    defaultModel: string;
} & ({ kind: "anthropic" } | { kind: "openai-compat"; baseURL: string });

// Single source of truth for provider id -> env var -> default model.
// Mirrors pi's provider catalog (minus OAuth): stored auth.json key wins,
// otherwise the env var below (loaded from .env into process.env).
export const PROVIDER_DEFS: Record<string, ProviderMeta> = {
    anthropic: { id: "anthropic", label: "Anthropic", envVar: "ANTHROPIC_API_KEY", defaultModel: "claude-sonnet-5", kind: "anthropic" },
    "anthropic-openai": { id: "anthropic-openai", label: "Anthropic (OpenAI-compatible)", envVar: "ANTHROPIC_API_KEY", defaultModel: "claude-sonnet-5", baseURL: "https://api.anthropic.com/v1/", kind: "openai-compat" },
    groq: { id: "groq", label: "Groq", envVar: "GROQ_API_KEY", defaultModel: "qwen/qwen3.8-27b", baseURL: "https://api.groq.com/openai/v1", kind: "openai-compat" },
    meta: { id: "meta", label: "Meta", envVar: "META_API_KEY", defaultModel: "muse-spark-1.3-contributor", baseURL: "https://api.meta.ai/v1", kind: "openai-compat" },
    deepseek: { id: "deepseek", label: "DeepSeek", envVar: "DEEPSEEK_API_KEY", defaultModel: "deepseek-flash", baseURL: "https://api.deepseek.com", kind: "openai-compat" },
    openai: { id: "openai", label: "OpenAI", envVar: "OPENAI_API_KEY", defaultModel: "gpt-4o-mini", baseURL: "https://api.openai.com/v1", kind: "openai-compat" },
    xai: { id: "xai", label: "xAI (Grok)", envVar: "XAI_API_KEY", defaultModel: "grok-4", baseURL: "https://api.x.ai/v1", kind: "openai-compat" },
    kimi: { id: "kimi", label: "Kimi (Moonshot)", envVar: "MOONSHOT_API_KEY", defaultModel: "kimi-k2", baseURL: "https://api.moonshot.ai/v1", kind: "openai-compat" },
    google: { id: "google", label: "Google (Gemini)", envVar: "GOOGLE_API_KEY", defaultModel: "gemini-2.5-flash", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", kind: "openai-compat" },
};

// Thrown when a provider is known but has no key in auth.json or env.
// Callers (TUI/classic) catch this to start the /login flow instead of crashing.
export class MissingApiKeyError extends Error {
    readonly provider: string;
    readonly envVar: string;
    constructor(provider: string, envVar: string) {
        super(formatNoApiKeyFoundMessage(provider, envVar));
        this.name = "MissingApiKeyError";
        this.provider = provider;
        this.envVar = envVar;
    }
}

export function listProviders(): ProviderMeta[] {
    return Object.values(PROVIDER_DEFS);
}

export function getProviderMeta(name: string): ProviderMeta {
    const meta = PROVIDER_DEFS[name];
    if (!meta) {
        throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(PROVIDER_DEFS).join(", ")}`);
    }
    return meta;
}

// Default model without requiring a key (used for sessions/help before login).
export function getProviderDefaultModel(name: string): string {
    return getProviderMeta(name).defaultModel;
}

export function getProvider(name: string): Provider {
    const meta = getProviderMeta(name);
    const key = resolveKeySync(meta.id, meta.envVar);
    if (!key) throw new MissingApiKeyError(meta.id, meta.envVar);
    // The Anthropic SDK reads process.env itself, so expose a stored key
    // to it for this process without overwriting an explicit env var.
    if (!process.env[meta.envVar]) process.env[meta.envVar] = key;
    if (meta.kind === "anthropic") {
        return createAnthropic();
    }
    return createOpenAICompat(meta.id, meta.baseURL, key, meta.defaultModel);
}
