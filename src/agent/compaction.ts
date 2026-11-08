import type { Message, Provider } from "../types.ts";
import { getModelInfo } from "../providers/models.ts";

// Rough token estimate at ~4 chars per token — good enough for a threshold.
export const KEEP_RECENT = 6; // messages left untouched (roughly the last 3 turns)
const COMPACT_FRACTION = 0.75; // compact once usage passes 75% of the window

export function estimateTokens(messages: Message[]): number {
    let chars = 0;
    for (const m of messages) {
        if (m.role === "user") chars += m.content.length;
        else if (m.role === "assistant") {
            for (const b of m.content) {
                if (b.type === "text") chars += b.text.length;
                else chars += b.name.length + JSON.stringify(b.arguments).length;
            }
        } else chars += m.toolName.length + m.content.length;
    }
    return Math.ceil(chars / 4);
}

// Explicit --context-limit wins, otherwise the model's real window.
export function getContextLimit(model: string, override?: number): number | undefined {
    if (override && override > 0) return override;
    return getModelInfo(model)?.contextWindow;
}

export function shouldCompact(messages: Message[], model: string, override?: number): boolean {
    const limit = getContextLimit(model, override);
    if (!limit) return false;
    return estimateTokens(messages) > limit * COMPACT_FRACTION;
}

// Our toolResult is its own message after its assistant turn, so never
// split on one: walk back until the cut no longer orphans a result.
function findSafeSplit(messages: Message[], keepRecent: number): number {
    let index = Math.max(0, messages.length - keepRecent);
    while (index > 0 && messages[index]!.role === "toolResult") {
        index--;
    }
    return index;
}

// Short rendering for the summarizer, with tool names so the summary can
// say what the agent did instead of "[tool calls/results]".
function renderForSummary(m: Message): string {
    if (m.role === "user") return "user: " + m.content;
    if (m.role === "toolResult") return "tool " + m.toolName + ": " + m.content.slice(0, 200);
    const parts: string[] = [];
    for (const b of m.content) {
        if (b.type === "text") parts.push(b.text);
        else parts.push("[called " + b.name + " " + JSON.stringify(b.arguments).slice(0, 200) + "]");
    }
    return "assistant: " + parts.join(" ");
}

export type CompactionResult = { messages: Message[]; summary: string; compacted: boolean };

// Summarize everything before the safe split, keep recent turns verbatim.
// Returns the original history untouched when there is nothing to compact.
export async function compactMessages(messages: Message[], provider: Provider, model: string): Promise<CompactionResult> {
    const unchanged = (): CompactionResult => ({ messages, summary: "", compacted: false });
    const split = findSafeSplit(messages, KEEP_RECENT);
    if (split <= 0) return unchanged();
    const history = messages.slice(0, split).map(renderForSummary).join("\n");
    const prompt =
        "Summarize this conversation concisely: what was accomplished, " +
        "which files were read or changed, and what the next turns need.\n\nHISTORY:\n" + history;
    let summary = "";
    for await (const e of provider.stream({
        messages: [{ role: "user", content: prompt }],
        model,
        system: "You summarize conversations concisely.",
        tools: [],
    })) {
        if (e.type === "text_delta") summary += e.delta;
    }
    summary = summary.trim();
    if (!summary) return unchanged();
    return {
        messages: [{ role: "user", content: "[Previous conversation summary]: " + summary }, ...messages.slice(split)],
        summary,
        compacted: true,
    };
}
