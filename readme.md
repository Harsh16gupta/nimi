<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/nimi-logo-dark.png">
    <img alt="Nimi" src="docs/assets/nimi-logo-light.png" width="480">
  </picture>
</p>

<p align="center">
  <strong>A lightweight, open-source terminal coding-agent harness. Every step, inspectable.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nimi-code"><img alt="npm version" src="https://img.shields.io/npm/v/nimi-code?style=flat-square"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/npm/l/nimi-code?style=flat-square"></a>
</p>

# nimi

Nimi points a language model at your codebase and gives it controlled access to your files, shell, and git — read, search, write, edit, run commands — until the job is done. Read-only tools run freely; anything that mutates pauses at an explicit permission gate (`[y]es` / `[a]lways` / `[n]o`). Every run is recorded as a JSONL trace you can replay.

What Nimi is **not**: not a model, not a subscription, not a hosted platform. You bring your own provider key, run everything on your own machine, and can fork the whole thing (ISC licensed).

## Quickstart

Requires **Node 22+** and one provider key.

```bash
npm install -g nimi-code
export META_API_KEY=...   # or XAI_API_KEY, MOONSHOT_API_KEY, ANTHROPIC_API_KEY, ...
cd /path/to/your/project
nimi "list the typescript files under src"
```

That's it — Nimi opens an interactive session in your terminal. Give it a task in plain language.

## Usage

| Mode | Command | Behavior |
|---|---|---|
| Interactive (default) | `nimi "task"` | Full terminal UI with streaming output |
| Classic REPL | `nimi --classic "task"` | Plain readline loop, compact result previews |
| One-shot | `nimi --print "task"` | Runs once, streams to stdout, exits (scriptable) |
| Pipe | `echo ... \| nimi -p` | Prompt from stdin, no TTY needed |

```
-p, --prompt <text>       prompt to send
-z, --provider <id>       anthropic, anthropic-openai, groq, meta (default),
                          deepseek, openai, xai, kimi, google, alibaba, zai,
                          custom (see below)
    --model <id>          override the provider's default model
    --session <id>        resume a session (--list-sessions to list)
    --context-limit <n>   override context window
    --trace <path>        write a JSONL showcase trace (print mode)
    --classic --print --yolo
-v, --version  -h, --help
```

Slash commands (interactive mode): `/model` `/provider` `/login` `/logout` `/sessions` `/session` `/compact` `/context` `/clear` `/help` `/quit` — bare `clear`, `quit`, `exit`, and `q` work too.

```bash
nimi -p "explain this codebase" --provider kimi
nimi "find all TODOs and write them to NOTES.md"
nimi --session abc123 "continue where we left off"
```

## Providers

Nimi is provider-agnostic over OpenAI-compatible APIs. The default provider is `meta`.

| Provider (`-z`) | Key | Default model |
|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-5` |
| `anthropic-openai` | `ANTHROPIC_API_KEY` | `claude-sonnet-5` (OpenAI-compatible endpoint) |
| `groq` | `GROQ_API_KEY` | `qwen/qwen3.8-27b` |
| `meta` (default) | `META_API_KEY` | `muse-spark-1.3-contributor` |
| `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-flash` |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| `xai` | `XAI_API_KEY` | `grok-4` |
| `kimi` | `MOONSHOT_API_KEY` | `kimi-k2` |
| `google` | `GOOGLE_API_KEY` | `gemini-2.5-flash` |
| `alibaba` | `DASHSCOPE_API_KEY` | `qwen3.8-max` |
| `zai` | `ZAI_API_KEY` | `glm-5.3` |
| `custom` | `NIMI_API_KEY` | (none — you supply it, see below) |

Century-scale context is the norm here: most models above offer 1M tokens. `--model` accepts any model id string, even one not listed above — the catalog only feeds the `/model` picker and the auto-compaction threshold (unknown models skip auto-compaction unless you pass `--context-limit`).

Override the model per run with `--model <id>`, per environment with `NIMI_MODEL`, or switch mid-session with `/model`. First run opens `/login` in the TUI (keys saved to `~/.nimi/auth.json`); headless/CI can export the key instead.

### Custom provider

Any OpenAI-compatible endpoint works without code changes — Ollama, vLLM, Together, or anything else not listed above:

```bash
export NIMI_BASE_URL=https://your-host/v1
export NIMI_API_KEY=...        # or run /login custom once
nimi -z custom --model <model-id> "your task"
```

`NIMI_MODEL` can supply the default model instead of `--model`. In the TUI, `/model <id>` accepts any id while on the custom provider.

## Config & sessions

Settings cascade (each level wins over the previous):

`~/.nimi/settings.json` → `.nimi/settings.json` (project) → `NIMI_PROVIDER` / `NIMI_MODEL` → CLI flags

Sessions persist per project in `.nimi/sessions/` — resume with `--session <id>`, list with `--list-sessions`. On startup Nimi also loads project context from `AGENTS.md`, `CLAUDE.md`, `.context`, and `.nimi/context.md` when present.

## Web playground (local)

`demo/` is a static Vite + React app that replays a bundled sample trace — a trace viewer and explainer, not a live agent. No API key needed.

```bash
cd demo
npm install
npm run dev     # → http://localhost:5173
```

## Development

```bash
npm install
cp .env.example .env   # add one provider key
npm run build          # build with tsup
node bin/nimi.js "hello"

npm run check     # biome lint + tsc typecheck
npm test          # offline tool tests (vitest)
```

Issues and pull requests are welcome. Run `npm run check` and `npm test` before submitting. See `AGENTS.md` for repo conventions.

## License

[ISC](LICENSE) — do what you want, keep the copyright notice.
