# PROGRESS — nimi rebuild

## Step 1: Discovery tools (ls / find / grep)
- What I learned: agent was blind without discovery — it abused `bash ls/grep`. Dedicated tools return cleaner, capped output and skip `node_modules/.git` so context stays small.
- What changed: added `src/tools/ls.ts`, `src/tools/find.ts`, `src/tools/grep.ts` (same `Tool` shape, no type break); registered in `src/tools/index.ts`. System prompt picks them up automatically.
- How to verify: `npx tsc --noEmit` OK; `npx tsx ./smoke-step1.ts` showed 7 tools registered, `ls src` listed dirs, `find *.ts` found 8 files, `grep TODO` hit + invalid regex threw cleanly; `npx tsx src/main.tsx --help` still works.

## Step 2: Tool hardening (truncate + timeout + readOnly)
- What I learned: one big `read`/`grep` can dump 100k chars into the next prompt and blow context; one hanging `bash` stalls the loop. Caps + timeout bound cost. `readOnly` marks safe tools so Step 4 permissions can auto-allow them.
- What changed: `src/types.ts` added `readOnly?: boolean` (additive only); new `src/tools/output.ts` `truncateOutput(20000)`; `read`+`bash` wrap output, `bash` gets 30s `timeout`; `read/ls/find/grep` set `readOnly:true`.
- How to verify: `npx tsc --noEmit` OK; smoke showed `read=true,write=false,edit=false,bash=false,ls=true,find=true,grep=true`, 20001 chars -> 20027 with marker, `bash echo hi` OK; `--help` still works.

## Step 3: Git read-only (status/log/diff via spawn)
- What I learned: agent couldn't see repo state without `bash git ...` (shell-injection risk). `spawn("git", argsArray)` avoids shell; non-zero exit throws so loop marks `isError`.
- What changed: new `src/tools/git.ts` with `runGit` helper (30s kill, stderr merged, `truncateOutput`) + `git_status`/`git_log`/`git_diff`, all `readOnly:true`; registered in `src/tools/index.ts`. No type change.
- How to verify: `npx tsc --noEmit` OK; smoke in repo showed 10 tools, status/log/diff output correct; `--help` still works.

## Step 4: Permissions gate (y/a/n/always + --yolo)
- What I learned: writes/commands need asking; observes don't. Gate returns deny as error result so model adapts instead of crash. `always` set remembers per-tool choice.
- What changed: new `src/permissions.ts` (`CanUseTool`, `allowAll`, `createPromptPermission`); `agent.ts` checks `readOnly!==true` then gate; `arg.ts` adds `--yolo`; `main.tsx` print mode wires prompt/`allowAll`. TUI dialog deferred to Step 10.
- How to verify: `npx tsc --noEmit` OK; fake-provider smoke: write deny -> `isError=true`, ls bypass `gateCalls=0`; `--help` shows `--yolo`.

## Step 4b: TUI permission dialog (y/a/n in Ink)
- What changed: `App.tsx` holds `pending` + `alwaysAllowed`, `canUseTool` parks a promise, `useInput` resolves it on y/a/n/esc; input box locked while pending. `main.tsx` passes `yolo`.
- How to verify: `npx tsc --noEmit` OK; manual TUI run asks on `write`/`bash`, `read`/`ls` pass through.

## Step 5: Loop as generator (decide-by-blocks, denied event)
- What I learned: callback `onEvent` forced UIs to share one shape and hid denials; yielding lets print/TUI consume the same stream. Stop-reason lies (Gemini `end_turn` with tools), blocks don't.
- What changed: `runAgent` is `async *` yielding `agent_start/text_delta/tool_start/tool_end/denied/turn_end/agent_end`; `maxTurns` 10->20; `main.tsx` + `App.tsx` use `for await`. Deny yields `denied` then error `tool_end`.
- How to verify: `npx tsc --noEmit` OK; fake-provider smoke: stop+toolCall still runs tool, deny emits `denied+tool_end`; `--help` works.

## Provider hardening (parallel calls, safe JSON, model registry)
- What I learned: one shared JSON string corrupts parallel tool inputs; an unguarded `JSON.parse` crashes the loop on partial args; `process.env.X!` gives cryptic crashes.
- What changed: `anthropic.ts` keeps one buffer per block routed by stream index + safe parse; `openai-compat.ts` safe-parses args; new `providers/models.ts` (`MODELS` + `getModelInfo`); `index.ts` uses friendly `requireKey` errors and adds `openai` entry.
- How to verify: `npx tsc --noEmit` OK; registry lists 5 models, unknown provider/key errors are readable; `--help` works.

## Sessions (JSONL save, resume, list)
- What I learned: memory-only history dies on exit; append-only JSONL (one entry per line) survives crashes and resumes by re-reading lines. Save only what the run added (`messages.slice(before)`) so resume never duplicates.
- What changed: new `src/session/store.ts` (`session_info` + `message` entries under `.nimi/sessions/`, tolerant load); `arg.ts` adds `--session/--list-sessions`; print-mode creates/resumes/saves and prints the resume id to stderr. TUI persist deferred.
- How to verify: `npx tsc --noEmit` OK; offline round-trip (save 1 msg, load 1 msg, missing -> null, listed); `--list-sessions` prints newest-first; `--help` works.

## TUI sessions (resume + save per turn, simple header)
- What I learned: print mode persisted but the TUI stayed amnesiac — same store, different lifecycle: init from loaded history, save the per-turn slice in `finally`.
- What changed: `App += sessionId/initialMessages` (history init + `savedCount`, `appendMessages` per turn, header shows short id, resumed notice with count); `main.tsx` TUI branch creates/resumes like print mode. No Markdown, no token counter — kept simple.
- How to verify: `npx tsc --noEmit` OK; slice-save smoke (2 msgs turn 1, +1 turn 2, no dupes); `--help` works; manual TUI run resumes.

## Manual compaction (estimate, safe split, LLM summary)
- What I learned: summarization preserves decisions while truncation just deletes; the cut must never orphan a `toolResult` from its assistant turn or providers reject it. `chars/4` is plenty for a threshold.
- What changed: new `src/agent/compaction.ts` (`estimateTokens`, `getContextLimit` flag > `MODELS`, `shouldCompact` at 75%, `findSafeSplit`, `compactMessages` via current provider); TUI `/compact` + `/context`; `arg += --context-limit`; `App += contextLimit`. Auto-compact in loop deferred.
- How to verify: `npx tsc --noEmit` OK; 1000 chars ~ 250 tokens, tiny limit triggers, summary replaces head keeping 6, orphan guard holds; `--help` shows flag.

## Auto-compact in the loop (threshold check per turn)
- What I learned: manual `/compact` only helps if you remember; checking before each provider call makes long runs self-sustaining. In-place mutation keeps the caller's array reference valid.
- What changed: `AgentOptions += contextLimit?`, `AgentEvent += compacted {before, after}`; loop compacts then yields the notice; print logs one line, TUI adds a transcript row; both pass `contextLimit` through.
- How to verify: `npx tsc --noEmit` OK; oversized history compacts first (`compacted` before `turn_end`), ends clean, history shrinks; `--help` works.

## Slash essentials (model/tools/sessions/session in TUI)
- What I learned: every new slash is just a renderer over state already in hand (registry, tools prop, store, sessionId) — except `/model`, which needs switchable provider state.
- What changed: `slash.ts` parses `/model <id>` arg + 3 new actions; `App` holds `activeProvider/activeModel` (history kept across switches, missing-key errors shown inline) and renders the four read-only commands.
- How to verify: `npx tsc --noEmit` OK; `/model` lists, bad id errors, `/tools` tags ro/ask, `/sessions`/`/session` print; `--help` unchanged.

## Classic REPL (readline, same generator and slashes)
- What I learned: print stays the non-TTY default so pipes never change; `--classic` wins over pipe detection because it's an explicit interactive request.
- What changed: new `src/modes/classic.ts` (prompt loop, full slash set, `/model` switch, per-turn save); `arg += --classic`; `main.tsx` routes to it before Ink. TUI untouched.
- How to verify: `npx tsc --noEmit` OK; piped `quit` exits clean with banner; pipe print still one-shots; `--help` shows flag.

## Git writes (add/commit/branch/checkout/reset, gated)
- What I learned: one tool that can delete must always ask — so `git_branch` stays writable even though `list` is harmless. Validation throws before spawn, so bad input never reaches git.
- What changed: 5 tools in `src/tools/git.ts` reusing `runGit` (array args, 30s kill, truncate); all writable so the gate prompts; registered in `index.ts` (15 tools total).
- How to verify: `npx tsc --noEmit` OK; `git_*=ro,ro,ro,ask×5`; all 5 reject bad input without mutating; `branch list` runs; `--help` works.

## Settings cascade (global < project < env, flags win)
- What I learned: hardcoding `meta` meant every other provider needed a flag; layered files let machine and repo defaults stick while env/flags override per run.
- What changed: new `src/config/settings.ts` (`~/.nimi` < `.nimi` < `NIMI_PROVIDER/MODEL`, missing/broken file = `{}`); `CliArgs.provider` optional with default resolved in `main.tsx`; `+= --print` (forces one-shot even in TTY); session records use resolved provider name. `--classic/--context-limit` deferred to their consumer steps.
- How to verify: `npx tsc --noEmit` OK; empty args parse, settings load, `NIMI_PROVIDER` overrides; `--help` shows `--print`; `--list-sessions` works.

## Quality: Biome lint clean, Vitest tools offline green
- What I learned: full-tree reformat (25 files) destroys history readability — scoped Biome to lint only, formatter off; the only 2 errors were real (`nextId` recreated per render, flagged by exhaustive-deps).
- What changed: `biome.json` (lint recommended, no format), `App.nextId` wrapped in `useCallback([])` + deps, `npm run check` (lint + tsc), `npm run test:tools`, `test/tools.test.ts` (7 tests, temp-dir, no keys).
- How to verify: `npm run check` exit 0 (warnings/infos accepted, 0 errors); `test:tools` 7/7 green.

## Showcase step 1: Trace recorder (`--trace` + print wiring)
- What I learned: the header can't know turn/tool counts up front, so streaming (crash-safe) wins over buffering: header carries identity (session/provider/model/prompt/started_at/argv), the `end` line carries `counts{turns,tools}` + `messageCount`; the viewer will read totals from `end`.
- What changed: new `src/trace/recorder.ts` (`createTraceRecorder` header/event/snapshot/end JSONL lines, sync appends, `withTrace` tee wrapper that yields events through unchanged and seals the file in `finally`); `arg.ts += --trace <path>`; `main.tsx` print mode wraps `runAgent` only when the flag is set. No type-shape change (additive `trace?` only).
- How to verify: `npm run check` 0 errors; `--help` shows the flag; offline fake-provider smoke (2 turns, 1 tool): 7 events tee'd through, sequential `i`, 3 snapshots (turn_end×2 + agent_end), `end{turns:2,tools:1}`; without the flag the loop is untouched.

## Showcase steps 2–11: classic trace + viewer site (demo/)
- What I learned: the viewer must never duplicate agent knowledge — the header now ships the tool catalog (`tools:[{name,readOnly}]`), so gating badges and deny targeting derive from the trace; and nimi yields `turn_end` *before* its tools run, so turn grouping closes a turn only when the next model phase starts (else tools land in the wrong turn).
- What changed: step 2 — classic REPL records one trace across turns (lazy header on first prompt, `finish()` on `/quit`) + header tools catalog; steps 3–11 — `demo/` Vite+React site: `data/trace.js` parse/fold (`replay` with allow/deny branch, print/classic blocks, per-turn token deltas; deny injects the gate's exact message and truncates), frozen `samples/showcase.jsonl` v1 (synthetic 23-event run via the real recorder: read→gated write, compaction, 3 turns), light-first theme, controls bar (play/step/speed/output/branch/filter), turn-grouped timeline with sparklines, event-rail minimap with playhead, inspector (payload/messages/events tabs, L<n> cites, copy), terminal replay, `#print/allow/12` hash routing with keyboard.
- How to verify: `npm run check` 0 errors (warnings/infos identical to baseline), trace fold test green (23 events, 3 turns, deny truncation + exact deny text, compaction dip 178→54), `npm run build` clean in `demo/`, trace confirmed inlined in the bundle, `--help` intact. Not browser-tested (no browser here) — needs your click-through. Deploy = one Vercel project rooted at `demo/` (auto-detects Vite).

## Single-flow diagram canvas with click-to-open inspector
- Dropped the turn lanes and event rail: the canvas is now one continuous left-to-right chain (user → LLM → tools → results → gate → summarize → answer), matching the approved mockup and how Cogent reads. Nodes are hand-built SVG with original icons; shape and accent carry meaning (oval start/end, amber gate, green done, red denied, indigo selection).
- New `demo/src/data/flow.js` (tested: 15-node allow chain, 8-node deny chain ending at the denied gate, early-scrub prefix). No sidebar at start — clicking a node opens a floating glass inspector (payload = the node's full events, plus messages/events/terminal tabs). Print/classic toggle now drives the terminal tab. Mac top bar, floating playback pill, hash routing and keyboard unchanged.
- Verify: `npm run build` clean in `demo/`; flow-chain node test green; `npm run check` 0 errors. Still needs your browser click-through; Vercel deploy still one manual project creation.

## Final report
Rebuilt nimi step by step from a 4-tool loop to a Cogent-parity lightweight
agent: 15 tools (7 read-only, 8 gated), permission gate + TUI dialog + `--yolo`,
generator loop with denied/compacted events, hardened providers + model registry,
JSONL sessions in print + TUI + classic, settings cascade, slash essentials,
manual + auto compaction. Verify: `npm run check` (0 errors), `npm run
test:tools` (7/7 offline green), `npx tsx src/main.tsx --help`.
Intentionally left out: `/tree` branch summaries, extension hooks, Markdown TUI,
full TUI chrome — weight, not capability.
