import { Box, Text } from "ink";
import { contractHome, formatTokens, termWidth, truncateToWidth } from "./util.ts";

// Pinned bottom statusline, two lines like pi's footer:
//   ~/path (branch) • session
//   ~used/limit (pct% auto)            provider/model
// The context % runs green → yellow past 70% → red past 90%.
// Both lines truncate to the terminal width with ….
export function Footer({
  providerName,
  model,
  used,
  limit,
  sessionId,
  branch,
}: {
  providerName: string | null;
  model: string;
  used: number;
  limit: number | undefined;
  sessionId: string;
  branch: string | null;
}) {
  const width = termWidth();

  let first = contractHome(process.cwd());
  if (branch) first += ` (${branch})`;
  first += ` • ${sessionId.slice(-6)}`;

  const pct = limit ? Math.round((used / limit) * 100) : null;
  const statsLeft = limit
    ? `~${formatTokens(used)}/${formatTokens(limit)} (${pct}% auto)`
    : `~${formatTokens(used)} tokens`;
  const ctxColor: "green" | "yellow" | "red" = pct === null ? "green" : pct > 90 ? "red" : pct > 70 ? "yellow" : "green";
  const right = providerName ? `${providerName}/${model}` : model;

  // Right-align provider/model; truncate either side with … when narrow.
  const MIN_GAP = 2;
  let leftShown = statsLeft;
  let rightShown = right;
  if (statsLeft.length + MIN_GAP + right.length > width) {
    const roomForLeft = width - right.length - MIN_GAP;
    if (roomForLeft >= 4) {
      leftShown = truncateToWidth(statsLeft, roomForLeft);
    } else {
      leftShown = truncateToWidth(statsLeft, width);
      rightShown = "";
    }
  }
  const gap = rightShown ? " ".repeat(Math.max(MIN_GAP, width - leftShown.length - rightShown.length)) : "";

  return (
    <Box flexDirection="column">
      <Text dimColor>{truncateToWidth(first, width)}</Text>
      <Box>
        <Text color={ctxColor}>{leftShown}</Text>
        <Text dimColor>{`${gap}${rightShown}`}</Text>
      </Box>
    </Box>
  );
}
