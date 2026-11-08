import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// Layered config: global < project < env. CLI flags win over all of this.
export type Settings = {
    provider?: string;
    model?: string;
    systemPromptExtra?: string;
};

export function getGlobalSettingsPath(): string {
    return join(homedir(), ".nimi", "settings.json");
}

export function getProjectSettingsPath(): string {
    return join(process.cwd(), ".nimi", "settings.json");
}

export async function loadSettings(): Promise<Settings> {
    const global = await readJsonSafe(getGlobalSettingsPath());
    const project = await readJsonSafe(getProjectSettingsPath());
    const merged: Settings = { ...global, ...project };
    if (process.env.NIMI_PROVIDER) merged.provider = process.env.NIMI_PROVIDER;
    if (process.env.NIMI_MODEL) merged.model = process.env.NIMI_MODEL;
    return merged;
}

// Missing or broken file means "no settings", never a crash.
async function readJsonSafe(path: string): Promise<Settings> {
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(await readFile(path, "utf-8")) as Settings;
    } catch {
        return {};
    }
}
