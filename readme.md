# nimi — minimal coding agent

A lightweight terminal agent: a language model with controlled access to your
files, shell, and git, running a read-act loop until the task is done.

```
nimi "list the typescript files under src"
echo "explain the agent loop" | nimi -p
nimi --classic "refactor src/tools/grep.ts"
```

## Quickstart

Requires Node 22+ and one provider key.

```
npm install
cp .env.example .env   # add your key(s)
npx tsx src/main.tsx "hello"
```

```env
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
META_API_KEY=...
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
```

## Usage

```
nimi [message]            Interactive TUI (default)
nimi --classic [message]  Plain readline REPL (no Ink needed)
nimi --print [message]    One-shot: stream the answer to stdout
echo ... | nimi -p         Read the prompt from a pipe

Options
  -p, --prompt <text>  Prompt to send
  -z, --provider <id>  anthropic, groq, meta, deepseek, openai, anthropic-openai
      --model <id>     Model id (registry in src/providers/models.ts)
      --session <id>   Resume a saved session (--list-sessions to list)
      --context-limit <n>  Override the model's context window
      --classic --print --yolo  REPL / one-shot / skip permission prompts
  -v, --version  -h, --help
```

TUI slash: `/model /tools /sessions /session /compact /context /clear /help /quit`.

## Tools (15)

Read-only (never prompt): `read ls find grep git_status git_log git_diff`.
Ask `y/a/always/n` (or `--yolo`): `write edit bash` + `git_add git_commit
git_branch git_checkout git_reset`. Output capped at 20000 chars, 30s timeouts.

## Config

`~/.nimi/settings.json` < `.nimi/settings.json` < `NIMI_PROVIDER`/`NIMI_MODEL`
< CLI flags. Sessions live in `.nimi/sessions/<id>.jsonl` (gitignored).

## Development

```
npm run check       # biome lint + tsc --noEmit (0 errors)
npm run test:tools  # offline tool suite, no keys (7 tests)
```

Context auto-compacts at 75% of the window (`/compact` for manual).
