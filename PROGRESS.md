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
