import { execSync } from "node:child_process";
import { homedir } from "node:os";

// Shared helpers for the TUI chrome (splash, header, footer).
// ASCII-safe: every string here renders identically in Terminal.app.

// Terminal width for truncation. `||` (not `??`): a PTY without a
// winsize reports 0 columns, which must fall back just like undefined.
export function termWidth(fallback = 80): number {
  return process.stdout.columns || fallback;
}

// Collapse a leading home directory to ~, like pi's footer does.
export function contractHome(cwd: string, home: string = homedir()): string {
  if (cwd === home) return "~";
  if (cwd.startsWith(`${home}/`)) return `~${cwd.slice(home.length)}`;
  return cwd;
}

// Hard truncate to a terminal width, marking the cut with ….
export function truncateToWidth(s: string, width: number): string {
  if (width <= 0) return "";
  if (s.length <= width) return s;
  if (width <= 1) return "…";
  return `${s.slice(0, width - 1)}…`;
}

// Compact token counts for the statusline (pi's formatTokens).
export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1000000).toFixed(1)}M`;
}

// Best-effort branch name; null outside a repo or when git is missing.
// Read once per session — branches rarely change mid-chat.
export function getGitBranch(cwd: string): string | null {
  try {
    const out = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
    if (!out || out === "HEAD") return null;
    return out;
  } catch {
    return null;
  }
}
