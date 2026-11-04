import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { Tool } from "../types.ts";
const SKIP = ["node_modules", ".git", "dist", "build", ".next"];
// Mini-glob (* and ? only) to RegExp.
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
// Find files by name so the agent stops guessing paths.
export const findTool: Tool = {
    name: "find",
    description: "Find files by glob pattern, e.g. *.ts",
    readOnly: true,
    parameters: {
        type: "object",
        properties: {
            pattern: { type: "string", description: "Glob, e.g. *.ts" },
            path: { type: "string", description: "Dir to search (default: .)" },
        },
        required: ["pattern"],
    },
    async execute(args) {
        const root = resolve(process.cwd(), String(args.path ?? "."));
        const match = globToRegExp(String(args.pattern));
        const found: string[] = [];
        const stack: string[] = [root];
        while (stack.length > 0 && found.length < 100) {
            const dir = stack.pop()!;
            for (const e of await readdir(dir, { withFileTypes: true })) {
                if (e.isDirectory()) { if (!SKIP.includes(e.name)) stack.push(join(dir, e.name)); }
                else if (match.test(e.name)) found.push(relative(process.cwd(), join(dir, e.name)));
            }
        }
        return found.length > 0 ? found.join("\n") : "(no matches)";
    },
};
