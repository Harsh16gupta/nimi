// Canvas color mapping for Nimi's new visual system.
// Subsystem colors are derived from the design token family instead of
// hardcoded terracotta.

export const SUBSYSTEM_COLOR_MAP = {
  entry: "var(--nimi-violet)",
  config: "var(--color-text-accent)",
  loop: "var(--color-accent)",
  provider: "var(--nimi-violet)",
  tools: "var(--nimi-green)",
  permissions: "var(--nimi-amber)",
  renderer: "var(--color-text-accent)",
  session: "var(--nimi-green)",
};

export function getNodeColor(group) {
  return SUBSYSTEM_COLOR_MAP[group] ?? "var(--color-accent)";
}

export function getEdgeColor(isActive) {
  return isActive ? "var(--color-accent)" : "var(--nimi-graph-edge)";
}
