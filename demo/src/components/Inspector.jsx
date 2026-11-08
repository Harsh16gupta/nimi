// Payload / messages[n] / events[n] tabs for the current fold.
// Payload cites the exact source line (showcase.jsonl:L<n>) per step;
// messages shows the newest snapshot at or before the step.
import { useState } from "react";
import { estimateTokens } from "../data/trace.js";

const TABS = ["payload", "messages", "events"];

function preview(m) {
  if (m.role === "user") return m.content;
  if (m.role === "toolResult") return `${m.toolName}: ${m.content}`;
  return m.content.map((b) => (b.type === "text" ? b.text : `[called ${b.name}]`)).join(" ");
}

export default function Inspector({ view, parsed, sel }) {
  const [tab, setTab] = useState("payload");
  const [copied, setCopied] = useState(false);

  // Selected step, else the latest tool-ish event in the fold.
  const step =
    sel ?? [...view.events].reverse().find((s) => s.event.type.startsWith("tool") || s.event.type === "denied") ?? null;

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

  return (
    <aside className="card">
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
            <button className="copy" onClick={() => copy(JSON.stringify(step.event, null, 2))}>
              {copied ? "copied!" : "copy"}
            </button>
            <div className="kv">{step.event.type} · showcase.jsonl:L{step.line}</div>
            <pre>{JSON.stringify(step.event, null, 2)}</pre>
          </div>
        ) : (
          <p className="kv">No tool step in this fold yet — scrub forward.</p>
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
    </aside>
  );
}
