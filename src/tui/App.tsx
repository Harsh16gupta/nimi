import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Static, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { runAgent } from "../agent.ts";
import { compactMessages, estimateTokens, getContextLimit } from "../agent/compaction.ts";
import { appendMessages } from "../session/store.ts";
import type { Message, Provider, Tool } from "../types.ts";
import { resultSummary, shortLabel } from "./format.ts";
import { HELP_TEXT, parseBare, parseSlash } from "./slash.ts";

type Row =
  | { kind: "user"; id: number; text: string }
  | { kind: "text"; id: number; text: string }
  | {
      kind: "tool";
      id: number;
      toolCallId: string;
      label: string;
      status: "running" | "ok" | "error";
      summary: string;
    };

type AppProps = {
  provider: Provider;
  model: string;
  system: string;
  tools: Tool[];
  initialPrompt?: string;
  yolo?: boolean;
  sessionId: string;
  initialMessages: Message[];
  contextLimit?: number;
};

const DIVIDER_MAX = 80;

function Header({ model, sessionId }: { model: string; sessionId: string }) {
  const width = process.stdout.columns ?? 60;
  const count = Math.max(20, Math.min(width - 2, DIVIDER_MAX));
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>nimi</Text>
        <Text dimColor>
          {" "}
          · {model} · {process.cwd()} · {sessionId.slice(-6)}
        </Text>
      </Box>
      <Text dimColor>{"─".repeat(count)}</Text>
    </Box>
  );
}

function renderRow(row: Row): ReactNode {
  if (row.kind === "user") {
    return (
      <Box key={row.id} marginTop={1}>
        <Text bold>› </Text>
        <Text>{row.text}</Text>
      </Box>
    );
  }
  if (row.kind === "text") {
    return (
      <Box key={row.id} marginTop={1}>
        <Text wrap="wrap">{row.text}</Text>
      </Box>
    );
  }
  return (
    <Box key={row.id} marginTop={0}>
      <ToolRow row={row} />
    </Box>
  );
}
function ToolRow({ row }: { row: Extract<Row, { kind: "tool" }> }) {
  if (row.status === "running") {
    return (
      <Box>
        <Text dimColor>{"↳ "}</Text>
        <Spinner type="dots" />
        <Text dimColor> {row.label}</Text>
      </Box>
    );
  }
  const mark = row.status === "ok" ? "✓" : "✕";
  const color = row.status === "ok" ? "green" : "red";
  return (
    <Box>
      <Text dimColor>{"↳ "}</Text>
      <Text color={color}>{mark}</Text>
      <Text dimColor>
        {" "}
        {row.label} {row.summary}
      </Text>
    </Box>
  );
}

export default function App({ provider, model, system, tools, initialPrompt, yolo, sessionId, initialMessages, contextLimit }: AppProps) {
  const { exit } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  // Pending write-tool approval: set by canUseTool, resolved by y/a/n keys.
  const [pending, setPending] = useState<{ name: string; input: Record<string, unknown>; resolve: (v: "yes" | "always" | "no") => void } | null>(null);

  const idRef = useRef(1);
  // History starts from the resumed session; savedCount tracks what is on disk.
  const messagesRef = useRef<Message[]>([...initialMessages]);
  const savedCount = useRef(initialMessages.length);
  const abortRef = useRef<AbortController | null>(null);
  const workingRef = useRef(false);
  const textIdRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  // Tools answered "always" skip future prompts in this session.
  const alwaysAllowed = useRef(new Set<string>());

  const nextId = () => idRef.current++;

  const appendText = useCallback((delta: string) => {
    const id = textIdRef.current;
    if (id === null) {
      const newId = nextId();
      textIdRef.current = newId;
      setRows((prev) => [...prev, { kind: "text", id: newId, text: delta }]);
    } else {
      setRows((prev) => prev.map((r) => (r.kind === "text" && r.id === id ? { ...r, text: r.text + delta } : r)));
    }
  }, []);

  // Gate called by the agent before write tools. Read-only tools never reach here.
  const canUseTool = useCallback(
    async (name: string, input: Record<string, unknown>) => {
      if (yolo || alwaysAllowed.current.has(name)) return { behavior: "allow" as const };
      const answer = await new Promise<"yes" | "always" | "no">((resolve) => {
        setPending({ name, input, resolve });
      });
      setPending(null);
      if (answer === "always") {
        alwaysAllowed.current.add(name);
        return { behavior: "allow" as const };
      }
      if (answer === "yes") return { behavior: "allow" as const };
      return { behavior: "deny" as const, message: `User denied ${name}. Do not retry; ask what to do instead.` };
    },
    [yolo],
  );

  const submitPrompt = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || workingRef.current) return;
      setError(null);

      const slash = parseSlash(text) ?? parseBare(text);
      if (slash) {
        if (slash.type === "quit") {
          exit();
          return;
        }
        if (slash.type === "clear") {
          messagesRef.current = [];
          textIdRef.current = null;
          setRows([]);
          setSession((s) => s + 1);
          return;
        }
        if (slash.type === "context") {
          const id = nextId();
          const used = estimateTokens(messagesRef.current);
          const limit = getContextLimit(model, contextLimit);
          const text = limit
            ? `~${used} / ${limit} tokens (${Math.round((used / limit) * 100)}%) — auto-compacts at 75%`
            : `~${used} tokens (window unknown)`;
          setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text }]);
          idRef.current++;
          return;
        }
        if (slash.type === "compact") {
          if (workingRef.current) return;
          const id = nextId();
          if (messagesRef.current.length === 0) {
            setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Nothing to compact." }]);
            idRef.current++;
            return;
          }
          workingRef.current = true;
          setWorking(true);
          try {
            // In-memory only: the session file keeps the full log.
            const result = await compactMessages(messagesRef.current, provider, model);
            if (!result.compacted) {
              setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "History is already short." }]);
            } else {
              messagesRef.current = result.messages;
              textIdRef.current = null;
              setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Compacted. Summary:\n" + result.summary }]);
            }
          } catch (e) {
            setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Compact failed: " + (e instanceof Error ? e.message : String(e)) }]);
          } finally {
            workingRef.current = false;
            setWorking(false);
          }
          idRef.current++;
          return;
        }
        const id = nextId();
        if (slash.type === "help") {
          setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: HELP_TEXT }]);
          idRef.current++;
        } else {
          setRows((prev) => [
            ...prev,
            { kind: "user", id, text },
            { kind: "text", id: id + 1, text: `Unknown command: ${slash.name}. Try /help.` },
          ]);
          idRef.current++;
        }
        return;
      }

      const userId = nextId();
      setRows((prev) => [...prev, { kind: "user", id: userId, text }]);
      messagesRef.current.push({ role: "user", content: text });

      workingRef.current = true;
      setWorking(true);
      textIdRef.current = null;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of runAgent({
          provider,
          model,
          system,
          tools,
          messages: messagesRef.current,
          signal: controller.signal,
          contextLimit,
          canUseTool,
        })) {
          if (event.type === "text_delta") {
            appendText(event.delta);
          } else if (event.type === "tool_start") {
            textIdRef.current = null;
            const id = nextId();
            const label = shortLabel(event.name, event.input);
            setRows((prev) => [
              ...prev,
              { kind: "tool", id, toolCallId: event.id, label, status: "running", summary: "" },
            ]);
          } else if (event.type === "denied") {
            textIdRef.current = null;
          } else if (event.type === "compacted") {
            textIdRef.current = null;
            const id = nextId();
            setRows((prev) => [...prev, { kind: "text", id, text: `Auto-compacted context: ${event.before} → ${event.after} messages.` }]);
          } else if (event.type === "tool_end") {
            textIdRef.current = null;
            const summary = resultSummary(event.name, event.result, event.isError);
            setRows((prev) =>
              prev.map((r) =>
                r.kind === "tool" && r.toolCallId === event.id
                  ? { ...r, status: event.isError ? "error" : "ok", summary }
                  : r,
              ),
            );
          } else if (event.type === "turn_end" || event.type === "agent_end") {
            textIdRef.current = null;
          }
        }
      } catch (err) {
        textIdRef.current = null;
        if (err instanceof Error && err.name === "AbortError") {
          const id = nextId();
          setRows((prev) => [...prev, { kind: "text", id, text: "(interrupted)" }]);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        abortRef.current = null;
        workingRef.current = false;
        setWorking(false);
        // Persist only what this turn added; runAgent mutates messages in place.
        const fresh = messagesRef.current.slice(savedCount.current);
        if (fresh.length > 0) {
          savedCount.current = messagesRef.current.length;
          void appendMessages(sessionId, fresh).catch((e) => {
            setError(e instanceof Error ? e.message : String(e));
          });
        }
      }
    },
    [appendText, canUseTool, contextLimit, exit, model, provider, sessionId, system, tools],
  );

  useInput((input, key) => {
    // Permission dialog owns the keyboard while it is up.
    if (pending) {
      const ch = input.toLowerCase();
      if (ch === "y") pending.resolve("yes");
      else if (ch === "a") pending.resolve("always");
      else if (ch === "n" || key.escape) pending.resolve("no");
      return;
    }
    if (key.escape && workingRef.current) {
      abortRef.current?.abort();
    }
  });

  useEffect(() => {
    if (!startedRef.current && initialPrompt) {
      startedRef.current = true;
      void submitPrompt(initialPrompt);
    }
  }, [initialPrompt, submitPrompt]);

  // Only the last row ever mutates (streaming text appends to it,
  // tool status flips on it). Everything before it is final, so it
  // renders via <Static>: drawn once, never re-rendered per token.
  // This keeps scrollback clean instead of duplicating every frame.
  const settled = rows.length > 0 ? rows.slice(0, -1) : [];
  const live = rows.length > 0 ? rows[rows.length - 1]! : null;

  return (
    <Box flexDirection="column">
      <Header model={model} sessionId={sessionId} />
      {rows.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {initialMessages.length > 0
              ? `Resumed session — ${initialMessages.length} messages restored. Type, or /help.`
              : "Type a message, or /help."}
          </Text>
        </Box>
      )}
      <Static key={session} items={settled}>
        {(row) => renderRow(row)}
      </Static>
      {live && renderRow(live)}
      {pending && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Permission needed: {shortLabel(pending.name, pending.input)}</Text>
          <Text dimColor>y = yes · a = always · n = no (esc)</Text>
        </Box>
      )}
      {error && (
        <Box marginTop={1}>
          <Text color="red">✕ {error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor={working}>› </Text>
        <TextInput
          value={draft}
          onChange={setDraft}
          onSubmit={(value) => {
            if (pending) return;
            setDraft("");
            void submitPrompt(value);
          }}
          placeholder={pending ? "answer y/a/n…" : working ? "working…" : "Ask nimi…"}
        />
      </Box>
      <Box>
        <Text dimColor>{working ? "working… esc to interrupt" : "enter send · /help /clear /quit · esc interrupt"}</Text>
      </Box>
    </Box>
  );
}
