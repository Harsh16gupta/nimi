import { Text } from "ink";

// Nimi wordmark: the full word NIMI in 4-row block letters, 14 cols.
// Single color (bright white, like nimi's brand logo). Plain strings
// only — Ink paints the color, so there are no ANSI escapes to
// measure and every row aligns in every terminal, including
// Mac Terminal.app. Shaped like pi's pi-logo.ts: nimiLogoLines()
// plus an Apple-Terminal text fallback.
export function nimiLogoLines(): string[] {
  return ["█  █ █ █   █ █", "██ █ █ ██ ██ █", "█ ██ █ █ █ █ █", "█  █ █ █   █ █"];
}

/** Whether the terminal renders the block mark. Apple Terminal draws
 *  gaps between rows, so it gets the plain wordmark instead (pi's
 *  supportsPiLogo rule). */
export function supportsNimiLogo(): boolean {
  return process.env.TERM_PROGRAM !== "Apple_Terminal";
}

/** Text fallback for the mark: bold "nimi", cyan so it reads on
 *  both dark and light backgrounds. */
export function LogoMark() {
  if (!supportsNimiLogo()) {
    return (
      <Text bold color="cyan">
        nimi
      </Text>
    );
  }
  return <Text color="whiteBright">{nimiLogoLines().join("\n")}</Text>;
}
