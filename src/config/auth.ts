import { mkdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Pi-style credential file: one api_key entry per provider id.
// Keys live in ~/.nimi/auth.json (mode 0600), never in the repo.
// Resolution order everywhere: stored key > process env (.env included).
export type StoredCredential = { type: "api_key"; key?: string };

export function getAuthPath(): string {
    return join(homedir(), ".nimi", "auth.json");
}

// Lenient parse: missing/broken file means "no credentials", never a crash.
function parseAuthJson(raw: string): Record<string, StoredCredential> {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
        const out: Record<string, StoredCredential> = {};
        for (const [id, cred] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof cred === "object" && cred !== null && !Array.isArray(cred)) {
                const key = (cred as { key?: unknown }).key;
                if (key === undefined || typeof key === "string") out[id] = { type: "api_key", key };
            }
        }
        return out;
    } catch {
        return {};
    }
}

export function readAuthFileSync(authPath: string = getAuthPath()): Record<string, StoredCredential> {
    try {
        return parseAuthJson(readFileSync(authPath, "utf-8"));
    } catch {
        return {};
    }
}

export function getStoredKeySync(providerId: string, authPath?: string): string | undefined {
    const key = readAuthFileSync(authPath)[providerId]?.key;
    return key ? key : undefined;
}

// Stored credential wins (pi behavior: stored owns the provider),
// otherwise fall back to the environment (.env is already in process.env).
export function resolveKeySync(providerId: string, envVar: string): string | undefined {
    return getStoredKeySync(providerId) || process.env[envVar] || undefined;
}

export function formatNoApiKeyFoundMessage(providerId: string, envVar: string): string {
    return `No API key found for ${providerId}. Run /login ${providerId} (or set ${envVar}). Credentials are saved to ${getAuthPath()}.`;
}

export async function saveApiKey(providerId: string, key: string, authPath: string = getAuthPath()): Promise<void> {
    const data = readAuthFileSync(authPath);
    data[providerId] = { type: "api_key", key };
    mkdirSync(dirname(authPath), { recursive: true, mode: 0o700 });
    // Mode applies on creation; existing files keep their mode.
    await writeFile(authPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
}

export async function deleteApiKey(providerId: string, authPath: string = getAuthPath()): Promise<boolean> {
    const data = readAuthFileSync(authPath);
    if (!(providerId in data)) return false;
    delete data[providerId];
    await mkdir(dirname(authPath), { recursive: true, mode: 0o700 });
    await writeFile(authPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
    return true;
}
