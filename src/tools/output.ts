// Cap tool output so one big file can't blow the model's context.
// Read-only tools call this before returning; bash does too.
export const MAX_OUTPUT_CHARS = 20000;
export function truncateOutput(text: string): string {
    if (text.length <= MAX_OUTPUT_CHARS) return text;
    return text.slice(0, MAX_OUTPUT_CHARS) + "\n[truncated at 20000 chars]";
}
