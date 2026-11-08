// Floating inspector: opens only when a flow node is clicked. Tabs:
// payload (the node's full events), messages[n] (newest snapshot in the
// fold), events[n] (folded event list), terminal (print/classic replay).
import { useState } from "react";
import { estimateTokens } from "../data/trace.js";
import Terminal from "./Terminal.jsx";

const TABS = ["payload", "messages", "events", "terminal"];

function preview(m) {
  if (m.role === "user") return m.content;
  if (m.role === "toolResult") return `${m.toolName}: ${m.content}`;
  return m.content.map((b) => (b.type === "text" ? b.text : `[called ${b.name}]`)).join(" ");
}

export default function Inspector({ view, parsed, sel, output, onClose }) {
  const [tab, setTab] = useState("payload");
  const [copied, setCopied] = useState(false);

  // A pinned node from a later frame falls back once scrubbed away.
  const inFold = sel && view.events.some((s) => s.key === sel.key);
  const step = inFold ? sel : null;
  const payloadEvents = step ? view.events.filter((s) => step.keys?.includes(s.key)) : [];

  const totals = parsed.items.filter((it) => it.obj.type === "messages").map((it) => estimateTokens(it.obj.messages));
  const maxTokens = Math.max(1, ...totals);
  const snapTokens = view.snapshot ? estimateTokens(view.snapshot) : 0;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const payloadText =
    step?.kind === "llm"
      ? step.text
      : JSON.stringify(
          payloadEvents.map((s) => s.event),
          null,
          2,
        );

  return (
    <aside className="card inspector-float">
      <button className="copy" onClick={onClose} title="Close">
        ✕
      </button>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "payload" &&
        (step ? (
          <div>
            <button className="copy" onClick={() => copy(payloadText)}>
              {copied ? "copied!" : "copy"}
            </button>
            <div className="kv">
              {step.kind} · {step.title} · showcase.jsonl:L{step.line}
            </div>
            <pre>{payloadText}</pre>
          </div>
        ) : (
          <p className="kv">Scrubbed past this node — pick one in the flow.</p>
        ))}

      {tab === "messages" &&
        (view.snapshot ? (
          <div>
            <div className="kv">
              messages[{view.snapshot.length}] @ L{view.snapshotLine} · ~{snapTokens} tokens
            </div>
            <div className="spark" title={`${snapTokens} of ${maxTokens} max tokens`}>
              <i style={{ height: "8px", width: `${Math.max(4, Math.round((snapTokens / maxTokens) * 120))}px` }} />
            </div>
            {view.snapshot.map((m, k) => (
              <details key={k}>
                <summary className="kv">
                  {m.role} · {preview(m).slice(0, 80)}
                </summary>
                <pre>{JSON.stringify(m, null, 2)}</pre>
              </details>
            ))}
          </div>
        ) : (
          <p className="kv">No snapshot at or before this step yet.</p>
        ))}

      {tab === "events" && (
        <div>
          {view.events.map((s) => (
            <div className="kv" key={s.key}>
              #{s.event.i ?? s.key} {s.event.type}
              {s.event.name ? ` ${s.event.name}` : ""} · L{s.line}
            </div>
          ))}
        </div>
      )}

      {tab === "terminal" && <Terminal blocks={view.blocks} output={output} />}
    </aside>
  );
}
