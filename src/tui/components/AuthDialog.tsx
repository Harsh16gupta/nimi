import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { getAuthPath, getStoredKeySync } from "../../config/auth.ts";
import { listProviders } from "../../providers/index.ts";
import { fuzzyFilter } from "../fuzzy.ts";

// Pi-style auth flow state: provider picker or masked key prompt,
// rendered in place of the composer while active.
export type AuthFlow =
  | { step: "provider"; mode: "login" | "logout"; selected: number; filter: string }
  | { step: "key"; providerId: string; envVar: string };

// Status line per provider, like pi's oauth-selector:
// "✓ saved" (auth.json) wins, else "✓ env: VAR" when the env var is set,
// else "• not configured".
export function providerStatus(id: string, envVar: string): string {
  if (getStoredKeySync(id)) return "✓ saved";
  if (process.env[envVar]) return `✓ env: ${envVar}`;
  return "• not configured";
}

export function filterProviders(query: string) {
  return fuzzyFilter(listProviders(), query, (p) => `${p.id} ${p.label}`);
}

export function AuthProviderPicker({
  mode,
  selected,
  filter,
  onFilterChange,
  onFilterSubmit,
  canCancel,
}: {
  mode: "login" | "logout";
  selected: number;
  filter: string;
  onFilterChange: (v: string) => void;
  onFilterSubmit: () => void;
  canCancel: boolean;
}) {
  const providers = filterProviders(filter);
  const visible = providers.slice(0, 8);
  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>{mode === "login" ? "Select a provider to log in:" : "Select a provider to log out:"}</Text>
      <Box>
        <Text dimColor>Filter: </Text>
        <TextInput value={filter} onChange={onFilterChange} onSubmit={onFilterSubmit} placeholder="type to filter…" />
      </Box>
      {visible.map((p, i) => {
        const isSelected = i === selected;
        const status = providerStatus(p.id, p.envVar);
        return (
          <Text key={p.id} color={isSelected ? "cyan" : undefined} dimColor={!isSelected}>
            {isSelected ? "→ " : "  "}
            {p.label} <Text dimColor>({p.id})  {status}</Text>
          </Text>
        );
      })}
      {providers.length === 0 && <Text dimColor>No providers match — clear the filter.</Text>}
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
