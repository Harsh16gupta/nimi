// Nimi theme — graphite surfaces, muted blue accent, violet secondary,
// restrained green for success, amber reserved for warnings.
// Extends the neutral theme; dark mode is the primary experience.
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

export const nimiTheme = defineTheme({
  name: "nimi",
  extends: neutralTheme,
  tokens: {
    // Graphite dark surfaces
    "--color-background-body": ["#F1F4F7", "#0D0D0F"],
    "--color-background-surface": ["#FFFFFF", "#141416"],
    "--color-background-card": ["#FFFFFF", "#18181B"],
    "--color-background-popover": ["#FFFFFF", "#1C1C1F"],
    "--color-background-muted": ["#F3F4F6", "#1A1A1D"],
    "--color-background-inverted": ["#0A1317", "#EEF0F4"],

    // Text
    "--color-text-primary": ["#0A1317", "#EEF0F4"],
    "--color-text-secondary": ["#4E606F", "#9CA0A8"],
    "--color-text-tertiary": ["#7A8795", "#6B6F77"],

    // Primary accent: klein blue (idea.html design pattern)
    "--color-accent": ["#0300EB", "#3835FF"],
    "--color-accent-muted": ["#0300EB14", "#3835FF2E"],
    "--color-on-accent": ["#FFFFFF", "#FFFFFF"],
    "--color-text-accent": ["#0300EB", "#7D7AFF"],
    "--color-icon-accent": ["#0300EB", "#7D7AFF"],
    "--color-border-accent": ["#D6DCF5", "#3835FF"],

    // Semantic fills
    "--color-success": ["#16A34A", "#22C55E"],
    "--color-success-muted": ["#22C55E1A", "#22C55E26"],
    "--color-on-success": ["#FFFFFF", "#052E16"],
    "--color-warning": ["#D97706", "#F59E0B"],
    "--color-warning-muted": ["#F59E0B1A", "#F59E0B26"],
    "--color-on-warning": ["#0A1317", "#0A1317"],
    "--color-error": ["#DC2626", "#EF4444"],
    "--color-error-muted": ["#EF44441A", "#EF444426"],
    "--color-on-error": ["#FFFFFF", "#0A1317"],

    // Border
    "--color-border": ["#D6DCF5", "#27272A"],
    "--color-border-emphasized": ["#B9C2F0", "#3F3F46"],

    // Overlay
    "--color-overlay": ["#01122866", "#00000080"],
    "--color-overlay-hover": ["#0536590C", "#FFFFFF0C"],
    "--color-overlay-pressed": ["#05365919", "#FFFFFF19"],
    "--color-shadow": ["rgba(5, 54, 89, 0.1)", "rgba(0, 0, 0, 0.4)"],
  },
  localTokens: {
    // Nimi product tokens — used by the graph canvas and execution chrome.
    "--nimi-graph-node": ["#F8FAFC", "#17171A"],
    "--nimi-graph-node-hover": ["#EFF6FF", "#1E293B"],
    "--nimi-graph-node-active": ["#EFF6FF", "#1E293B"],
    "--nimi-graph-edge": ["#CBD5E1", "#3F3F46"],
    "--nimi-graph-edge-active": ["#0300EB", "#7D7AFF"],
    "--nimi-graph-zone": ["#F8FAFC", "#141416"],
    "--nimi-graph-zone-border": ["#E2E8F0", "#27272A"],
    "--nimi-graph-text": ["#1E293B", "#E2E8F0"],
    "--nimi-graph-sub": ["#64748B", "#94A3B8"],

    "--nimi-violet": ["#7C3AED", "#8B5CF6"],
    "--nimi-violet-muted": ["#8B5CF61A", "#8B5CF626"],
    "--nimi-green": ["#16A34A", "#22C55E"],
    "--nimi-green-muted": ["#22C55E1A", "#22C55E26"],
    "--nimi-amber": ["#D97706", "#F59E0B"],
    "--nimi-amber-muted": ["#F59E0B1A", "#F59E0B26"],

    "--nimi-panel": ["#FFFFFF", "#141416"],
    "--nimi-panel-elevated": ["#FFFFFF", "#18181B"],
    "--nimi-canvas-dots": ["#CBD5E1", "#27272A"],

    // idea.html surfaces: klein blue header, ink graph panel, paper washes
    "--nimi-klein": ["#0300EB", "#0300EB"],
    "--nimi-klein-dark": ["#0200BA", "#0200BA"],
    "--nimi-ink": ["#0B0D12", "#0B0D12"],
    "--nimi-ink-card": ["#141822", "#141822"],
    "--nimi-paper-off": ["#F7F8FC", "#F7F8FC"],
  },
  components: {
    button: {
      base: {
        fontWeight: 500,
      },
    },
    code: {
      base: {
        borderRadius: "8px",
      },
    },
  },
});
