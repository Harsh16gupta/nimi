import { Box, Text } from "ink";
import { listProviders } from "../../providers/index.ts";
import { MODELS, getModelSearchText } from "../../providers/models.ts";
import { fuzzyFilter } from "../fuzzy.ts";

export type SlashPopupState = {
  kind: "command" | "model" | "provider";
  query: string;
  selected: number;
  items: string[];
  detail?: Map<string, string>;
};

const COMMANDS = [
  { name: "/help", hint: "Show help" },
  { name: "/clear", hint: "Clear the transcript" },
  { name: "/compact", hint: "Summarize old history" },
  { name: "/context", hint: "Show token usage" },
  { name: "/model", hint: "Pick or switch models" },
  { name: "/provider", hint: "Switch provider" },
  { name: "/login", hint: "Sign in with an API key" },
  { name: "/logout", hint: "Remove a saved API key" },
  { name: "/tools", hint: "List tools" },
  { name: "/sessions", hint: "List saved sessions" },
  { name: "/session", hint: "Show resume command" },
  { name: "/quit", hint: "Exit nimi" },
];

// Derive the popup for the current draft. Null when no popup applies.
// - "/..." → command list filtered by the typed prefix (fuzzy)
// - "/model <q>" → models filtered by q
// - "/login <q>", "/logout <q>", "/provider <q>" → providers filtered by q
export function deriveSlashPopup(draft: string, selected: number): SlashPopupState | null {
  if (!draft.startsWith("/")) return null;
  const space = draft.indexOf(" ");
  if (space === -1) {
    const query = draft.slice(1);
    const names = COMMANDS.map((c) => c.name);
    const items = fuzzyFilter(names, query, (n) => n);
    // Exact single match with nothing more to complete → no popup.
    if (items.length === 1 && items[0] === draft) return null;
    if (items.length === 0) return null;
    return { kind: "command", query, selected, items };
  }
  const cmd = draft.slice(0, space);
  const arg = draft.slice(space + 1);
  if (cmd === "/model") {
    const items = fuzzyFilter(MODELS, arg, (m) => getModelSearchText(m)).map(
      (m) => `${m.provider}/${m.id}`,
    );
    if (items.length === 0) return null;
    return { kind: "model", query: arg, selected, items };
  }
  if (cmd === "/login" || cmd === "/logout" || cmd === "/provider") {
    const items = fuzzyFilter(listProviders(), arg, (p) => `${p.id} ${p.label}`).map((p) => p.id);
    if (items.length === 0) return null;
    return { kind: "provider", query: arg, selected, items };
  }
  return null;
}

export function applySlashCompletion(draft: string, completion: string): string {
  if (!draft.startsWith("/")) return draft;
  const space = draft.indexOf(" ");
  if (space === -1) {
    // Complete the command; "/model" style commands want a trailing space.
    return completion === "/model" || completion === "/login" || completion === "/logout" || completion === "/provider"
      ? `${completion} `
      : completion;
  }
  const cmd = draft.slice(0, space);
  if (cmd === "/model" || cmd === "/login" || cmd === "/logout" || cmd === "/provider") {
    return `${cmd} ${completion}`;
  }
  return draft;
}

export function commandHint(name: string): string {
  return COMMANDS.find((c) => c.name === name)?.hint ?? "";
}

export function SlashPopup({ popup }: { popup: SlashPopupState }) {
  const visible = popup.items.slice(0, 8);
  const hidden = Math.max(0, popup.items.length - visible.length);
  return (
    <Box flexDirection="column">
      {visible.map((item, i) => (
        <Text key={item} color={i === (popup.selected % Math.max(1, popup.items.length)) ? "cyan" : undefined} dimColor={i !== (popup.selected % Math.max(1, popup.items.length))}>
          {i === (popup.selected % Math.max(1, popup.items.length)) ? "→ " : "  "}
          {item}
          {popup.kind === "command" ? <Text dimColor>  {commandHint(item)}</Text> : null}
        </Text>
      ))}
      {hidden > 0 && <Text dimColor>↓ {hidden} more</Text>}
      <Text dimColor>tab/↑↓ select · enter send · esc dismiss</Text>
    </Box>
  );
}
