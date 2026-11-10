// Inspector: progressive disclosure of execution state.
// Default view explains what is happening now. Advanced tabs keep every
// technical detail accessible: payload, source, context, events, stdout.
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import { ARCH_NODES, CODE_SNIPPETS, SUBSYSTEM_COLOR } from "../../data/architecture.js";
import { estimateTokens } from "../../data/trace.js";

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
            content: m.content.length > 68 ? `${m.content.slice(0, 68)}...` : m.content,
          },
        }),
      );
    } else if (m.role === "assistant") {
      const compactContent = m.content.map((b) =>
        b.type === "text"
          ? { type: "text", text: b.text.length > 42 ? `${b.text.slice(0, 42)}...` : b.text }
          : { type: "toolCall", id: b.id, name: b.name },
      );
      lines.push(JSON.stringify({ type: "message", message: { role: "assistant", content: compactContent } }));
    } else {
      lines.push(
        JSON.stringify({
          type: "message",
          message: {
            role: "toolResult",
            toolCallId: m.toolCallId,
            toolName: m.toolName,
            content: m.content.length > 44 ? `${m.content.slice(0, 44).replace(/\n/g, " ")}...` : m.content,
            isError: m.isError,
          },
        }),
      );
    }
  }
  return lines;
}

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

export default function Inspector({
  view,
  parsed,
  stepInfo,
  stepNum,
  totalSteps,
  output,
  uiMode,
  branch,
  pinnedNodeId,
}) {
  const [tab, setTab] = useState("summary");

  const pinnedNode = pinnedNodeId ? ARCH_NODES.find((n) => n.id === pinnedNodeId) : null;
  const pinnedMeta = pinnedNodeId ? PINNED_DOCS[pinnedNodeId] : null;

  const phase = pinnedMeta?.phase ?? (pinnedNode ? pinnedNode.group.toUpperCase() : stepInfo.phase);
  const phaseColor = SUBSYSTEM_COLOR[pinnedNode?.group ?? stepInfo.phaseId] ?? "var(--color-accent)";
  const fnTitle = pinnedMeta?.fnTitle ?? (pinnedNode ? `${pinnedNode.title}` : stepInfo.fnTitle);
  const fileRef = pinnedMeta?.fileRef ?? (pinnedNode ? pinnedNode.file : stepInfo.fileRef);
  const explanation = pinnedMeta?.explanation ?? stepInfo.explanation;
  const codeSnippet =
    (pinnedNodeId && CODE_SNIPPETS[pinnedNodeId]) || stepInfo.snippet || CODE_SNIPPETS.runAgent;

  const messagesList = view.snapshot ?? [{ role: "user", content: parsed.header?.prompt ?? "" }];
  const sessionLines = formatSessionJsonlLines(parsed.header, messagesList);
  const snapTokens = estimateTokens(messagesList);
  const stdout = terminalText(view.blocks);
  // Terminal text is identical for the print and TUI lenses; only Classic
  // shortens tool previews. Label the lens honestly.
  const stdoutTitle = output === "classic" ? "classic stdout" : "print stdout";
  const tuiNote = uiMode === "tui" && output !== "classic";

  // Friendly labels for the default view.
  const friendlyPhase =
    {
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
    }[stepInfo.shortPhase] ?? stepInfo.shortPhase;

  return (
    <div className="nimi-inspector">
      {view.denied && (
        <Banner
          status="warning"
          title={`Write denied — ${view.denied.name}`}
          description="The permission gate stopped this replay branch. Allow / Deny only switches the sample replay — it does not control a live machine."
        />
      )}

      <div className="nimi-inspector-scroll">
        <div className="nimi-inspector-header">
          <div className="nimi-inspector-title-row">
            <span
              className="nimi-phase-pill"
              style={{
                color: phaseColor,
                borderColor: `color-mix(in srgb, ${phaseColor} 33%, transparent)`,
                background: `color-mix(in srgb, ${phaseColor} 12%, transparent)`,
              }}
            >
              {phase}
            </span>
            <Text type="label" color="secondary" className="nimi-mono">
              {stepNum} / {totalSteps}
            </Text>
          </div>

          <Heading level={3}>{fnTitle}</Heading>

          <MetadataList>
            <MetadataListItem label="File">{fileRef}</MetadataListItem>
            <MetadataListItem label="Trace">showcase.jsonl:L{stepInfo.traceLine}</MetadataListItem>
            <MetadataListItem label="Context">
              {messagesList.length} messages · ~{snapTokens} tokens
            </MetadataListItem>
          </MetadataList>

          <p className="nimi-inspector-explanation">{explanation}</p>
        </div>

        <TabList value={tab} onChange={setTab} size="sm" role="tablist" hasDivider>
          <Tab value="summary" label="Overview" panelId="inspector-panel-summary" />
          <Tab value="events" label={`${view.events.length} Events`} panelId="inspector-panel-events" />
          <Tab value="messages" label={`Context ${messagesList.length}`} panelId="inspector-panel-messages" />
          <Tab value="source" label="Source" panelId="inspector-panel-source" />
        </TabList>

        <div id={`inspector-panel-${tab}`}>
          {tab === "summary" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
              <div
                style={{
                  padding: "var(--spacing-4)",
                  borderRadius: "var(--radius-container)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-background-muted)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-2)",
                }}
              >
                <Text type="label" color="secondary">
                  Current step
                </Text>
                <Text type="body" weight="semibold" style={{ fontSize: "var(--font-size-xl)" }}>
                  {friendlyPhase}
                </Text>
                <Text type="body" color="secondary">
                  {explanation}
                </Text>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "var(--spacing-3)",
                }}
              >
                <SummaryTile
                  icon="info"
                  label="Lens"
                  value={output === "print" ? (uiMode === "tui" ? "TUI · same stream" : "Print · one-shot") : "Classic REPL"}
                />
                <SummaryTile
                  icon="success"
                  label="Permission"
                  value={view.denied || branch === "deny" ? "Denied" : "Allowed"}
                  tone={view.denied || branch === "deny" ? "warning" : "success"}
                />
                <SummaryTile icon="clock" label="Messages" value={String(messagesList.length)} />
                <SummaryTile icon="wrench" label="Tools used" value={String(view.events.filter((s) => s.event.type === "tool_start").length)} />
              </div>
            </div>
          )}

          {tab === "events" && (
            <List density="compact">
              {view.events.map((s) => (
                <ListItem
                  key={s.key}
                  isSelected={s.line === stepInfo.traceLine}
                  label={`${s.event.type}${s.event.name ? ` (${s.event.name})` : ""}`}
                  description={`#${s.event.i ?? s.key} · L${s.line}`}
                />
              ))}
            </List>
          )}

          {tab === "messages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
              {messagesList.map((m, idx) => (
                <details key={idx} className="nimi-message-row" open={idx === messagesList.length - 1}>
                  <summary>
                    <span className="nimi-message-role">{m.role}</span>
                    <span className="nimi-message-preview">
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
                  <div className="nimi-message-body">
                    <CodeBlock code={JSON.stringify(m, null, 2)} language="json" size="sm" width="100%" maxHeight={320} />
                  </div>
                </details>
              ))}
            </div>
          )}

          {tab === "source" && (
            <CodeBlock code={codeSnippet} language="ts" title={fileRef} size="sm" width="100%" maxHeight={420} />
          )}
        </div>

        <details className="nimi-advanced">
          <summary>
            <Text type="label" weight="semibold">
              Advanced: trace payload & stdout
            </Text>
            <Text type="label" color="secondary">
              Raw JSONL session lines and terminal output
            </Text>
          </summary>
          <div className="nimi-advanced-body">
            <CodeBlock
              code={sessionLines.join("\n")}
              language="json"
              title={`session ${(parsed.header?.session ?? "showcase-v1").toUpperCase()}.jsonl`}
              size="sm"
              width="100%"
              maxHeight={420}
            />
            {stdout.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
                <CodeBlock
                  code={stdout}
                  language="plaintext"
                  title={stdoutTitle}
                  size="sm"
                  width="100%"
                  maxHeight={420}
                />
                {tuiNote && (
                  <Text type="label" color="secondary">
                    TUI renders this same stream; the graph highlights the Ink renderer node instead.
                  </Text>
                )}
              </div>
            ) : (
              <Text type="label" color="secondary">
                No stdout yet — step forward or press play.
              </Text>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function SummaryTile({ icon, label, value, tone = "secondary" }) {
  const colorMap = {
    secondary: "var(--color-text-secondary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
  };
  return (
    <div
      style={{
        padding: "var(--spacing-3)",
        borderRadius: "var(--radius-container)",
        border: "1px solid var(--color-border)",
        background: "var(--nimi-panel-elevated)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-1)", color: colorMap[tone] }}>
        <Icon icon={icon} size="sm" />
        <Text type="label" color={tone === "secondary" ? "secondary" : tone}>
          {label}
        </Text>
      </div>
      <Text type="body" weight="semibold">
        {value}
      </Text>
    </div>
  );
}
