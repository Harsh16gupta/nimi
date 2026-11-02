// One-line labels and summaries for tool rows. ASCII only so every
// terminal (including Mac Terminal.app) renders them identically.

const MAX_LABEL = 80;
const MAX_SUMMARY = 100;

function argValue(args: Record<string, unknown>): string {
  const pick =
    args.path ?? args.file ?? args.command ?? args.cmd ?? args.query ?? args.text ?? args.content;
  if (typeof pick === "string" && pick.length > 0) return pick;
  const keys = Object.keys(args);
  if (keys.length === 0) return "";
  const first = args[keys[0]!];
  return typeof first === "string" ? first : keys.join(", ");
}

// Short label shown next to the tool name, e.g. "read package.json".
export function shortLabel(name: string, args: Record<string, unknown>): string {
  const value = argValue(args);
  const label = value ? `${name} ${value}` : name;
  return label.length > MAX_LABEL ? label.slice(0, MAX_LABEL - 3) + "..." : label;
}

// One-line summary of a finished tool result.
export function resultSummary(toolName: string, content: string, isError: boolean): string {
  const firstLine = content.split("\n")[0] ?? "";
  if (isError) {
    const msg = firstLine.length > MAX_SUMMARY ? firstLine.slice(0, MAX_SUMMARY - 3) + "..." : firstLine;
    return msg || "error";
  }
  if (toolName === "read") {
    const lines = content.split("\n").length;
    return `(${lines} line${lines === 1 ? "" : "s"})`;
  }
  if (toolName === "bash") {
    const lines = content.trim() ? content.trim().split("\n").length : 0;
    return lines > 0 ? `(${lines} line${lines === 1 ? "" : "s"})` : "(ok)";
  }
  if (toolName === "write" || toolName === "edit") return "(ok)";
  const summary = firstLine.length > MAX_SUMMARY ? firstLine.slice(0, MAX_SUMMARY - 3) + "..." : firstLine;
  return summary ? summary : "(ok)";
}
