import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { Tool } from "../types.ts";
const SKIP = ["node_modules", ".git", "dist", "build", ".next"];

function globToRegExp(glob: string): RegExp {
    let out = "";
    for (const ch of glob) {
        if (ch === "*") out += ".*";
        else if (ch === "?") out += ".";
        else if ("+()^$.{}|[]\\".includes(ch)) out += "\\" + ch;
        else out += ch;
    }
    return new RegExp("^" + out + "$");
}

// Search contents so the agent stops catting everything.
export const grepTool: Tool = {
    name: "grep",
    description: "Search file contents with a regex, returns file:line matches",
    readOnly: true,
    parameters: {
        type: "object",
        properties: {
            pattern: { type: "string", description: "Regex, e.g. TODO|FIXME" },
            path: { type: "string", description: "File or dir to search (default: .)" },
            include: { type: "string", description: "Only files matching glob, e.g. *.ts" },
        },
        required: ["pattern"],
    },
    async execute(args) {
        let regex: RegExp;
        try {
            regex = new RegExp(String(args.pattern));
        } catch {
            throw new Error("Invalid regex: " + String(args.pattern));
        }
        const include = args.include ? globToRegExp(String(args.include)) : null;
        const start = resolve(process.cwd(), String(args.path ?? "."));
        const stack: string[] = [start];
        const targets: string[] = [];
        while (stack.length > 0) {
            const cur = stack.pop()!;
            const s = await stat(cur);
            if (s.isDirectory()) {
                for (const e of await readdir(cur, { withFileTypes: true }) as any[]) {
                    if (e.isDirectory()) { if (!SKIP.includes(e.name)) stack.push(join(cur, e.name)); }
                    else if (!include || include.test(e.name)) targets.push(join(cur, e.name));
                }
            } else targets.push(cur);
        }
        const hits: string[] = [];
        for (const file of targets) {
            if (hits.length >= 100) break;
            if ((await stat(file)).size > 500_000) continue;
            let content: string;
            try { content = await readFile(file, "utf-8"); } catch { continue; }
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i]!)) {
                    hits.push(relative(process.cwd(), file) + ":" + (i + 1) + ": " + lines[i]!.trim().slice(0, 120));
                    if (hits.length >= 100) break;
                }
            }
        }
        return hits.length > 0 ? hits.join("\n") + (hits.length >= 100 ? "\n[truncated]" : "") : "(no matches)";
    },
};
