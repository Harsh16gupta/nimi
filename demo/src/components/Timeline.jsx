// Turn-grouped vertical narrative: Turn 1/2/3 headings with model ->
// tools -> results nested under each. Consecutive text deltas merge into
// one paragraph; tool payloads expand inline via <details>.
function label(step) {
  const e = step.event;
  if (e.type === "text_delta") return null; // merged by the caller
  if (e.type === "tool_start") return `[tool] ${e.name}`;
  if (e.type === "tool_end") return `[result] ${e.name}${e.isError ? " (error)" : ""}`;
  if (e.type === "denied") return `[denied] ${e.name}`;
  if (e.type === "compacted") return `[compacted ${e.before} → ${e.after} messages]`;
  if (e.type === "agent_start") return "run started";
  if (e.type === "turn_end") return "turn end";
  if (e.type === "agent_end") return "answer complete";
  return e.type;
}

function kindOf(event) {
  if (event.type === "tool_start") return "tool";
  if (event.type === "tool_end") return event.isError ? "result err" : "result";
  if (event.type === "denied" || event.type === "compacted") return event.type;
  return "note";
}

function Payload({ step }) {
  const e = step.event;
  if (e.type === "tool_start") return <pre>{JSON.stringify(e.input, null, 2)}</pre>;
  if (e.type === "tool_end" || e.type === "denied") return <pre>{e.type === "denied" ? e.reason : e.result}</pre>;
  return null;
}

// Merge consecutive text deltas so each turn reads as paragraphs.
function displaySteps(steps) {
  const out = [];
  for (const step of steps) {
    const prev = out[out.length - 1];
    if (step.event.type === "text_delta" && prev?.merged) prev.text += step.event.delta;
    else if (step.event.type === "text_delta") out.push({ merged: true, key: step.key, line: step.line, text: step.event.delta });
    else out.push(step);
  }
  return out;
}

export default function Timeline({ turns, deltas, query, sel, onSelect }) {
  const q = query.trim().toLowerCase();
  return (
    <div>
      {turns.map((turn, ti) => {
        const steps = displaySteps(turn.steps).filter(
          (s) => !q || JSON.stringify(s.event ?? s.text).toLowerCase().includes(q),
        );
        if (steps.length === 0) return null;
        const max = Math.max(1, ...deltas);
        return (
          <section key={turn.n}>
            <div className="turn-head">
              <h2>Turn {turn.n}</h2>
              {turn.open && <span className="kv">· in progress</span>}
              <span className="spark" title={`~${deltas[ti] ?? 0} tokens added this turn`}>
                {(deltas[ti] != null ? [deltas[ti]] : []).map((d, k) => (
                  <i key={k} style={{ height: `${4 + Math.round((d / max) * 20)}px` }} />
                ))}
              </span>
            </div>
            {steps.map((s) =>
              s.merged ? (
                <div className="card" key={s.key}><p>{s.text}</p></div>
              ) : (
                <div
                  className={`step ${kindOf(s.event)}${sel?.key === s.key ? " now" : ""}`}
                  key={s.key}
                  onClick={() => onSelect(s)}
                >
                  <span className="kind">{s.event.type} · L{s.line}</span>
                  <p>{label(s)}</p>
                  {(s.event.type === "tool_start" || s.event.type === "tool_end" || s.event.type === "denied") && (
                    <details className="payload">
                      <summary>payload</summary>
                      <Payload step={s} />
                    </details>
                  )}
                </div>
              ),
            )}
          </section>
        );
      })}
    </div>
  );
}
