import type {
  AssistantMessage,
  Message,
  Provider,
  Tool,
  ToolCallBlock,
} from "./types.ts";
import type { CanUseTool } from "./permissions.ts";


export type AgentEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_call"; block: ToolCallBlock }
  | { type: "tool_result"; toolCallId: string; toolName: string; content: string; isError: boolean }
  | { type: "done"; message: AssistantMessage };

export type AgentOptions = {
  provider: Provider;
  model: string;
  messages: Message[];
  tools: Tool[];
  system?: string;
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
  canUseTool?: CanUseTool;
};

const DEFAULT_MAX_ITERATIONS = 10;

export async function runAgent(options: AgentOptions): Promise<AssistantMessage> {
  const maxIterations = DEFAULT_MAX_ITERATIONS;
 
  for (let round = 0; round < maxIterations; round++) {
    options.signal?.throwIfAborted();

    let reply: AssistantMessage | undefined = undefined;

    for await (const event of options.provider.stream({
      messages: options.messages,
      model: options.model,
      tools: options.tools,
      system: options.system,
    })) {
      options.signal?.throwIfAborted();
      if (event.type === "text_delta") {
        if (options.onEvent !== undefined) {                             //strictly no equal
          options.onEvent({ type: "text_delta", delta: event.delta });
        }
      } else {
        reply = event.message;
      }
    }

    if (reply === undefined) {
      throw new Error("Provider stream ended without a final message");
    }

    // Save the reply BEFORE running tools: providers require the order
    // user -> assistant -> toolResult -> assistant -> toolResult ...
    options.messages.push(reply);

    // --- Step 2: collect the tool calls, if any. ---

    // A plain loop instead of .filter(), so each step is visible.
    // "block.type === toolCall" narrows TextBlock | ToolCallBlock for us:
    // inside the if, TypeScript knows block is a ToolCallBlock.
    const toolCalls: ToolCallBlock[] = [];
    for (const block of reply.content) {
      if (block.type === "toolCall") {
        toolCalls.push(block);
      }
    }

    // No tool calls means the model gave a final text answer: tell the
    // caller and return it. ("toolUse" with zero calls would loop forever,
    // so treat it as done too.)
    if (reply.stopReason !== "toolUse" || toolCalls.length === 0) {
      if (options.onEvent !== undefined) {
        options.onEvent({ type: "done", message: reply });
      }
      return reply;
    }

    // --- Step 3: run each requested tool, save each result. ---

    for (const call of toolCalls) {
      options.signal?.throwIfAborted();
      // Tell the caller a tool is starting (used for the "[tool]" log line).
      if (options.onEvent !== undefined) {
        options.onEvent({ type: "tool_call", block: call });
      }

      // Find the tool by name with a plain loop.
      let toolToRun: Tool | undefined = undefined;
      for (const candidate of options.tools) {
        if (candidate.name === call.name) {
          toolToRun = candidate;
        }
      }

      // Unknown tool name: do NOT crash. Tell the model it does not exist
      // (isError: true) so it can correct itself next round.
      if (toolToRun === undefined) {
        const content = "Unknown tool: " + call.name;
        options.messages.push({
          role: "toolResult",
          toolCallId: call.id,
          toolName: call.name,
          content: content,
          isError: true,
        });
        if (options.onEvent !== undefined) {
          options.onEvent({ type: "tool_result", toolCallId: call.id, toolName: call.name, content: content, isError: true });
        }
        continue; // skip to the next tool call
      }

      // Read-only tools observe only, so they skip the prompt.
      // Writes/commands ask the gate; a denial becomes an error result
      // so the model can adapt instead of the run dying.
      if (toolToRun.readOnly !== true && options.canUseTool !== undefined) {
        const decision = await options.canUseTool(call.name, call.arguments);
        if (decision.behavior === "deny") {
          const content = decision.message;
          options.messages.push({
            role: "toolResult",
            toolCallId: call.id,
            toolName: call.name,
            content: content,
            isError: true,
          });
          if (options.onEvent !== undefined) {
            options.onEvent({ type: "tool_result", toolCallId: call.id, toolName: call.name, content: content, isError: true });
          }
          continue;
        }
      }

      // "try/catch" handles a tool that throws (file missing, bad args...).
      // "await" pauses until the tool finishes; without it we would store
      // a Promise object instead of the tool's text.
      try {
        const output = await toolToRun.execute(call.arguments);
        options.messages.push({
          role: "toolResult",
          toolCallId: call.id,
          toolName: call.name,
          content: output,
          isError: false,
        });
        if (options.onEvent !== undefined) {
          options.onEvent({ type: "tool_result", toolCallId: call.id, toolName: call.name, content: output, isError: false });
        }
      } catch (error) {
        // "error" is typed "unknown": it could be anything, not just Error.
        // So we check before reading .message, else TypeScript complains.
        let message: string;
        if (error instanceof Error) {
          message = error.message;
        } else {
          message = String(error);
        }
        options.messages.push({
          role: "toolResult",
          toolCallId: call.id,
          toolName: call.name,
          content: message,
          isError: true,
        });
        if (options.onEvent !== undefined) {
          options.onEvent({ type: "tool_result", toolCallId: call.id, toolName: call.name, content: message, isError: true });
        }
      }
    }

    // End of the for body: loop back round and ask the model again,
    // now with the tool results included in options.messages.
  }

  // Only reachable if EVERY round asked for tools. Fail instead of
  // looping forever (and burning API money).
  throw new Error("Agent exceeded max iterations (" + maxIterations + ")");
}
