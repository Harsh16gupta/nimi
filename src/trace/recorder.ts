import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AgentEvent } from "../agent.ts";
import type { Message } from "../types.ts";

// JSONL showcase trace (plan §3): one object per line.
//   header   — who/what/when (first, so a crash still leaves identity)
//   event    — every AgentEvent in order, with index i
//   messages — full history snapshot after turn_end/agent_end/compacted
//   end      — final totals (turns/tools only knowable at close, so here)
//
// Lines append as events arrive (crash-safe) with sync writes: traces
// are small and ordering matters more than throughput.

const V = 1;

export type TraceHeaderInfo = {
  session: string;
  provider: string;
  model: string;
  prompt: string;
  argv: string[];
};

export type TraceRecorder = {
  path: string;
  record: (event: AgentEvent, messages: Message[]) => void;
  finish: (messages: Message[]) => void;
};

// Snapshot events carry the full history so the viewer can show
// messages[n] at any step without re-running the agent.
function isSnapshotEvent(type: AgentEvent["type"]): boolean {
  return type === "turn_end" || type === "agent_end" || type === "compacted";
}

export function createTraceRecorder(path: string, info: TraceHeaderInfo): TraceRecorder {
  // mkdir -p the parent so --trace /tmp/x/y.jsonl just works.
  mkdirSync(dirname(path), { recursive: true });
  // writeFileSync (not append) so a re-used path starts fresh.
  writeFileSync(
    path,
    JSON.stringify({
      v: V,
      type: "header",
      session: info.session,
      provider: info.provider,
      model: info.model,
      prompt: info.prompt,
      started_at: new Date().toISOString(),
      argv: info.argv,
    }) + "\n",
  );

  let i = 0; // event index
  let turns = 0; // turn_end count
  let tools = 0; // tool_start count
  let done = false; // finish() runs once, even via finally

  const writeLine = (obj: unknown): void => {
    appendFileSync(path, JSON.stringify(obj) + "\n");
  };

  return {
    path,
    record(event, messages) {
      const index = i++;
      if (event.type === "turn_end") turns++;
      if (event.type === "tool_start") tools++;
      writeLine({ v: V, type: "event", i: index, event });
      if (isSnapshotEvent(event.type)) {
        writeLine({ v: V, type: "messages", afterEvent: index, messages });
      }
    },
    finish(messages) {
      if (done) return;
      done = true;
      writeLine({
        v: V,
        type: "end",
        messageCount: messages.length,
        counts: { turns, tools },
      });
    },
  };
}

// Tee wrapper: records every event while yielding it through unchanged,
// so the print loop renders exactly as without --trace. finish() runs
// in finally, so even a throw (max turns) still seals the file.
export async function* withTrace(
  events: AsyncIterable<AgentEvent>,
  trace: TraceRecorder,
  messages: Message[],
): AsyncGenerator<AgentEvent> {
  try {
    for await (const event of events) {
      trace.record(event, messages);
      yield event;
    }
  } finally {
    trace.finish(messages);
  }
}
