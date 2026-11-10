import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { getAuthPath, getStoredKeySync } from "../../config/auth.ts";
import { listProviders } from "../../providers/index.ts";

// Pi-style auth flow state: provider picker or masked key prompt,
// rendered in place of the composer while active.
export type AuthFlow =
  | { step: "provider"; mode: "login" | "logout"; selected: number }
  | { step: "key"; providerId: string; envVar: string };

export function AuthProviderPicker({
  mode,
  selected,
  canCancel,
}: {
  mode: "login" | "logout";
  selected: number;
  canCancel: boolean;
}) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>{mode === "login" ? "Select a provider to log in:" : "Select a provider to log out:"}</Text>
      {listProviders().map((p, i) => {
        const isSelected = i === selected;
        const saved = getStoredKeySync(p.id) ? "  ✓ saved" : "";
        return (
          <Text key={p.id} color={isSelected ? "cyan" : undefined} dimColor={!isSelected}>
            {isSelected ? "→ " : "  "}
            {p.label} <Text dimColor>({p.id}){saved}</Text>
          </Text>
        );
      })}
      <Text dimColor>↑↓ navigate · enter select{canCancel ? " · esc cancel" : ""}</Text>
    </Box>
  );
}

export function AuthKeyPrompt({
  providerId,
  envVar,
  draft,
  onChange,
  onSubmit,
  error,
}: {
  providerId: string;
  envVar: string;
  draft: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  error: string | null;
}) {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>Login to {providerId}</Text>
      <Text dimColor>
        Paste {envVar} — saved to {getAuthPath()}
      </Text>
      <Box marginTop={1}>
        <Text dimColor>› </Text>
        <TextInput value={draft} onChange={onChange} onSubmit={onSubmit} placeholder="sk-…" mask="*" />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">✕ {error}</Text>
        </Box>
      )}
      <Text dimColor>enter save · esc back</Text>
    </Box>
  );
}
