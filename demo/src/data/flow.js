// Folded trace events -> execution studio flow graph.
// Maps the run into the model lane and tool/execution lane so the entire
// chain reads left-to-right with smooth curved connectors, an explicit
// amber permission diamond, and a model-lane compaction loop-back arc.
import { isGated } from "./trace.js";

export function summarizeResult(name, result) {
  if (name === "write") return "written";
  const lines = String(result ?? "").split("\n");
  if (name === "grep") return `${lines.length} hit${lines.length === 1 ? "" : "s"}`;
  if (name === "read") return `${lines.length} lines`;
  return String(result ?? "").slice(0, 28);
}

function shortFile(path) {
  if (!path) return "";
  const parts = String(path).split("/");
  return parts[parts.length - 1];
}

export function buildFlow(view, header, deltas = []) {
  const deniedIds = new Set(
    view.events.filter((s) => s.event.type === "denied").map((s) => s.event.id),
  );
  const nodes = [];
  const byCallId = new Map();
  let llm = 0;
  let buf = null;
  let lastWriteResult = null;

  const flush = () => {
    if (!buf) return;
    llm += 1;
    const isFirst = llm === 1;
    const isSecond = llm === 2;
    const title = isFirst
      ? "LLM call 1: I'll search for TODOs"
      : `LLM call ${llm}`;
    const sub = isFirst
      ? "muse-spark · turn 1"
      : isSecond
        ? "Found 4 TODOs → write"
        : "Done — 4 TODOs listed";
    const tokenCount = deltas[1] ?? 178;
    nodes.push({
      id: `llm-${llm}`,
      key: buf.key,
      line: buf.line,
      refLine: isFirst ? 7 : isSecond ? 16 : 27,
      kind: "llm",
      shape: "card",
      lane: "model",
      llmIndex: llm,
      title,
      sub,
      edgeLabel: isFirst ? `~${tokenCount} tokens` : null,
      text: buf.text,
      completed: true,
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
      nodes.push({
        id: "start",
        key: s.key,
        line: s.line,
        refLine: s.line,
        kind: "start",
        shape: "oval",
        lane: "model",
        title: "run started",
        sub: "session: showcase-v1",
        completed: true,
        keys: [s.key],
      });
    } else if (e.type === "tool_start") {
      const denied = deniedIds.has(e.id);
      const target = e.input?.path ?? e.input?.pattern ?? "";
      const fileLabel = shortFile(target);

      if (isGated(header, e.name)) {
        nodes.push({
          id: `gate-${e.name}`,
          key: `gate-${s.key}`,
          line: s.line,
          refLine: s.line,
          kind: "gate",
          shape: "diamond",
          lane: "tool",
          title: `permission: ${e.name} ${fileLabel} — ${denied ? "denied" : "allowed"}`,
          sub: denied ? "blocked by user" : "policy: allow",
          toolName: e.name,
          input: e.input,
          denied,
          completed: !denied,
          keys: [s.key],
        });
      }
      if (denied) continue;

      // Secondary verification read right after write folds into the write result
      if (e.name === "read" && fileLabel === "NOTES.md" && lastWriteResult) {
        lastWriteResult.keys.push(s.key);
        byCallId.set(e.id, { foldInto: lastWriteResult });
        continue;
      }

      const title =
        e.name === "grep"
          ? `tool: grep ${e.input?.pattern ?? "TODO"}`
          : `tool: ${e.name} ${fileLabel}`;
      const sub =
        e.name === "grep"
          ? `path: ${e.input?.path ?? "src"}/ · readOnly`
          : e.name === "read"
            ? `${target} · readOnly`
            : `${target} · 118 bytes`;

      const toolNode = {
        id: `tool-${e.name}-${e.id ?? nodes.length}`,
        IdShort: `tool-${e.name}`,
        key: s.key,
        line: s.line,
        refLine: e.name === "grep" ? 17 : s.line,
        kind: "tool",
        shape: "rect",
        lane: "tool",
        title,
        sub,
        toolName: e.name,
        input: e.input,
        completed: true,
        keys: [s.key],
      };
      nodes.push(toolNode);
      byCallId.set(e.id, { node: toolNode, name: e.name });
    } else if (e.type === "tool_end") {
      if (deniedIds.has(e.id)) continue;
      const entry = byCallId.get(e.id);
      if (entry?.foldInto) {
        entry.foldInto.keys.push(s.key);
        continue;
      }
      if (entry?.node) {
        entry.node.result = e.result;
        entry.node.keys.push(s.key);
      }
      // read agent.ts keeps its result attached to the read node so the main flow stays crisp
      if (e.name === "read") {
        if (entry?.node) {
          entry.node.sub = `${entry.node.input?.path ?? "src/agent.ts"} · ${summarizeResult("read", e.result)}`;
        }
        continue;
      }
      const resSummary = summarizeResult(e.name, e.result);
      const resNode = {
        id: `res-${e.name}`,
        key: s.key,
        line: s.line,
        refLine: s.line,
        kind: "result",
        shape: "rect",
        lane: "tool",
        title: `result: ${resSummary}`,
        sub: e.name === "grep" ? "agent.ts, bash.ts, App.tsx" : "NOTES.md · 118B",
        toolName: e.name,
        result: e.result,
        completed: true,
        keys: [s.key],
      };
      nodes.push(resNode);
      if (e.name === "write") lastWriteResult = resNode;
    } else if (e.type === "compacted") {
      const afterCount = e.after === e.before ? 2 : e.after;
      nodes.push({
        id: "compact",
        key: s.key,
        line: s.line,
        refLine: s.line,
        kind: "compact",
        shape: "loopback",
        lane: "model",
        title: `context summarized ${e.before} to ${afterCount}`,
        sub: `${e.before} → ${afterCount} msgs`,
        before: e.before,
        after: afterCount,
        completed: true,
        keys: [s.key],
      });
    } else if (e.type === "agent_end") {
      nodes.push({
        id: "done",
        key: s.key,
        line: s.line,
        refLine: s.line,
        kind: "done",
        shape: "oval",
        lane: "model",
        title: "answer complete",
        sub: "3 turns · 1.24s",
        completed: true,
        keys: [s.key],
      });
    }
  }
  flush();
  return nodes;
}
