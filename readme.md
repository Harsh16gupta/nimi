# nimi

Terminal agent: point it at your code, it reads/writes files and runs shell commands until the job is done.

```
npm install -g nimi-code
export META_API_KEY=...
nimi "list the typescript files under src"
```

Needs Node 22+ and one provider key: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `META_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENAI_API_KEY`.

## Use

```
nimi [message]            interactive (default)
nimi --classic [message]  plain REPL
nimi --print [message]    one-shot, streams to stdout
echo ... | nimi -p        prompt from pipe

-p, --prompt <text>       prompt to send
-z, --provider <id>       anthropic, groq, meta, deepseek, openai, anthropic-openai
    --model <id>          override model
    --session <id>        resume a session (--list-sessions to list)
    --context-limit <n>   override context window
    --classic --print --yolo
-v, --version  -h, --help
```

Slash commands in the TUI: `/model /tools /sessions /session /compact /context /clear /help /quit`.

## Tools

Read-only, never asks: `read ls find grep git_status git_log git_diff`.

Asks first (`y/a/always/n`, or pass `--yolo` to skip): `write edit bash git_add git_commit git_branch git_checkout git_reset`.

## Config

`~/.nimi/settings.json` < `.nimi/settings.json` < `NIMI_PROVIDER`/`NIMI_MODEL` < CLI flags. Sessions go in `.nimi/sessions/`.

## Dev

```
npm install
cp .env.example .env
npm run build
node bin/nimi.js "hello"

npm run check   # lint + typecheck
npm test        # offline tool tests
```
