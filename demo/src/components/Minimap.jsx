// Slim event rail: one tick per event, colored by kind, wide ticks on
// turn boundaries. Dimmed ticks are outside the current fold (scrubbed
// past, or cut off by the deny branch). Click jumps to that step.
const CLASS = {
  agent_start: "mark",
  text_delta: "text",
  tool_start: "tool",
  tool_end: "result",
  denied: "bad",
  compacted: "mark",
  turn_end: "turn",
  agent_end: "mark",
};

export default function Minimap({ parsed, view, index, go }) {
  const folded = new Set(view.events.map((s) => s.key));
  // Last real (integer-keyed) folded step: synthetic deny keys (i + 0.5)
  // match no tick, so the playhead falls back to the denied tool_start.
  const head = [...view.events].reverse().find((s) => Number.isInteger(s.key))?.key ?? null;
  return (
    <nav className="rail card" aria-label="event rail">
      {parsed.items.map((item, k) => {
        if (item.obj.type !== "event") return null;
        const e = item.obj.event;
        const key = e.i ?? k;
        const cls = e.type === "tool_end" && e.isError ? "bad" : CLASS[e.type] ?? "";
        const inFold = folded.has(key);
        return (
          <button
            key={k}
            className={`tick ${cls}${key === head ? " now" : ""}`}
            style={inFold ? undefined : { opacity: 0.3 }}
            title={`#${e.i} ${e.type}${e.name ? " " + e.name : ""}`}
            onClick={() => go(k)}
          />
        );
      })}
    </nav>
  );
}
