// Registry of known models and their context windows.
// Used for validation, defaults, and later compaction budgets.
export type ModelInfo = { id: string; provider: string; contextWindow: number };

export const MODELS: ModelInfo[] = [
    { id: "claude-sonnet-5", provider: "anthropic", contextWindow: 200000 },
    { id: "qwen/qwen3.8-27b", provider: "groq", contextWindow: 128000 },
    { id: "muse-spark-1.3-contributor", provider: "meta", contextWindow: 128000 },
    { id: "deepseek-flash", provider: "deepseek", contextWindow: 128000 },
    { id: "gpt-4o-mini", provider: "openai", contextWindow: 128000 },
];

// Plain loop so the lookup is visible; returns undefined when unknown.
export function getModelInfo(id: string): ModelInfo | undefined {
    for (const m of MODELS) {
        if (m.id === id) return m;
    }
    return undefined;
}
