// Minimal slash commands: /help, /clear, /quit.

export type SlashAction =
  | { type: "help" }
  | { type: "clear" }
  | { type: "quit" }
  | { type: "unknown"; name: string };

export function parseSlash(input: string): SlashAction | null {
  if (!input.startsWith("/")) return null;
  const name = input.slice(1).trim().split(/\s+/)[0] ?? "";
  return nameToAction(name);
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

function nameToAction(name: string): SlashAction {
  if (name === "help") return { type: "help" };
  if (name === "clear") return { type: "clear" };
  if (name === "quit" || name === "exit" || name === "q") return { type: "quit" };
  return { type: "unknown", name: name || "/" };
}

export const HELP_TEXT =
  "Commands:\n" +
  "  /help   Show this help\n" +
  "  /clear  Clear the transcript\n" +
  "  /quit   Exit nimi";
