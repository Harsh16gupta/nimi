import { Box, Text } from "ink";
import { nimiLogoLines } from "./Splash.tsx";
import { termWidth, truncateToWidth } from "./util.ts";

// Startup header: one Claude-style ASCII box (| and - only, safe in
// every terminal). The wordmark, one status line, one hints line —
// nothing else. Rendered as the FIRST scrollback item so it sits on
// top of the page and scrolls away like Claude's welcome box.
// NOTE: side borders are baked into each line string (not flexbox
// row frames): a row Box only paints its 1-line children on the
// first line of a multi-line sibling.
export function StartupHeader({
  version,
  resumedCount,
  contextFiles,
}: {
  version: string;
  resumedCount: number;
  contextFiles: string[];
}) {
  const width = Math.max(28, termWidth());
  const title = `nimi v${version}`;
  const top = `-- ${title} ${"-".repeat(Math.max(0, width - title.length - 5))}`;
  const bottom = "-".repeat(width);
  const inner = width - 4; // space between "| " and " |"
  const sessionBit = resumedCount > 0 ? `resumed · ${resumedCount} messages` : "fresh session";
  const status = contextFiles.length > 0 ? `${sessionBit} · context: ${contextFiles.join(", ")}` : sessionBit;
  const [m0 = "", m1 = "", m2 = "", m3 = ""] = nimiLogoLines();
  return (
    <Box flexDirection="column">
      <Text dimColor>{top}</Text>
      <Text key="m0">{frame(m0, inner)}</Text>
      <Text key="m1">{frame(m1, inner)}</Text>
      <Text key="m2">{frame(m2, inner)}</Text>
      <Text key="m3">{frame(m3, inner)}</Text>
      <Text dimColor>{frame(truncateToWidth(status, inner), inner)}</Text>
      <Text dimColor>{frame(truncateToWidth("enter send · tab complete · ctrl+l models · esc stop", inner), inner)}</Text>
      <Text dimColor>{bottom}</Text>
    </Box>
  );
}

/** Center content between "| " and " |". Plain strings only, so
 *  length is the visible width; callers truncate first. */
function frame(content: string, inner: number): string {
  const len = Math.min(content.length, inner);
  const left = Math.floor((inner - len) / 2);
  const right = inner - len - left;
  return `| ${" ".repeat(left)}${content}${" ".repeat(right)} |`;
}
