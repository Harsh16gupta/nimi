// Registry of known models and their context windows.
// Hardcoded catalog (no network calls): the picker and /model switcher
// resolve against this list. Entries are provider+id pairs — the same id
// may appear under two providers (e.g. anthropic vs anthropic-openai).
//
// Sources (checked Nov 2026): Anthropic model overview (platform.claude.com),
// OpenAI model catalog (platform.openai.com), Groq supported models
// (console.groq.com/docs/models), DeepSeek pricing (api-docs.deepseek.com),
// xAI model catalog (docs.x.ai), Moonshot platform (platform.moonshot.ai),
// Gemini API OpenAI compatibility (ai.google.dev/gemini-api/docs/openai).
// Legacy entries are kept so old sessions and configs keep resolving.

export type ModelInfo = { id: string; provider: string; contextWindow: number };

export const MODELS: ModelInfo[] = [
    // Anthropic (native SDK). Current gen is 1M context across the line.
    { id: "claude-sonnet-5", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-opus-5-5", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-sonnet-5-5", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-haiku-5-5", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-fable-5-2", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-opus-5", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-sonnet-4-6", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-opus-4-6", provider: "anthropic", contextWindow: 1000000 },
    { id: "claude-sonnet-4-5", provider: "anthropic", contextWindow: 200000 },
    { id: "claude-opus-4-5", provider: "anthropic", contextWindow: 200000 },
    { id: "claude-haiku-4-5", provider: "anthropic", contextWindow: 200000 },
    // Anthropic via OpenAI-compatible endpoint (same key, different baseURL).
    { id: "claude-sonnet-5", provider: "anthropic-openai", contextWindow: 1000000 },
    { id: "claude-opus-5-5", provider: "anthropic-openai", contextWindow: 1000000 },
    { id: "claude-sonnet-5-5", provider: "anthropic-openai", contextWindow: 1000000 },
    { id: "claude-haiku-5-5", provider: "anthropic-openai", contextWindow: 1000000 },
    { id: "claude-fable-5-2", provider: "anthropic-openai", contextWindow: 1000000 },
    { id: "claude-opus-5", provider: "anthropic-openai", contextWindow: 1000000 },
    // Groq (OpenAI-compatible). Production models per Groq docs; Qwen stays
    // first for back-compat (it is the configured default).
    { id: "qwen/qwen3.8-27b", provider: "groq", contextWindow: 131072 },
    { id: "llama-3.3-70b-versatile", provider: "groq", contextWindow: 131072 },
    { id: "llama-3.1-8b-instant", provider: "groq", contextWindow: 131072 },
    { id: "openai/gpt-oss-120b", provider: "groq", contextWindow: 131072 },
    { id: "openai/gpt-oss-20b", provider: "groq", contextWindow: 131072 },
    { id: "openai/gpt-oss-safeguard-20b", provider: "groq", contextWindow: 131072 },
    { id: "meta-models/muse-spark-open", provider: "groq", contextWindow: 131072 },
    { id: "minimaxai/minimax-m2.7", provider: "groq", contextWindow: 196608 },
    { id: "deepseek-r1-distill-llama-70b", provider: "groq", contextWindow: 128000 },
    { id: "mixtral-8x7b-32768", provider: "groq", contextWindow: 32768 },
    // Meta.
    { id: "muse-spark-1.3-contributor", provider: "meta", contextWindow: 128000 },
    { id: "meta-models/muse-spark-open", provider: "meta", contextWindow: 131072 },
    { id: "llama-4-maverick", provider: "meta", contextWindow: 128000 },
    { id: "llama-4-scout", provider: "meta", contextWindow: 128000 },
    // DeepSeek. Flash and V4 Pro are 1M context (DeepSeek-V4.1-Flash-1017 /
    // DeepSeek-V4-Pro-0813); chat/reasoner kept for old sessions.
    { id: "deepseek-flash", provider: "deepseek", contextWindow: 1000000 },
    { id: "deepseek-v4-pro", provider: "deepseek", contextWindow: 1000000 },
    { id: "deepseek-chat", provider: "deepseek", contextWindow: 128000 },
    { id: "deepseek-reasoner", provider: "deepseek", contextWindow: 128000 },
    // OpenAI. GPT-6 line is 1.05M context; GPT-5 line is 400K.
    { id: "gpt-4o-mini", provider: "openai", contextWindow: 128000 },
    { id: "gpt-6-astra", provider: "openai", contextWindow: 1050000 },
    { id: "gpt-6.1-sol", provider: "openai", contextWindow: 1050000 },
    { id: "gpt-6.1-terra", provider: "openai", contextWindow: 1050000 },
    { id: "gpt-6-luna", provider: "openai", contextWindow: 1050000 },
    { id: "gpt-5", provider: "openai", contextWindow: 400000 },
    { id: "gpt-5-mini", provider: "openai", contextWindow: 400000 },
    { id: "gpt-4o", provider: "openai", contextWindow: 128000 },
    { id: "o3-mini", provider: "openai", contextWindow: 200000 },
    // xAI (Grok, OpenAI-compatible). Grok 4 line is 256K context.
    { id: "grok-4", provider: "xai", contextWindow: 256000 },
    { id: "grok-4-1-fast", provider: "xai", contextWindow: 2000000 },
    { id: "grok-3", provider: "xai", contextWindow: 131072 },
    // Kimi (Moonshot, OpenAI-compatible). K2 line is 256K context;
    // moonshot-v1 kept for old sessions.
    { id: "kimi-k2", provider: "kimi", contextWindow: 256000 },
    { id: "kimi-k2-thinking", provider: "kimi", contextWindow: 256000 },
    { id: "moonshot-v1-128k", provider: "kimi", contextWindow: 128000 },
    // Google (Gemini API via OpenAI-compatible endpoint). 2.5 line is 1M context.
    { id: "gemini-2.5-flash", provider: "google", contextWindow: 1048576 },
    { id: "gemini-2.5-pro", provider: "google", contextWindow: 1048576 },
    { id: "gemini-2.0-flash", provider: "google", contextWindow: 1048576 },
];

// Plain loop so the lookup is visible; returns undefined when unknown.
export function getModelInfo(id: string): ModelInfo | undefined {
    for (const m of MODELS) {
        if (m.id === id) return m;
    }
    return undefined;
}

// All entries for one provider (picker scope + Ctrl+P cycling).
export function getModelsByProvider(provider: string): ModelInfo[] {
    return MODELS.filter((m) => m.provider === provider);
}

// Resolve "provider/id" or bare "id" (pi-style model references).
// Bare ids prefer an entry from `preferProvider` when duplicated.
export function resolveModelReference(
    ref: string,
    preferProvider?: string,
): ModelInfo | undefined {
    const trimmed = ref.trim();
    if (!trimmed) return undefined;
    const slash = trimmed.indexOf("/");
    // Only treat `a/b` as provider/id when the head is not part of a
    // model id itself (groq ids contain slashes: qwen/qwen3.8-27b).
    // Try the full string as a bare id first — exact ids always win.
    const exact = getModelInfo(trimmed);
    if (exact && !preferProvider) return exact;
    if (exact && preferProvider) {
        const preferred = MODELS.find((m) => m.id === trimmed && m.provider === preferProvider);
        if (preferred) return preferred;
        return exact;
    }
    if (slash !== -1) {
        const head = trimmed.slice(0, slash);
        const tail = trimmed.slice(slash + 1);
        const scoped = MODELS.find((m) => m.provider === head && m.id === tail);
        if (scoped) return scoped;
    }
    return undefined;
}

// Search text for the picker: provider-first so "anthropic opus"
// ranks provider matches above proxy-id noise (pi's model-search.ts).
export function getModelSearchText(m: ModelInfo): string {
    return `${m.provider} ${m.provider}/${m.id} ${m.id}`;
}
