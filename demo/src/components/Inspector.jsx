// Full-height right split-pane inspector (Cogent + Eraser.io style).
// Top: phase badge + step counter (28 / 28), bold monospace function signature,
// blue file:line citation, and plain-English architectural prose.
// Middle: INSPECTOR tab bar (payload | source | messages[n] | events[n]).
// Bottom: DATA .NIMI/SESSIONS/SHOWCASE-V1.JSONL raw JSONL stream & state viewer.
import { useState } from "react";
import { ARCH_NODES, CODE_SNIPPETS, SUBSYSTEM_COLOR } from "../data/architecture.js";
import { estimateTokens } from "../data/trace.js";
import Terminal from "./Terminal.jsx";

const PINNED_DOCS = {
  shell: {
    phase: "ENTRY",
    phaseId: "entry",
    fnTitle: "node ./bin/nimi.js --print -p \"find all TODOs...\"",
    fileRef: "bin/nimi.js:1",
    explanation:
      "The CLI entrypoint hands process.argv to src/main.tsx. In a non-TTY pipe or when --print is passed, Nimi runs a single-shot execution loop and exits cleanly with code 0.",
  },
  main: {
    phase: "ENTRY",
    phaseId: "entry",
    fnTitle: "main() — CLI & mode router",
    fileRef: "src/main.tsx:18",
    explanation:
      "Loads .env beside the binary, parses CLI flags, merges global and project settings, builds the system prompt, initializes or resumes the .nimi/sessions/<id>.jsonl file, and routes to print, classic REPL, or Ink TUI.",
  },
  parseArgs: {
    phase: "CONFIG",
    phaseId: "config",
    fnTitle: "parseArgs(process.argv.slice(2))",
    fileRef: "src/cli/arg.ts:18",
    explanation:
      "Zero-dependency flag parser supporting both --flag value and --flag=value forms for -p, --provider, --model, --session, --list-sessions, --context-limit, --trace, --classic, --print, and --yolo.",
  },
  loadSettings: {
    phase: "CONFIG",
    phaseId: "config",
    fnTitle: "loadSettings()",
    fileRef: "src/config/settings.ts:21",
    explanation:
      "Implements Nimi's settings cascade: ~/.nimi/settings.json < ./.nimi/settings.json < NIMI_PROVIDER / NIMI_MODEL env vars < explicit CLI flags. Missing or malformed JSON files return {} without crashing.",
  },
  buildSystemPrompt: {
    phase: "CONFIG",
    phaseId: "config",
    fnTitle: "buildSystemPrompt(settings.systemPromptExtra)",
    fileRef: "src/config/system-prompt.ts:11",
    explanation:
      "Combines base coding instructions, the 15 registered tool descriptions from ALL_TOOLS, any present project context files (AGENTS.md, CLAUDE.md, .context, .nimi/context.md), and optional settings extra text.",
  },
};

function formatSessionJsonlLines(header, snapshot) {
  const lines = [];
  lines.push(
    JSON.stringify({
      type: "session_info",
      id: header?.session ?? "showcase-v1",
      provider: header?.provider ?? "meta",
      model: header?.model ?? "muse-spark-1.3-contributor",
    }),
  );
  for (const m of snapshot ?? []) {
    if (m.role === "user") {
      lines.push(
        JSON.stringify({
          type: "message",
          message: {
            role: "user",
            content:
              m.content.length > 68 ? m.content.slice(0, 68) + "..." : m.content,
          },
        }),
      );
    } else if (m.role === "assistant") {
      const compactContent = m.content.map((b) =>
        b.type === "text"
          ? {
              type: "text",
              text: b.text.length > 42 ? b.text.slice(0, 42) + "..." : b.text,
            }
          : { type: "toolCall", id: b.id, name: b.name },
      );
      lines.push(
        JSON.stringify({
          type: "message",
          message: { role: "assistant", content: compactContent },
        }),
      );
    } else {
      lines.push(
        JSON.stringify({
          type: "message",
          message: {
            role: "toolResult",
            toolCallId: m.toolCallId,
            toolName: m.toolName,
            content:
              m.content.length > 44
                ? m.content.slice(0, 44).replace(/\n/g, " ") + "..."
                : m.content,
            isError: m.isError,
          },
        }),
      );
    }
  }
  return lines;
}

export default function Inspector({
  view,
  parsed,
  stepInfo,
  stepNum,
  totalSteps,
  output,
  pinnedNodeId,
}) {
  const [tab, setTab] = useState("payload");
  const [copied, setCopied] = useState(false);

  const pinnedNode = pinnedNodeId
    ? ARCH_NODES.find((n) => n.id === pinnedNodeId)
    : null;
  const pinnedMeta = pinnedNodeId ? PINNED_DOCS[pinnedNodeId] : null;

  const phase = pinnedMeta?.phase ?? (pinnedNode ? pinnedNode.group.toUpperCase() : stepInfo.phase);
  const phaseColor =
    SUBSYSTEM_COLOR[pinnedNode?.group ?? stepInfo.phaseId] ?? "#D97750";
  const fnTitle =
    pinnedMeta?.fnTitle ?? (pinnedNode ? `${pinnedNode.title}` : stepInfo.fnTitle);
  const fileRef =
    pinnedMeta?.fileRef ?? (pinnedNode ? pinnedNode.file : stepInfo.fileRef);
  const explanation =
    pinnedMeta?.explanation ?? stepInfo.explanation;
  const codeSnippet =
    (pinnedNodeId && CODE_SNIPPETS[pinnedNodeId]) ||
    stepInfo.snippet ||
    CODE_SNIPPETS.runAgent;

  const messagesList = view.snapshot ?? [
    { role: "user", content: parsed.header?.prompt ?? "" },
  ];
  const sessionLines = formatSessionJsonlLines(parsed.header, messagesList);
  const snapTokens = estimateTokens(messagesList);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="inspector-pane" aria-label="Architecture and state inspector">
      {/* Top architectural explanation card */}
      <div className="insp-top">
        <div className="insp-badge-row">
          <span
            className="phase-pill"
            style={{
              color: phaseColor,
              borderColor: `${phaseColor}55`,
              background: `${phaseColor}18`,
            }}
          >
            {phase}
          </span>
          {stepInfo.edgeNote && (
            <span className="edge-note-pill">→ {stepInfo.edgeNote}</span>
          )}
          <span className="insp-step-count">
            {stepNum} / {totalSteps}
          </span>
        </div>

        <h2 className="insp-fn-title">{fnTitle}</h2>

        <div className="insp-file-row">
          <span className="insp-file-ref">{fileRef}</span>
          <span className="insp-trace-cite">
            showcase.jsonl:L{stepInfo.traceLine}
          </span>
        </div>

        <p className="insp-prose">{explanation}</p>
      </div>

      {/* Middle INSPECTOR tab bar */}
      <div className="insp-tabbar" role="tablist">
        <span className="insp-tabbar-label">INSPECTOR</span>
        <div className="insp-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "payload"}
            onClick={() => setTab("payload")}
          >
            payload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "source"}
            onClick={() => setTab("source")}
          >
            source
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "messages"}
            onClick={() => setTab("messages")}
          >
            messages[{messagesList.length}]
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "events"}
            onClick={() => setTab("events")}
          >
            events[{view.events.length}]
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "terminal"}
            onClick={() => setTab("terminal")}
          >
            stdout
          </button>
        </div>
      </div>

      {/* Bottom DATA / JSONL / Source viewer */}
      <div className="insp-data-wrap">
        {tab === "payload" && (
          <>
            <div className="data-header">
              <span>
                <strong className="data-tag">DATA</strong>{" "}
                .NIMI/SESSIONS/{(parsed.header?.session ?? "SHOWCASE-V1").toUpperCase()}.JSONL
              </span>
              <button
                type="button"
                className="mini-copy"
                onClick={() => copyText(sessionLines.join("\n"))}
              >
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <div className="jsonl-stream">
              {sessionLines.map((line, i) => (
                <div
                  key={i}
                  className={`jsonl-line${i === sessionLines.length - 1 ? " newest" : ""}`}
                >
                  {line}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "source" && (
          <>
            <div className="data-header">
              <span>
                <strong className="data-tag">SOURCE</strong>{" "}
                {fileRef.toUpperCase()}
              </span>
              <button
                type="button"
                className="mini-copy"
                onClick={() => copyText(codeSnippet)}
              >
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <pre className="code-viewer">{codeSnippet}</pre>
          </>
        )}

        {tab === "messages" && (
          <>
            <div className="data-header">
              <span>
                <strong className="data-tag">CONTEXT</strong>{" "}
                {messagesList.length} MESSAGES · ~{snapTokens} TOKENS
              </span>
            </div>
            <div className="jsonl-stream">
              {messagesList.map((m, idx) => (
                <details key={idx} className="msg-detail" open={idx === messagesList.length - 1}>
                  <summary>
                    <span className="msg-role">{m.role}</span>
                    <span className="msg-preview">
                      {m.role === "user"
                        ? m.content.slice(0, 56)
                        : m.role === "toolResult"
                          ? `${m.toolName} → ${m.content.slice(0, 42)}`
                          : m.content
                              .map((b) => (b.type === "text" ? b.text : `[toolCall:${b.name}]`))
                              .join(" ")
                              .slice(0, 56)}
                    </span>
                  </summary>
                  <pre className="code-viewer">{JSON.stringify(m, null, 2)}</pre>
                </details>
              ))}
            </div>
          </>
        )}

        {tab === "events" && (
          <>
            <div className="data-header">
              <span>
                <strong className="data-tag">TRACE</strong>{" "}
                DEMO/SAMPLES/SHOWCASE.JSONL ({view.events.length} EVENTS)
              </span>
            </div>
            <div className="events-scroll">
              {view.events.map((s) => {
                const isCurrent = s.line === stepInfo.traceLine;
                return (
                  <div
                    key={s.key}
                    className={`trace-event-row${isCurrent ? " current" : ""}`}
                  >
                    <span className="te-idx">#{s.event.i ?? s.key}</span>
                    <span className="te-type">
                      {s.event.type}
                      {s.event.name ? ` (${s.event.name})` : ""}
                    </span>
                    <span className="te-line">L{s.line}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "terminal" && <Terminal blocks={view.blocks} output={output} />}
      </div>
    </aside>
  );
}
