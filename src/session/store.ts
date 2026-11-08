import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Message } from "../types.ts";

// One line per entry in the JSONL file. Append-only: crash mid-turn
// can't corrupt earlier lines, and resume is just "read all lines".
export type SessionEntry =
    | { type: "session_info"; id: string; created_at: string; model: string; provider: string }
    | { type: "message"; message: Message };

export function getSessionDir(): string {
    return join(process.cwd(), ".nimi", "sessions");
}

export function getSessionPath(id: string): string {
    return join(getSessionDir(), id + ".jsonl");
}

// Short unique id: timestamp + random, safe as a filename.
export function newSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function appendEntry(id: string, entry: SessionEntry): Promise<void> {
    await mkdir(getSessionDir(), { recursive: true });
    await appendFile(getSessionPath(id), JSON.stringify(entry) + "\n", "utf-8");
}

export async function appendMessages(id: string, messages: Message[]): Promise<void> {
    for (const message of messages) {
        await appendEntry(id, { type: "message", message });
    }
}

// Load a session back into messages. Skips blank/corrupt lines so one
// bad line never kills a resume. Returns null when nothing is stored.
export async function loadSession(id: string): Promise<{ info: Extract<SessionEntry, { type: "session_info" }>; messages: Message[] } | null> {
    if (!existsSync(getSessionPath(id))) return null;
    const raw = await readFile(getSessionPath(id), "utf-8");
    let info: Extract<SessionEntry, { type: "session_info" }> | null = null;
    const messages: Message[] = [];
    for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        let entry: SessionEntry;
        try {
            entry = JSON.parse(line) as SessionEntry;
        } catch {
            continue;
        }
        if (entry.type === "session_info") info = entry;
        else if (entry.type === "message") messages.push(entry.message);
    }
    if (!info) return null;
    return { info, messages };
}

// Saved session ids, oldest filename order (ids start with timestamp).
export async function listSessions(): Promise<string[]> {
    await mkdir(getSessionDir(), { recursive: true });
    const files = await readdir(getSessionDir());
    const ids: string[] = [];
    for (const f of files) {
        if (f.endsWith(".jsonl")) ids.push(f.slice(0, -6));
    }
    ids.sort();
    return ids;
}
