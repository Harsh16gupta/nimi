// Bottom-docked step inspector: telemetry, narrative, and payload.
// Three columns — identity/telemetry, execution summary, and tabbed
// JSONL payload / source excerpt / terminal stdout — all derived from the
// live replay fold. The deny branch flips the badge and gate vermilion.
import { useState } from "react";
import { estimateTokens } from "../../data/trace.js";

function terminalText(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.kind === "text") out.push(b.text);
    else if (b.kind === "tool") out.push(`\n[tool] ${b.name} ${JSON.stringify(b.input)}`);
    else if (b.kind === "note" && b.text) out.push(`\n${b.text}`);
    else if (b.kind === "result") out.push(`[result] ${b.name}${b.isError ? " (error)" : ""}:\n${b.text}`);
  }
  return out.join("\n");
}

const FRIENDLY = {
  start: "Starting",
  finish: "Finished",
  "stream t1": "Thinking",
  "stream t2": "Thinking",
  "stream t3": "Thinking",
  turn_end: "Deciding",
  snapshot: "Saving context",
  compact: "Compressing context",
  "tool:grep": "Searching files",
  "tool:read": "Reading file",
  "tool:write": "Writing file",
  "res:grep": "Got search results",
  "res:read": "Got file contents",
  "res:write": "Wrote file",
  "gate:write": "Asking permission",
  denied: "Permission denied",
  agent_end: "Done",
};

export default function Inspector({
  view,
  parsed,
  stepInfo,
  stepNum,
  totalSteps,
  output,
  branch,
  turnN,
}) {
  const [tab, setTab] = useState("json");

  const denied = Boolean(view.denied) || branch === "deny";
  const phase = view.denied && stepInfo.shortPhase === "denied" ? "BLOCKED / DENIED" : stepInfo.phase;
  const messagesList = view.snapshot ?? [{ role: "user", content: parsed.header?.prompt ?? "" }];
  const snapTokens = estimateTokens(messagesList);
  const stdout = terminalText(view.blocks);
  const toolsUsed = view.events.filter((s) => s.event.type === "tool_start").length;
  const friendly = FRIENDLY[stepInfo.shortPhase] ?? stepInfo.shortPhase;
  const item = parsed.items[stepNum - 1];
  const itemJson = item ? JSON.stringify(item.obj, null, 2) : "{}";

  return (
    <div className="bp-deck" aria-label="Step inspector">
      <div className="bp-deck-col-1">
        <div className="bp-deck-badge-row">
          <span className={`bp-phase${denied && view.denied ? " denied" : ""}`}>{phase}</span>
          <span className="bp-step-idx">
            Step {String(stepNum).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
          </span>
        </div>
        <p className="bp-callchain">{stepInfo.fnTitle}</p>
        <div className="bp-telemetry">
          <span className="lbl">Source File:</span>
          <span className="val">{stepInfo.fileRef}</span>
          <span className="lbl">Trace Line:</span>
          <span className="val">showcase.jsonl:L{stepInfo.traceLine}</span>
          <span className="lbl">Context:</span>
          <span className="val">
            {messagesList.length} msg · ~{snapTokens} tok
          </span>
          <span className="lbl">Gate Status:</span>
          <span className="val" style={denied ? { color: "#D9381E" } : { color: "#0300EB" }}>
            {denied ? "DENIED" : "ALLOWED"}
          </span>
        </div>
      </div>

      <div className="bp-deck-col-2">
        <div>
          <p className="bp-col-label">Step execution summary</p>
          <h3 className="bp-narr-title">{friendly}</h3>
          <p className="bp-narr-text">{stepInfo.explanation}</p>
        </div>
        <div className="bp-pills">
          <span className="bp-pill">
            Lens: <strong>{output === "classic" ? "Classic" : output === "tui" ? "TUI" : "Print"}</strong>
          </span>
          <span className="bp-pill">
            Tools Used: <strong>{toolsUsed}</strong>
          </span>
          <span className="bp-pill">
            Turn: <strong>{turnN}</strong>
          </span>
        </div>
      </div>

      <div className="bp-deck-col-3">
        {view.denied && (
          <p className="bp-deny-note" style={{ margin: 12 }}>
            The permission gate stopped this replay branch. Allow / Deny only switches the sample
            replay — it does not control a live machine.
          </p>
        )}
        <div className="bp-deck-tabs" role="tablist" aria-label="Payload views">
          {[
            ["json", "JSONL Trace Payload"],
            ["source", "Source Excerpt"],
            ["stdout", "Terminal Stdout"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`bp-deck-tab${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="bp-pane">
          {tab === "json" && <pre className="bp-json">{itemJson}</pre>}
          {tab === "source" && (
            <div className="bp-code" aria-label="Source excerpt">
              {(stepInfo.snippet ?? "").split("\n").map((line, i) => (
                <div key={i} className={`bp-code-line${i === 5 ? " hl" : ""}`}>
                  <span className="bp-line-num">{i + 10}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "stdout" && (
            <pre className="bp-json bp-stdout">{stdout.length > 0 ? stdout : "No stdout yet — step forward or press play."}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
