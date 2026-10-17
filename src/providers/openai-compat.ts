import OpenAI from "openai";
import type { ContentBlock, Message, Provider, StopReason, TextBlock, ToolCallBlock, Usage } from "../types.ts";

function toOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((m): OpenAI.ChatCompletionMessageParam => {
        if (m.role === "user") return { role: "user", content: m.content };
        if (m.role === "assistant") {
            const text = m.content.filter((b): b is TextBlock => b.type === "text").map((b) => b.text).join("");
            const calls = m.content.filter((b): b is ToolCallBlock => b.type === "toolCall");
            return {
                role: "assistant",
                content: text || null,
                // OpenAI wants the arguments as a JSON *string*
                tool_calls: calls.length
                    ? calls.map((c) => ({
                          id: c.id,
                          type: "function" as const,
                          function: { name: c.name, arguments: JSON.stringify(c.arguments) },
                      }))
                    : undefined,
            };
        }
        // toolResult -> its own message with role "tool"
        return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
    });
}

export function createOpenAICompat(
    name: string,
    baseURL: string,
    apiKey: string,
    defaultModel: string,
): Provider {
    const client = new OpenAI({ baseURL, apiKey });
    return {
        name,
        defaultModel,
        async *stream({ messages, model, system, tools = [] }) {
            const stream = await client.chat.completions.create({
                model,
                stream: true,
                stream_options: { include_usage: true },
                messages: system ? [{ role: "system", content: system }, ...toOpenAI(messages)] : toOpenAI(messages),
                tools: tools.map((t) => ({
                    type: "function" as const,
                    function: { name: t.name, description: t.description, parameters: t.parameters },
                })),
            });
            let text = "";
            const calls: { id: string; name: string; args: string }[] = [];
            let usage: Usage = { input: 0, output: 0 };
            let stopReason: StopReason = "stop";

            for await (const chunk of stream) {
                const choice = chunk.choices[0];
                if (choice?.delta?.content) {
                    text += choice.delta.content;
                    yield { type: "text_delta", delta: choice.delta.content };
                }
                if (choice?.delta?.tool_calls) {
                    for (const tc of choice.delta.tool_calls) {
                        const i = tc.index ?? 0;
                        if (!calls[i]) calls[i] = { id: "", name: "", args: "" };
                        if (tc.id) calls[i].id = tc.id;
                        if (tc.function?.name) calls[i].name += tc.function.name;
                        if (tc.function?.arguments) calls[i].args += tc.function.arguments;
                    }
                }
                if (choice?.finish_reason === "tool_calls") stopReason = "toolUse";
                else if (choice?.finish_reason === "length") stopReason = "length";
                if (chunk.usage) usage = { input: chunk.usage.prompt_tokens, output: chunk.usage.completion_tokens };
            }
            const content: ContentBlock[] = [];
            if (text) content.push({ type: "text", text });
            for (const c of calls) {
                if (!c.id && !c.name && !c.args) continue;
                content.push({ type: "toolCall", id: c.id, name: c.name, arguments: c.args ? JSON.parse(c.args) : {} });
            }
            yield { type: "done", message: { role: "assistant", content, usage, stopReason } };
        },
    };
}
