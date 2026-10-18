
import OpenAI from "openai";
import type {
    ContentBlock,
    Message,
    Provider,
    StopReason,
    TextBlock,
    ToolCallBlock,
    Usage,
} from "../types.ts";

// Convert our messages into OpenAI's format.
function toOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((message): OpenAI.ChatCompletionMessageParam => {
        if (message.role === "user") {
            return { role: "user", content: message.content };
        }
        if (message.role === "assistant") {
            const text = message.content
                .filter((block): block is TextBlock => block.type === "text")
                .map((block) => block.text)
                .join("");

            const toolCalls = message.content.filter(
                (block): block is ToolCallBlock => block.type === "toolCall"
            );

            return {
                role: "assistant",
                content: text || null,
                tool_calls: toolCalls.map((tool) => ({
                    id: tool.id,
                    type: "function" as const,
                    function: {
                        name: tool.name,
                        arguments: JSON.stringify(tool.arguments),
                    },
                })),
            };
        }

        return {
            role: "tool",
            tool_call_id: message.toolCallId,
            content: message.content,
        };
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
            const response = await client.chat.completions.create({
                model,
                stream: true,
                stream_options: { include_usage: true },
                messages: [
                    ...(system ? [{ role: "system" as const, content: system }] : []),
                    ...toOpenAI(messages),
                ],
                tools: tools.map((tool) => ({
                    type: "function" as const,
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters,
                    },
                })),
                tool_choice: tools.length ? "auto" : undefined,
            });

            let fullText = "";
            const toolCalls: { id: string; name: string; arguments: string }[] = [];
            let usage: Usage = { input: 0, output: 0 };
            let stopReason: StopReason = "stop";

            for await (const chunk of response) {
                const choice = chunk.choices[0];
                const delta = choice?.delta;

                if (delta?.content) {
                    fullText += delta.content;
                    yield { type: "text_delta", delta: delta.content };
                }

                for (const tool of delta?.tool_calls ?? []) {
                    const index = tool.index;

                    if (!toolCalls[index]) {
                        toolCalls[index] = { id: "", name: "", arguments: "" };
                    }

                    if (tool.id) toolCalls[index].id = tool.id;
                    if (tool.function?.name) {
                        toolCalls[index].name += tool.function.name;
                    }
                    if (tool.function?.arguments) {
                        toolCalls[index].arguments += tool.function.arguments;
                    }
                }

                if (choice?.finish_reason === "tool_calls") {
                    stopReason = "toolUse";
                } else if (choice?.finish_reason === "length") {
                    stopReason = "length";
                }

                if (chunk.usage) {
                    usage = {
                        input: chunk.usage.prompt_tokens,
                        output: chunk.usage.completion_tokens,
                    };
                }
            }

            const content: ContentBlock[] = [];

            if (fullText) {
                content.push({ type: "text", text: fullText });
            }

            for (const tool of toolCalls) {
                if (!tool) continue;

                content.push({
                    type: "toolCall",
                    id: tool.id,
                    name: tool.name,
                    arguments: tool.arguments ? JSON.parse(tool.arguments) : {},
                });
            }

            yield {
                type: "done",
                message: { role: "assistant", content, usage, stopReason },
            };
        },
    };
}
