import { existsSync } from "node:fs";
import { join } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, useApp, useInput } from "ink";
import { runAgent } from "../agent.ts";
import { compactMessages, estimateTokens, getContextLimit } from "../agent/compaction.ts";
import { MODELS, getModelInfo } from "../providers/models.ts";
import { MissingApiKeyError, getProvider, getProviderMeta, listProviders } from "../providers/index.ts";
import { deleteApiKey, getAuthPath, saveApiKey } from "../config/auth.ts";
import { CONTEXT_FILES } from "../config/system-prompt.ts";
import { appendMessages, listSessions, loadSession } from "../session/store.ts";
import type { Message, Provider, Tool } from "../types.ts";
import { resultSummary, shortLabel } from "./format.ts";
import { HELP_TEXT, parseBare, parseSlash } from "./slash.ts";
import { AuthKeyPrompt, AuthProviderPicker, type AuthFlow } from "./components/AuthDialog.tsx";
import { Composer, ErrorLine, PermissionDialog } from "./components/Composer.tsx";
import { Footer } from "./components/Footer.tsx";
import { StartupHeader } from "./components/Header.tsx";
import { renderRow, type Row } from "./components/ToolRow.tsx";
import { getGitBranch } from "./components/util.ts";

type AppProps = {
  // Null when startup found no key: the TUI opens the /login wizard instead.
  provider: Provider | null;
  model: string;
  // Build version shown beside the wordmark (pi shows vX beside its logo).
  version: string;
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

export default function App({ provider, model, version, system, tools, initialPrompt, yolo, sessionId, initialMessages, contextLimit, initialSetup }: AppProps) {
  const { exit } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  // Pending write-tool approval: set by canUseTool, resolved by y/a/n keys.
  const [pending, setPending] = useState<{ name: string; input: Record<string, unknown>; resolve: (v: "yes" | "always" | "no") => void } | null>(null);
  // Graceful exit: show a farewell row, let it paint, then quit.
  const [leaving, setLeaving] = useState(false);
  // Pi-style auth flow: provider picker or masked key prompt, rendered
  // in place of the composer while active. Null during normal chatting.
  const [authFlow, setAuthFlow] = useState<AuthFlow | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Startup chrome: project context files actually present in the cwd,
  // and the git branch (read once — branches rarely change mid-chat).
  const contextFiles = useMemo(
    () =>
      CONTEXT_FILES.filter((f) => {
        try {
          return existsSync(join(process.cwd(), f));
        } catch {
          return false;
        }
      }),
    [],
  );
  const branch = useMemo(() => getGitBranch(process.cwd()), []);

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

  // Pi-style exit: confirm the session is saved and print the resume
  // command, then leave once the farewell has painted.
  const quit = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    const id = nextId();
    setRows((prev) => [...prev, { kind: "text", id, text: `Session saved — resume with: nimi --session ${sessionId}` }]);
  }, [leaving, nextId, sessionId]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => exit(), 150);
    return () => clearTimeout(t);
  }, [leaving, exit]);

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
      if (!text || workingRef.current || leaving) return;
      setError(null);

      const slash = parseSlash(text) ?? parseBare(text);
      if (slash) {
        if (slash.type === "quit") {
          quit();
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
          const text2 = limit
            ? `~${used} / ${limit} tokens (${Math.round((used / limit) * 100)}%) — auto-compacts at 75%`
            : `~${used} tokens (window unknown)`;
          setRows((prev) => [...prev, { kind: "user", id, text }, { kind: "text", id: id + 1, text: text2 }]);
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
    [appendText, canUseTool, contextLimit, leaving, activeModel, activeProvider, authFlow, nextId, openKeyPrompt, openProviderPicker, quit, runLogout, sessionId, system, tools],
  );

  useInput((input, key) => {
    // Ctrl+C exits cleanly when idle; interrupts the agent when working.
    if (key.ctrl && input === "c") {
      if (pending) {
        pending.resolve("no");
        return;
      }
      if (workingRef.current) {
        abortRef.current?.abort();
      } else if (!leaving) {
        quit();
      }
      return;
    }
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

  // Pi-style permission dialog: it replaces the composer while up, so
  // y/a/n keystrokes never land in the draft — nothing to delete after.
  useEffect(() => {
    if (pending) setDraft("");
  }, [pending]);

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

  // The boot box renders once at the very top of the scrollback and
  // scrolls away like Claude's welcome box — never floating mid-page.
  // (Ink paints <Static> above dynamic content, so a dynamic header
  // would sink below the transcript as it grows.)
  const items: Row[] = [{ kind: "boot", id: 0 }, ...(rows.length > 0 ? rows.slice(0, -1) : [])];
  const live = rows.length > 0 ? rows[rows.length - 1]! : null;

  // Footer context usage, live from the same estimator as compaction.
  const used = estimateTokens(messagesRef.current);
  const limit = getContextLimit(activeModel, contextLimit);

  return (
    <Box flexDirection="column">
      <Static key={session} items={items}>
        {(row) =>
          row.kind === "boot" ? (
            <StartupHeader key="boot" version={version} resumedCount={initialMessages.length} contextFiles={contextFiles} />
          ) : (
            renderRow(row)
          )
        }
      </Static>
      {live && renderRow(live)}
      {authFlow?.step === "provider" && (
        <AuthProviderPicker mode={authFlow.mode} selected={authFlow.selected} canCancel={activeProvider !== null} />
      )}
      {authFlow?.step === "key" && (
        <AuthKeyPrompt
          providerId={authFlow.providerId}
          envVar={authFlow.envVar}
          draft={keyDraft}
          onChange={setKeyDraft}
          onSubmit={(value) => {
            void submitKey(authFlow.providerId, value);
          }}
          error={authError}
        />
      )}
      {pending && <PermissionDialog name={pending.name} input={pending.input} />}
      {error && <ErrorLine message={error} />}
      {!authFlow && !pending && (
        <Composer
          draft={draft}
          onChange={setDraft}
          onSubmit={(value) => {
            if (pending) return;
            setDraft("");
            void submitPrompt(value);
          }}
          working={working}
          canChat={activeProvider !== null}
          busy={pending !== null}
        />
      )}
      {pending && (
        <Box marginTop={1}>
          <Text dimColor>› …</Text>
        </Box>
      )}
      <Footer
        providerName={activeProvider?.name ?? null}
        model={activeModel}
        used={used}
        limit={limit}
        sessionId={sessionId}
        branch={branch}
      />
    </Box>
  );
}
