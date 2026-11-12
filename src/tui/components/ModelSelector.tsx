import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { getProviderDefaultModel } from "../../providers/index.ts";
import { MODELS, type ModelInfo } from "../../providers/models.ts";
import { fuzzyFilter } from "../fuzzy.ts";
import { getModelSearchText as searchText } from "../../providers/models.ts";

export type ModelScope = "all" | "scoped";

export const MAX_VISIBLE_MODELS = 10;

// Sort: current first, then each provider's default, then provider, then id.
export function sortModelItems(
  items: ModelInfo[],
  current: { provider: string; id: string } | null,
): ModelInfo[] {
  const currentKey = current ? `${current.provider}/${current.id}` : null;
  const defaultIds = new Set<string>();
  for (const m of MODELS) {
    try {
      if (getProviderDefaultModel(m.provider) === m.id) defaultIds.add(`${m.provider}/${m.id}`);
    } catch {
      // Unknown provider in catalog — ignore for sorting.
    }
  }
  return [...items].sort((a, b) => {
    const ka = `${a.provider}/${a.id}`;
    const kb = `${b.provider}/${b.id}`;
    if (ka === currentKey) return -1;
    if (kb === currentKey) return 1;
    const da = defaultIds.has(ka) ? 0 : 1;
    const db = defaultIds.has(kb) ? 0 : 1;
    if (da !== db) return da - db;
    if (a.provider !== b.provider) return a.provider < b.provider ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function filterModelItems(
  search: string,
  scope: ModelScope,
  activeProvider: string | null,
): ModelInfo[] {
  const scoped =
    scope === "scoped" && activeProvider ? MODELS.filter((m) => m.provider === activeProvider) : MODELS;
  return fuzzyFilter(scoped, search, (m) => searchText(m));
}

export function isProviderDefault(m: ModelInfo): boolean {
  try {
    return getProviderDefaultModel(m.provider) === m.id;
  } catch {
    return false;
  }
}

export function ModelSelector({
  search,
  onSearchChange,
  onSearchSubmit,
  items,
  selected,
  current,
  scope,
  scopedCount,
  totalCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  items: ModelInfo[];
  selected: number;
  current: { provider: string; id: string } | null;
  scope: ModelScope;
  scopedCount: number;
  totalCount: number;
}) {
  const visible = items.slice(0, MAX_VISIBLE_MODELS);
  const hidden = Math.max(0, items.length - visible.length);
  return (
    <Box marginTop={1} flexDirection="column">
      <Text dimColor>
        {scope === "scoped"
          ? `Only showing models for the current provider (Tab: all ${totalCount}) · ${scopedCount} scoped`
          : `Showing all configured providers (Tab: current provider only) · ${totalCount} models`}
      </Text>
      <Text dimColor>Use /login to add providers.</Text>
      <Box marginTop={1}>
        <Text dimColor>Model: </Text>
        <TextInput value={search} onChange={onSearchChange} onSubmit={onSearchSubmit} placeholder="type to filter…" />
      </Box>
      {visible.map((m, i) => {
        const isSelected = i === selected;
        const isCurrent = current?.provider === m.provider && current?.id === m.id;
        return (
          <Text key={`${m.provider}/${m.id}`} color={isSelected ? "cyan" : undefined} dimColor={!isSelected}>
            {isSelected ? "→ " : "  "}
            {isCurrent ? "✓ " : ""}
            {m.id} <Text dimColor>[{m.provider}]</Text>
            {isProviderDefault(m) ? " · default" : ""}
          </Text>
        );
      })}
      {items.length === 0 && <Text dimColor>No models match — clear the filter.</Text>}
      {hidden > 0 && <Text dimColor>↓ {hidden} more</Text>}
      <Text dimColor>↑↓ navigate · enter select · tab scope · esc cancel</Text>
    </Box>
  );
}
