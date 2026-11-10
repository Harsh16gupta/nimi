import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { shortLabel } from "../format.ts";

// Composer row plus the small chrome around it: hint line, pending
// permission dialog, error line, and the empty-transcript hint.
export function Composer({
  draft,
  onChange,
  onSubmit,
  working,
  canChat,
  busy,
}: {
  draft: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  working: boolean;
  canChat: boolean;
  busy: boolean;
}) {
  return (
    <Box marginTop={1}>
      <Text dimColor={working}>› </Text>
      <TextInput
        value={draft}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={busy ? "answer y/a/n…" : working ? "working…" : canChat ? "Ask nimi…" : "Run /login…"}
      />
    </Box>
  );
}

export function PermissionDialog({ name, input }: { name: string; input: Record<string, unknown> }) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="yellow">Permission needed: {shortLabel(name, input)}</Text>
      <Text dimColor>y = yes · a = always · n = no (esc)</Text>
    </Box>
  );
}

export function ErrorLine({ message }: { message: string }) {
  return (
    <Box marginTop={1}>
      <Text color="red">✕ {message}</Text>
    </Box>
  );
}
