import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Tool } from "../types.ts";

export const writeTool:Tool = {
    name: "write",
    description: "Write text to a file, creating it or overwriting it",
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the file, relative to the current folder",
            },
            content: {
                type: "string",
                description: "The full text to write to the file",
            },
        },
        required: ["path", "content"]
    },
    async execute(args){
        const filePath = resolve(process.cwd(), String(args.path));
        const content = String(args.content);
        // Make the parent folders so "src/tools/new.ts" works even when
        // the folder does not exist yet.
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, content, "utf-8");
        // Short confirmation instead of echoing the file (saves context).
        return "Wrote " + content.length + " chars to " + String(args.path);
    }
}
