import { createInterface } from "node:readline";
import { runAgent } from "../agent.ts";
import { compactMessages, estimateTokens, getContextLimit } from "../agent/compaction.ts";
import { getProvider } from "../providers/index.ts";
import { MODELS, getModelInfo } from "../providers/models.ts";
import { allowAll, createPromptPermission } from "../permissions.ts";
import { appendMessages, listSessions, loadSession } from "../session/store.ts";
import { ALL_TOOLS } from "../tools/index.ts";
import { HELP_TEXT, parseBare, parseSlash } from "../tui/slash.ts";
import type { Message, Provider, Tool } from "../types.ts";

export type ClassicOptions = {
    provider: Provider;
    model: string;
    system: string;
    tools: Tool[];
    sessionId: string;
    initialMessages: Message[];
    yolo: boolean;
    contextLimit?: number;
};

// Plain readline loop for when Ink can't run. Same generator, same
// slash parser, prompt-permission via readline y/a/n.
export async function runClassic(opts: ClassicOptions): Promise<void> {
    let provider = opts.provider;
    let model = opts.model;
    const messages: Message[] = [...opts.initialMessages];
    let saved = messages.length;
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const canUseTool = opts.yolo ? allowAll() : createPromptPermission(rl);
    const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));
    console.log(`nimi ${model} · session ${opts.sessionId.slice(-6)} · /help for commands`);
    if (messages.length > 0) console.log(`Resumed — ${messages.length} messages restored.`);
    if (opts.yolo) console.log("Permission prompts off (--yolo).");
    while (true) {
        const line = (await ask("› ")).trim();
        if (!line) continue;
        const slash = parseSlash(line) ?? parseBare(line);
        if (slash) {
            if (slash.type === "quit") break;
            if (slash.type === "clear") { messages.length = 0; continue; }
            if (slash.type === "help") { console.log(HELP_TEXT); continue; }
            if (slash.type === "context") {
                const used = estimateTokens(messages);
                const limit = getContextLimit(model, opts.contextLimit);
                console.log(limit ? `~${used} / ${limit} tokens` : `~${used} tokens (window unknown)`);
                continue;
            }
            if (slash.type === "compact") {
                const result = await compactMessages(messages, provider, model);
                if (!result.compacted) console.log("History is already short.");
                else { messages.length = 0; messages.push(...result.messages); console.log("Compacted. Summary:\n" + result.summary); }
                continue;
            }
            if (slash.type === "model") {
                if (!slash.arg) {
                    for (const m of MODELS) console.log(`  ${m.id}${m.id === model ? "  ← current" : ""}`);
                } else {
                    const info = getModelInfo(slash.arg);
                    if (!info) console.log(`Unknown model: ${slash.arg}`);
                    else {
                        try { provider = getProvider(info.provider); model = info.id; console.log(`Switched to ${model} — history kept.`); }
                        catch (e) { console.log(e instanceof Error ? e.message : String(e)); }
                    }
                }
                continue;
            }
            if (slash.type === "tools") {
                for (const t of ALL_TOOLS) console.log(`  ${t.name}${t.readOnly ? "  [read-only]" : "  [asks permission]"}`);
                continue;
            }
            if (slash.type === "sessions") {
                const ids = await listSessions();
                if (ids.length === 0) console.log("No saved sessions yet.");
                for (let i = ids.length - 1; i >= 0 && i >= ids.length - 10; i--) {
                    const loaded = await loadSession(ids[i]!);
                    if (loaded) console.log(`  ${loaded.info.id}  ${loaded.info.provider}/${loaded.info.model}`);
                }
                continue;
            }
            if (slash.type === "session") { console.log(`Session ${opts.sessionId} — resume with: nimi --session ${opts.sessionId}`); continue; }
            console.log(`Unknown command: ${(slash as { name: string }).name}. Try /help.`);
            continue;
        }
        messages.push({ role: "user", content: line });
        for await (const event of runAgent({ provider, model, system: opts.system, tools: opts.tools, messages, contextLimit: opts.contextLimit, canUseTool })) {
            if (event.type === "text_delta") process.stdout.write(event.delta);
            else if (event.type === "tool_start") console.log(`\n[tool] ${event.name} ${JSON.stringify(event.input)}`);
            else if (event.type === "denied") console.log(`\n[denied] ${event.name}: ${event.reason}`);
            else if (event.type === "compacted") console.log(`\n[compacted ${event.before} → ${event.after} messages]`);
            else if (event.type === "tool_end") {
                const preview = event.result.length > 300 ? event.result.slice(0, 300) + "..." : event.result;
                console.log(`\n[result] ${event.name}${event.isError ? " (error)" : ""}:\n${preview}`);
            } else if (event.type === "turn_end" || event.type === "agent_end") process.stdout.write("\n");
        }
        const fresh = messages.slice(saved);
        if (fresh.length > 0) { saved = messages.length; await appendMessages(opts.sessionId, fresh); }
    }
    rl.close();
}
