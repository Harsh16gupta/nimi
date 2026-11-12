import { createInterface } from "node:readline";
import { runAgent } from "../agent.ts";
import { compactMessages, estimateTokens, getContextLimit } from "../agent/compaction.ts";
import { MissingApiKeyError, getProvider, getProviderMeta, listProviders } from "../providers/index.ts";
import { deleteApiKey, getAuthPath, saveApiKey } from "../config/auth.ts";
import { MODELS, getModelInfo, getModelSearchText, resolveModelReference } from "../providers/models.ts";
import { fuzzyFilter } from "../tui/fuzzy.ts";
import { allowAll, createPromptPermission } from "../permissions.ts";
import { appendMessages, listSessions, loadSession } from "../session/store.ts";
import { ALL_TOOLS } from "../tools/index.ts";
import { createTraceRecorder } from "../trace/recorder.ts";
import type { TraceRecorder } from "../trace/recorder.ts";
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
    tracePath?: string; // --trace: JSONL showcase trace across all turns
};

// Plain readline loop for when Ink can't run. Same generator, same
// slash parser, prompt-permission via readline y/a/n.
export async function runClassic(opts: ClassicOptions): Promise<void> {
    // Nullable: /logout of the active provider drops it until /login or /model.
    let provider: Provider | null = opts.provider;
    let model = opts.model;
    const messages: Message[] = [...opts.initialMessages];
    let saved = messages.length;
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const canUseTool = opts.yolo ? allowAll() : createPromptPermission(rl);
    // One trace file spans the whole REPL (indices continue across turns);
    // created on the first real prompt so the header names the task.
    let trace: TraceRecorder | null = null;
    const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));
    // Inline /login for non-Ink environments: prompt, save to auth.json, retry.
    const ensureKey = async (providerId: string): Promise<boolean> => {
        try {
            const meta = getProviderMeta(providerId);
            const answer = (await ask(`Enter ${meta.envVar} for ${providerId} (saved to ${getAuthPath()}): `)).trim();
            if (!answer) { console.log("Empty key — cancelled."); return false; }
            await saveApiKey(providerId, answer);
            return true;
        } catch (e) { console.log(e instanceof Error ? e.message : String(e)); return false; }
    };
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
                if (!provider) { console.log("Not logged in. Use /login <provider> first."); continue; }
                const result = await compactMessages(messages, provider, model);
                if (!result.compacted) console.log("History is already short.");
                else { messages.length = 0; messages.push(...result.messages); console.log("Compacted. Summary:\n" + result.summary); }
                continue;
            }
            if (slash.type === "model") {
                if (!slash.arg) {
                    for (const m of MODELS) console.log(`  ${m.provider}/${m.id}${m.id === model ? "  ← current" : ""}`);
                } else {
                    const info = resolveModelReference(slash.arg, provider?.name);
                    if (!info) {
                        console.log(`Unknown model: ${slash.arg}. Closest matches:`);
                        for (const m of fuzzyFilter(MODELS, slash.arg, (c) => getModelSearchText(c)).slice(0, 5)) {
                            console.log(`  ${m.provider}/${m.id}`);
                        }
                    } else {
                        try { provider = getProvider(info.provider); model = info.id; console.log(`Switched to ${model} [${info.provider}] — history kept.`); }
                        catch (e) {
                            console.log(e instanceof Error ? e.message : String(e));
                            if (e instanceof MissingApiKeyError && await ensureKey(e.provider)) {
                                try { provider = getProvider(info.provider); model = info.id; console.log(`Switched to ${model} [${info.provider}] — history kept.`); }
                                catch (retry) { console.log(retry instanceof Error ? retry.message : String(retry)); }
                            }
                        }
                    }
                }
                continue;
            }
            if (slash.type === "provider") {
                if (!slash.arg) {
                    for (const p of listProviders()) console.log(`  ${p.id}${p.id === provider?.name ? "  ← current" : ""}`);
                    continue;
                }
                try {
                    const created = getProvider(slash.arg);
                    provider = created;
                    const current = getModelInfo(model);
                    model = current?.provider === slash.arg ? model : created.defaultModel;
                    console.log(`Switched to ${slash.arg}/${model} — history kept.`);
                } catch (e) {
                    console.log(e instanceof Error ? e.message : String(e));
                    if (e instanceof MissingApiKeyError && await ensureKey(e.provider)) {
                        try {
                            provider = getProvider(slash.arg);
                            const current = getModelInfo(model);
                            model = current?.provider === slash.arg ? model : provider.defaultModel;
                            console.log(`Switched to ${slash.arg}/${model} — history kept.`);
                        } catch (retry) { console.log(retry instanceof Error ? retry.message : String(retry)); }
                    }
                }
                continue;
            }
            if (slash.type === "login") {
                if (!slash.arg) { console.log("Usage: /login <provider>"); continue; }
                try { getProviderMeta(slash.arg); }
                catch (e) { console.log(e instanceof Error ? e.message : String(e)); continue; }
                if (await ensureKey(slash.arg)) {
                    try {
                        provider = getProvider(slash.arg);
                        const current = getModelInfo(model);
                        model = current?.provider === slash.arg ? model : provider.defaultModel;
                        console.log(`Logged in to ${slash.arg}. Credentials saved to ${getAuthPath()}.`);
                    }
                    catch (e) { console.log(e instanceof Error ? e.message : String(e)); }
                }
                continue;
            }
            if (slash.type === "logout") {
                if (!slash.arg) { console.log("Usage: /logout <provider>"); continue; }
                try { getProviderMeta(slash.arg); }
                catch (e) { console.log(e instanceof Error ? e.message : String(e)); continue; }
                const removed = await deleteApiKey(slash.arg);
                console.log(removed ? `Removed stored API key for ${slash.arg}. Environment variables are unchanged.` : `No stored API key for ${slash.arg}.`);
                // Take effect immediately when the active provider was logged out:
                // keep going on its env key if one exists, else require /login.
                if (provider?.name === slash.arg) {
                    try { provider = getProvider(slash.arg); }
                    catch { provider = null; console.log(`Logged out of ${slash.arg} — add a key with /login or switch with /model.`); }
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
        if (!provider) { console.log("Not logged in. Use /login <provider> first."); continue; }
        messages.push({ role: "user", content: line });
        if (opts.tracePath && !trace) {
            trace = createTraceRecorder(opts.tracePath, {
                session: opts.sessionId,
                provider: provider.name,
                model,
                prompt: line,
                argv: process.argv.slice(2),
                tools: opts.tools.map((t) => ({ name: t.name, readOnly: t.readOnly })),
            });
        }
        for await (const event of runAgent({ provider, model, system: opts.system, tools: opts.tools, messages, contextLimit: opts.contextLimit, canUseTool })) {
            trace?.record(event, messages);
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
    // Seal the trace on /quit: the end line carries final totals.
    trace?.finish(messages);
    rl.close();
}
