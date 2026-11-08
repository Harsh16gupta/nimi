// Folded events -> one continuous flow chain (no turn lanes: the run
// reads as a single left-to-right story). Merged text runs become LLM
// nodes; each tool becomes a tool -> result pair; the gated write gets
// a gate node in front of it. Deny branch: the gate is marked denied
// and the chain ends there.
import { isGated } from "./trace.js";

export function summarizeResult(name, result) {
  if (name === "write") return "written";
  const lines = result.split("\n");
  if (name === "grep") return `${lines.length} hit${lines.length === 1 ? "" : "s"}`;
  if (name === "read") return `${lines.length} lines`;
  return result.slice(0, 28);
}

function shortInput(input) {
  const first = input?.path ?? input?.pattern ?? Object.values(input ?? {})[0];
  return String(first ?? "").slice(0, 24);
}

export function buildFlow(view, header, deltas) {
  const deniedIds = new Set(
    view.events.filter((s) => s.event.type === "denied").map((s) => s.event.id),
  );
  const nodes = [];
  let llm = 0;
  let buf = null; // open text run
  const flush = () => {
    if (!buf) return;
    llm += 1;
    nodes.push({
      key: buf.key,
      line: buf.line,
      kind: "llm",
      title: `LLM #${llm}`,
      sub: `~${deltas[llm - 1] ?? "?"} tokens`,
      text: buf.text,
      keys: buf.keys,
    });
    buf = null;
  };
  for (const s of view.events) {
    const e = s.event;
    if (e.type === "text_delta") {
      buf ??= { key: s.key, line: s.line, text: "", keys: [] };
      buf.text += e.delta;
      buf.keys.push(s.key);
      continue;
    }
    flush();
    if (e.type === "agent_start") {
      nodes.push({ key: s.key, line: s.line, kind: "user", title: "User", sub: "prompt", keys: [s.key] });
    } else if (e.type === "tool_start") {
      const denied = deniedIds.has(e.id);
      if (isGated(header, e.name)) {
        nodes.push({
          key: s.key, line: s.line, kind: "gate", title: "permission",
          sub: `${e.name} — ${denied ? "denied" : "allowed"}`,
          denied, keys: [s.key],
        });
      }
      if (denied) continue; // the tool never ran; the gate node says it
      nodes.push({
        key: s.key, line: s.line, kind: "tool", title: `tool: ${e.name}`,
        sub: shortInput(e.input), keys: [s.key],
      });
    } else if (e.type === "tool_end") {
      if (deniedIds.has(e.id)) continue;
      nodes.push({
        key: s.key, line: s.line, kind: "result", title: "result",
        sub: summarizeResult(e.name, e.result), keys: [s.key],
      });
    } else if (e.type === "compacted") {
      nodes.push({
        key: s.key, line: s.line, kind: "compact", title: "context summarized",
        sub: `${e.before} → ${e.after} messages`, keys: [s.key],
      });
    } else if (e.type === "agent_end") {
      nodes.push({ key: s.key, line: s.line, kind: "done", title: "answer complete", sub: "✓", keys: [s.key] });
    }
    // turn_end carries no box; denied is folded into its gate node.
  }
  flush();
  return nodes;
}
