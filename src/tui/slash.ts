// Minimal slash commands: help/clear/compact/context/model/login/logout/tools/sessions/session/quit.

export type SlashAction =
  | { type: "help" }
  | { type: "clear" }
  | { type: "compact" }
  | { type: "context" }
  | { type: "model"; arg: string }
  | { type: "login"; arg: string }
  | { type: "logout"; arg: string }
  | { type: "tools" }
  | { type: "sessions" }
  | { type: "session" }
  | { type: "quit" }
  | { type: "unknown"; name: string };

export function parseSlash(input: string): SlashAction | null {
  if (!input.startsWith("/")) return null;
  const parts = input.slice(1).trim().split(/\s+/);
  const name = parts[0] ?? "";
  return nameToAction(name, parts.slice(1).join(" "));
}

// Bare words typed alone ("clear", "quit") act as commands too,
// so users don't have to remember the slash. Returns null for
// anything that isn't a known command (normal prompts pass through).
export function parseBare(input: string): SlashAction | null {
  const word = input.trim().toLowerCase();
  if (word === "help" || word === "clear" || word === "quit" || word === "exit" || word === "q") {
    return nameToAction(word);
  }
  return null;
}

function nameToAction(name: string, arg = ""): SlashAction {
  if (name === "help") return { type: "help" };
  if (name === "clear") return { type: "clear" };
  if (name === "compact") return { type: "compact" };
  if (name === "context") return { type: "context" };
  if (name === "model") return { type: "model", arg: arg.trim() };
  if (name === "login") return { type: "login", arg: arg.trim() };
  if (name === "logout") return { type: "logout", arg: arg.trim() };
  if (name === "tools") return { type: "tools" };
  if (name === "sessions") return { type: "sessions" };
  if (name === "session") return { type: "session" };
  if (name === "quit" || name === "exit" || name === "q") return { type: "quit" };
  return { type: "unknown", name: name || "/" };
}

export const HELP_TEXT =
  "Commands:\n" +
  "  /help      Show this help\n" +
  "  /clear     Clear the transcript\n" +
  "  /compact   Summarize old history to free context\n" +
  "  /context   Show token usage vs the window\n" +
  "  /model [id]  List models, or switch (keeps history)\n" +
  "  /login [provider]  Sign in with an API key (saved to ~/.nimi/auth.json)\n" +
  "  /logout [provider] Remove a saved API key\n" +
  "  /tools     List the tools the model can call\n" +
  "  /sessions  List saved sessions\n" +
  "  /session   Show this session's resume command\n" +
  "  /quit      Exit nimi";
