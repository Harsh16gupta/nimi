# PROGRESS — nimi rebuild

## Step 1: Discovery tools (ls / find / grep)
- What I learned: agent was blind without discovery — it abused `bash ls/grep`. Dedicated tools return cleaner, capped output and skip `node_modules/.git` so context stays small.
- What changed: added `src/tools/ls.ts`, `src/tools/find.ts`, `src/tools/grep.ts` (same `Tool` shape, no type break); registered in `src/tools/index.ts`. System prompt picks them up automatically.
- How to verify: `npx tsc --noEmit` OK; `npx tsx ./smoke-step1.ts` showed 7 tools registered, `ls src` listed dirs, `find *.ts` found 8 files, `grep TODO` hit + invalid regex threw cleanly; `npx tsx src/main.tsx --help` still works.
