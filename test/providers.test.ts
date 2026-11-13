import { afterEach, describe, expect, it } from "vitest";
import { customMeta, getProvider, getProviderMeta, listProviders, PROVIDER_DEFS } from "../src/providers/index.ts";
import { MODELS, resolveModelReference } from "../src/providers/models.ts";

// Offline catalog invariants: no network, no API keys. getProvider() is
// only called for the custom-without-endpoint path, which throws before
// any key resolution.

const savedEnv = { ...process.env };

afterEach(() => {
    process.env = { ...savedEnv };
});

describe("provider catalog", () => {
    it("every hardcoded provider default model has a catalog entry", () => {
        for (const meta of Object.values(PROVIDER_DEFS)) {
            const found = MODELS.some((m) => m.provider === meta.id && m.id === meta.defaultModel);
            expect(found, `${meta.id} default ${meta.defaultModel} missing from MODELS`).toBe(true);
        }
    });

    it("has no duplicate provider/id pairs", () => {
        const keys = MODELS.map((m) => `${m.provider}/${m.id}`);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it("lists custom alongside hardcoded providers", () => {
        const ids = listProviders().map((p) => p.id);
        expect(ids).toContain("custom");
        for (const id of Object.keys(PROVIDER_DEFS)) expect(ids).toContain(id);
    });

    it("rejects unknown providers and names custom as an option", () => {
        expect(() => getProviderMeta("tencent")).toThrow(/custom/);
    });

    it("custom resolves endpoint and model from env", () => {
        process.env.NIMI_BASE_URL = "https://example.com/v1";
        process.env.NIMI_MODEL = "my-model";
        const meta = getProviderMeta("custom");
        expect(meta.baseURL).toBe("https://example.com/v1");
        expect(meta.defaultModel).toBe("my-model");
        expect(customMeta().envVar).toBe("NIMI_API_KEY");
    });

    it("custom without an endpoint fails with a clear error before key lookup", () => {
        delete process.env.NIMI_BASE_URL;
        delete process.env.OPENAI_BASE_URL;
        expect(() => getProvider("custom")).toThrow(/NIMI_BASE_URL/);
    });
});

describe("model catalog", () => {
    it("resolves newly added leaderboard models", () => {
        expect(resolveModelReference("grok-4.7", "xai")?.contextWindow).toBe(500000);
        expect(resolveModelReference("kimi-k3.1-pro", "kimi")?.contextWindow).toBe(1000000);
        expect(resolveModelReference("gemini-4-carbon", "google")?.contextWindow).toBe(1048576);
        expect(resolveModelReference("muse-wonder", "meta")?.contextWindow).toBe(1000000);
        expect(resolveModelReference("qwen3.8-max", "alibaba")?.contextWindow).toBe(984000);
        expect(resolveModelReference("glm-5.3", "zai")?.contextWindow).toBe(1000000);
        expect(resolveModelReference("deepseek-v4.1-flash", "deepseek")?.contextWindow).toBe(1000000);
    });
});
