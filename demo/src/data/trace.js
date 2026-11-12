// Parse nimi JSONL traces and fold them into derived view state.
// Folding lines 0..index into {events, blocks, snapshot} means scrubbing
// backwards and flipping toggles "just works": state is derived, never
// mutated. Dependency-free so it runs in the browser and in node tests.

// Mirror of src/agent/compaction.ts: ~4 chars per token, good enough
// for per-turn sparklines and the inspector token bar.
export function estimateTokens(messages) {
  let chars = 0;
  for (const m of messages ?? []) {
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

// The deny fold injects the exact message the permission gate returns
// (see src/permissions.ts), so the deny branch reads like a real run.
export function denyMessage(name) {
  return `User denied ${name}. Do not retry; ask what to do instead.`;
}

// JSONL text -> {header, end, items}. items keep 1-based file line
// numbers so the inspector can cite showcase.jsonl:L<n> per step.
export function parseTrace(text) {
  const items = [];
  let header = null;
  let end = null;
  const lines = text.split("\n");
  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n].trim();
    if (!raw) continue;
    const obj = JSON.parse(raw);
    if (obj.type === "header") header = obj;
    else if (obj.type === "end") end = obj;
    else items.push({ line: n + 1, obj });
  }
  return { header, end, items };
}

// Catalog lookup: a tool is gated unless marked readOnly in the header.
export function isGated(header, name) {
  const tools = header?.tools ?? [];
  for (const t of tools) if (t.name === name) return t.readOnly !== true;
  return true; // unknown tools ask, same as the agent
}

// Index of the first gated tool_end: where the deny branch fires.
// Unknown tools count as gated, same as the agent (src/agent.ts).
export function findDenyLimit(parsed) {
  for (let i = 0; i < parsed.items.length; i++) {
    const { obj } = parsed.items[i];
    if (obj.type === "event" && obj.event.type === "tool_end" && isGated(parsed.header, obj.event.name)) {
      return i;
    }
  }
  return parsed.items.length - 1;
}

// Fold items[0..index] into view state. The deny branch is a toggle input
// to the fold, not a second recording: at the first gated tool call the
// fold injects the deny error result and stops (later lines belong to the
// recorded allow branch), flagged by truncated.
export function replay(parsed, index, { branch = "allow", output = "print" } = {}) {
  const events = []; // {key, line, event}
  let snapshot = null; // newest messages obj at or before index
  let snapshotLine = null;
  let denied = null; // {name, line} when the deny branch fired
  let truncated = false;

  const gated = new Map(); // toolCall id -> name, for gated calls only
  const last = Math.min(index, parsed.items.length - 1);
  for (let k = 0; k <= last; k++) {
    const { line, obj } = parsed.items[k];
    if (obj.type === "messages") {
      snapshot = obj.messages;
      snapshotLine = line;
      continue;
    }
    const event = obj.event;
    if (event.type === "tool_start" && isGated(parsed.header, event.name)) {
      gated.set(event.id, event.name);
    }
    if (branch === "deny" && event.type === "tool_end" && gated.has(event.id)) {
      const name = gated.get(event.id);
      events.push({ key: event.i ?? events.length, itemIndex: k, line, event: { type: "denied", id: event.id, name, reason: denyMessage(name) } });
      events.push({ key: (event.i ?? events.length) + 0.5, itemIndex: k, line, event: { ...event, result: denyMessage(name), isError: true } });
      denied = { name, line };
      truncated = true;
      break; // the rest of the file is the allow branch
    }
    events.push({ key: event.i ?? events.length, itemIndex: k, line, event });
  }

  return { events, snapshot, snapshotLine, denied, truncated, turns: groupTurns(events), blocks: toBlocks(events, output) };
}

// Events -> Turn 1/2/3 groups (model -> tools -> results), the timeline hero.
// nimi yields turn_end right after the assistant reply, BEFORE its tools
// run (see src/agent.ts), so a turn only closes when the next model phase
// starts: a new turn begins on text/compacted/agent_start if the current
// group already holds a turn_end.
const TURN_STARTERS = new Set(["agent_start", "text_delta", "compacted"]);
function groupTurns(events) {
  const turns = [];
  let current = [];
  const closed = () => current.some((s) => s.event.type === "turn_end");
  for (const step of events) {
    if (current.length > 0 && closed() && TURN_STARTERS.has(step.event.type)) {
      turns.push({ n: turns.length + 1, steps: current });
      current = [];
    }
    current.push(step);
  }
  if (current.length > 0) {
    const done = current.some((s) => s.event.type === "agent_end");
    turns.push({ n: turns.length + 1, steps: current, ...(done ? {} : { open: true }) });
  }
  return turns;
}

// Events -> terminal blocks, mirroring the print/classic renderers in
// src/main.tsx and src/modes/classic.ts (result preview 500 vs 300).
function toBlocks(events, output) {
  const preview = output === "classic" ? 300 : 500;
  const blocks = [];
  for (const { event } of events) {
    const lastBlock = blocks[blocks.length - 1];
    if (event.type === "text_delta") {
      if (lastBlock?.kind === "text") lastBlock.text += event.delta;
      else blocks.push({ kind: "text", text: event.delta });
    } else if (event.type === "tool_start") {
      blocks.push({ kind: "tool", name: event.name, input: event.input });
    } else if (event.type === "denied") {
      blocks.push({ kind: "note", text: `[denied] ${event.name}: ${event.reason}` });
    } else if (event.type === "compacted") {
      blocks.push({ kind: "note", text: `[compacted ${event.before} → ${event.after} messages]` });
    } else if (event.type === "tool_end") {
      const over = event.result.length > preview;
      blocks.push({ kind: "result", name: event.name, isError: event.isError, text: over ? event.result.slice(0, preview) + "..." : event.result });
    } else if (event.type === "agent_end") {
      blocks.push({ kind: "note", text: output === "classic" ? "" : "— answer complete —" });
    }
  }
  return blocks;
}

// Per-turn tokens added, from snapshot growth (for the turn sparkline).
export function turnTokens(parsed) {
  const deltas = [];
  let prev = 0;
  for (const { obj } of parsed.items) {
    if (obj.type !== "messages") continue;
    const now = estimateTokens(obj.messages);
    deltas.push(now - prev);
    prev = now;
  }
  return deltas;
}
