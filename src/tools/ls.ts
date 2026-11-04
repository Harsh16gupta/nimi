import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../types.ts";
// List a dir so the agent can explore without bash.
export const lsTool: Tool = {
    name: "ls",
    description: "List files in a directory with types and sizes",
    parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Dir to list (default: .)" } },
        required: [],
    },
    async execute(args) {
        const dir = resolve(process.cwd(), String(args.path ?? "."));
        const entries = await readdir(dir, { withFileTypes: true });
        const lines: string[] = [];
        for (const e of entries) {
            if (e.isDirectory()) lines.push("dir  - " + e.name + "/");
            else lines.push("file " + String((await stat(resolve(dir, e.name))).size) + " " + e.name);
        }
        return lines.length > 0 ? lines.join("\n") : "(empty directory)";
    },
};
