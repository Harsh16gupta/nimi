import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Static, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { runAgent } from "../agent.ts";
import { compactMessages, estimateTokens, getContextLimit } from "../agent/compaction.ts";
import { MODELS, getModelInfo } from "../providers/models.ts";
import { MissingApiKeyError, getProvider, getProviderMeta, listProviders } from "../providers/index.ts";
import { deleteApiKey, getAuthPath, getStoredKeySync, saveApiKey } from "../config/auth.ts";
import { appendMessages, listSessions, loadSession } from "../session/store.ts";
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
  // Null when startup found no key: the TUI opens the /login wizard instead.
  provider: Provider | null;
  model: string;
  system: string;
  tools: Tool[];
  initialPrompt?: string;
  yolo?: boolean;
  sessionId: string;
  initialMessages: Message[];
  contextLimit?: number;
  // Set when the requested provider had no key at startup.
  initialSetup?: { providerName: string; envVar: string } | null;
};

type AuthFlow =
  | { step: "provider"; mode: "login" | "logout"; selected: number }
  | { step: "key"; providerId: string; envVar: string };

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

export default function App({ provider, model, system, tools, initialPrompt, yolo, sessionId, initialMessages, contextLimit, initialSetup }: AppProps) {
  const { exit } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  // Pending write-tool approval: set by canUseTool, resolved by y/a/n keys.
  const [pending, setPending] = useState<{ name: string; input: Record<string, unknown>; resolve: (v: "yes" | "always" | "no") => void } | null>(null);
  // Pi-style auth flow: provider picker or masked key prompt, rendered
  // in place of the composer while active. Null during normal chatting.
  const [authFlow, setAuthFlow] = useState<AuthFlow | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

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
  // /model can switch these mid-session; history is kept.
  const [activeProvider, setActiveProvider] = useState(provider);
  const [activeModel, setActiveModel] = useState(model);

  const nextId = useCallback(() => idRef.current++, []);

  const appendText = useCallback((delta: string) => {
    const id = textIdRef.current;
    if (id === null) {
      const newId = nextId();
      textIdRef.current = newId;
      setRows((prev) => [...prev, { kind: "text", id: newId, text: delta }]);
    } else {
      setRows((prev) => prev.map((r) => (r.kind === "text" && r.id === id ? { ...r, text: r.text + delta } : r)));
    }
  }, [nextId]);

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

  // --- Pi-style auth (/login, /logout, startup wizard) ---

  // Open the key prompt for a known provider, or show an error row.
  const openKeyPrompt = useCallback(
    (providerId: string) => {
      try {
        const meta = getProviderMeta(providerId);
        setKeyDraft("");
        setAuthError(null);
        setAuthFlow({ step: "key", providerId: meta.id, envVar: meta.envVar });
      } catch (e) {
        const id = nextId();
        setRows((prev) => [...prev, { kind: "text", id, text: e instanceof Error ? e.message : String(e) }]);
      }
    },
    [nextId],
  );

  const openProviderPicker = useCallback((mode: "login" | "logout") => {
    setAuthError(null);
    setAuthFlow({ step: "provider", mode, selected: 0 });
  }, []);

  // Persist the key (mode 0600, like pi's auth.json), then activate the provider.
  const submitKey = useCallback(
    async (providerId: string, key: string) => {
      const trimmed = key.trim();
      if (!trimmed) {
        setAuthError("Empty key — paste an API key, or press esc to go back.");
        return;
      }
      try {
        await saveApiKey(providerId, trimmed);
        const created = getProvider(providerId);
        setActiveProvider(created);
        // Stay on the current model when it already belongs to this
        // provider; otherwise take the provider's default (pi behavior).
        const current = getModelInfo(activeModel);
        setActiveModel(current?.provider === providerId ? activeModel : created.defaultModel);
        setAuthFlow(null);
        setKeyDraft("");
        setAuthError(null);
        setError(null);
        const id = nextId();
        setRows((prev) => [...prev, { kind: "text", id, text: `Saved API key for ${providerId} to ${getAuthPath()}.` }]);
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : String(e));
      }
    },
    [activeModel, nextId],
  );

  const runLogout = useCallback(
    async (providerId: string, echoCommand: string) => {
      const id = nextId();
      try {
        getProviderMeta(providerId);
      } catch (e) {
        setRows((prev) => [...prev, { kind: "user", id, text: echoCommand }, { kind: "text", id: id + 1, text: e instanceof Error ? e.message : String(e) }]);
        idRef.current++;
        return;
      }
      const removed = await deleteApiKey(providerId);
      // Dropping the in-process env copy makes /logout take effect immediately;
      // a key exported in the shell still applies on next launch (pi behavior).
      if (removed) delete process.env[getProviderMeta(providerId).envVar];
      setAuthFlow(null);
      const stillConfigured = (() => {
        try {
          getProvider(providerId);
          return true;
        } catch {
          return false;
        }
      })();
      // If the user logged out the provider they are chatting with, drop back
      // to the picker so the next message can't fail with a key error.
      if (activeProvider?.name === providerId && !stillConfigured) {
        setActiveProvider(null);
        setAuthFlow({ step: "provider", mode: "login", selected: 0 });
      }
      setRows((prev) => [
        ...prev,
        { kind: "user", id, text: echoCommand },
        { kind: "text", id: id + 1, text: removed ? `Removed stored API key for ${providerId}. Environment variables are unchanged.` : `No stored API key for ${providerId}.` },
      ]);
      idRef.current++;
    },
    [activeProvider, nextId],
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
        if (slash.type === "login") {
          const id = nextId();
          if (!slash.arg) {
            setRows((prev) => [...prev, { kind: "user", id, text }]);
            idRef.current++;
            openProviderPicker("login");
          } else {
            setRows((prev) => [...prev, { kind: "user", id, text }]);
            idRef.current++;
            openKeyPrompt(slash.arg);
          }
          return;
        }
        if (slash.type === "logout") {
          if (!slash.arg) openProviderPicker("logout");
          else await runLogout(slash.arg, text);
          return;
        }
        if (slash.type === "model") {
          const id = nextId();
          if (!slash.arg) {
            const lines = MODELS.map((m) => `  ${m.id}${m.id === activeModel ? "  ← current" : ""}`);
            setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Models (use /model <id>):\n" + lines.join("\n") }]);
          } else {
            const info = getModelInfo(slash.arg);
            if (!info) {
              setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: `Unknown model: ${slash.arg}  (try /model)` }]);
            } else {
              try {
                setActiveProvider(getProvider(info.provider));
                setActiveModel(info.id);
                setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: `Switched to ${info.id} — history kept.` }]);
              } catch (e) {
                // Missing key: route into the login flow like pi instead of
                // leaving a bare error row.
                setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: e instanceof Error ? e.message : String(e) }]);
                if (e instanceof MissingApiKeyError) openKeyPrompt(e.provider);
              }
            }
          }
          idRef.current++;
          return;
        }
        if (slash.type === "tools") {
          const id = nextId();
          const lines = tools.map((t) => `  ${t.name}${t.readOnly ? "  [read-only]" : "  [asks permission]"}`);
          setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Tools:\n" + lines.join("\n") }]);
          idRef.current++;
          return;
        }
        if (slash.type === "sessions") {
          const id = nextId();
          const ids = await listSessions();
          const lines: string[] = [];
          for (let i = ids.length - 1; i >= 0 && lines.length < 10; i--) {
            const loaded = await loadSession(ids[i]!);
            if (loaded) lines.push(`  ${loaded.info.id}  ${loaded.info.provider}/${loaded.info.model}`);
          }
          setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: lines.length > 0 ? "Sessions (resume with --session <id>):\n" + lines.join("\n") : "No saved sessions yet." }]);
          idRef.current++;
          return;
        }
        if (slash.type === "session") {
          const id = nextId();
          setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: `Session ${sessionId} — resume with: nimi --session ${sessionId}` }]);
          idRef.current++;
          return;
        }
        if (slash.type === "context") {
          const id = nextId();
          const used = estimateTokens(messagesRef.current);
          const limit = getContextLimit(activeModel, contextLimit);
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
          if (!activeProvider) {
            setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Not logged in. Run /login to add an API key first." }]);
            idRef.current++;
            openProviderPicker("login");
            return;
          }
          if (messagesRef.current.length === 0) {
            setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: "Nothing to compact." }]);
            idRef.current++;
            return;
          }
          workingRef.current = true;
          setWorking(true);
          try {
            // In-memory only: the session file keeps the full log.
            const result = await compactMessages(messagesRef.current, activeProvider, activeModel);
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
      // No key yet: route into the picker instead of failing the request.
      if (!activeProvider) {
        setRows((prev) => [...prev, { kind: "user", id: userId, text }, { kind: "text", id: userId + 1, text: "Not logged in. Pick a provider to add its API key." }]);
        idRef.current++;
        if (!authFlow) openProviderPicker("login");
        return;
      }
      setRows((prev) => [...prev, { kind: "user", id: userId, text }]);
      messagesRef.current.push({ role: "user", content: text });

      workingRef.current = true;
      setWorking(true);
      textIdRef.current = null;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of runAgent({
          provider: activeProvider,
          model: activeModel,
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
    [appendText, canUseTool, contextLimit, exit, activeModel, activeProvider, authFlow, nextId, openKeyPrompt, openProviderPicker, runLogout, sessionId, system, tools],
  );

  useInput((input, key) => {
    // Auth picker owns the keyboard while it is up (pi: selector replaces editor).
    if (authFlow?.step === "provider") {
      const options = listProviders();
      if (key.upArrow) {
        setAuthFlow((prev) => (prev?.step === "provider" ? { ...prev, selected: (prev.selected + options.length - 1) % options.length } : prev));
        return;
      }
      if (key.downArrow) {
        setAuthFlow((prev) => (prev?.step === "provider" ? { ...prev, selected: (prev.selected + 1) % options.length } : prev));
        return;
      }
      if (key.return) {
        const current = authFlow;
        const picked = options[current.selected];
        if (!picked) return;
        if (current.mode === "login") {
          setKeyDraft("");
          setAuthError(null);
          setAuthFlow({ step: "key", providerId: picked.id, envVar: picked.envVar });
        } else {
          void runLogout(picked.id, `/logout ${picked.id}`);
        }
        return;
      }
      // Esc closes the picker only once chatting is possible; at startup
      // (no provider yet) there is nothing to go back to.
      if (key.escape && activeProvider) {
        setAuthFlow(null);
        setAuthError(null);
      }
      return;
    }
    // Key prompt: TextInput owns typing; esc steps back to the picker.
    if (authFlow?.step === "key" && key.escape) {
      setAuthFlow({ step: "provider", mode: "login", selected: 0 });
      setAuthError(null);
      setKeyDraft("");
      return;
    }
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
    // Startup without a key (or a logged-out switch): open the key prompt
    // for the requested provider, like pi's first-run /login.
    // Gated on live state (not the initial prop): after a successful login
    // activeProvider is set, so this must not fire again when the flow closes.
    if (!activeProvider && initialSetup && !authFlow) {
      setAuthFlow({ step: "key", providerId: initialSetup.providerName, envVar: initialSetup.envVar });
    }
  }, [activeProvider, initialSetup, authFlow]);

  useEffect(() => {
    // Don't fire the pending prompt until login completes.
    if (!startedRef.current && initialPrompt && activeProvider) {
      startedRef.current = true;
      void submitPrompt(initialPrompt);
    }
  }, [initialPrompt, submitPrompt, activeProvider]);

  // Only the last row ever mutates (streaming text appends to it,
  // tool status flips on it). Everything before it is final, so it
  // renders via <Static>: drawn once, never re-rendered per token.
  // This keeps scrollback clean instead of duplicating every frame.
  const settled = rows.length > 0 ? rows.slice(0, -1) : [];
  const live = rows.length > 0 ? rows[rows.length - 1]! : null;

  return (
    <Box flexDirection="column">
      <Header model={activeModel} sessionId={sessionId} />
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
      {authFlow?.step === "provider" && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>{authFlow.mode === "login" ? "Select a provider to log in:" : "Select a provider to log out:"}</Text>
          {listProviders().map((p, i) => {
            const selected = i === authFlow.selected;
            const saved = getStoredKeySync(p.id) ? "  ✓ saved" : "";
            return (
              <Text key={p.id} color={selected ? "cyan" : undefined} dimColor={!selected}>
                {selected ? "→ " : "  "}{p.label} <Text dimColor>({p.id}){saved}</Text>
              </Text>
            );
          })}
          <Text dimColor>↑↓ navigate · enter select{activeProvider ? " · esc cancel" : ""}</Text>
        </Box>
      )}
      {authFlow?.step === "key" && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Login to {authFlow.providerId}</Text>
          <Text dimColor>Paste {authFlow.envVar} — saved to {getAuthPath()}</Text>
          <Box marginTop={1}>
            <Text dimColor>› </Text>
            <TextInput
              value={keyDraft}
              onChange={setKeyDraft}
              onSubmit={(value) => {
                void submitKey(authFlow.providerId, value);
              }}
              placeholder="sk-…"
              mask="*"
            />
          </Box>
          {authError && (
            <Box marginTop={1}>
              <Text color="red">✕ {authError}</Text>
            </Box>
          )}
          <Text dimColor>enter save · esc back</Text>
        </Box>
      )}
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
      {!authFlow && (
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
            placeholder={pending ? "answer y/a/n…" : working ? "working…" : activeProvider ? "Ask nimi…" : "Run /login…"}
          />
        </Box>
      )}
      <Box>
        <Text dimColor>
          {authFlow ? "login flow · esc back" : working ? "working… esc to interrupt" : "enter send · /login /model /help · esc interrupt"}
        </Text>
      </Box>
    </Box>
  );
}
