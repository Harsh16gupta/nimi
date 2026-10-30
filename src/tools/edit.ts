import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../types.ts";

export const editTool: Tool = {
    name: "edit",
    description: "Edit a text file by replacing old text with new text",
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the file, relative to the current folder",
            },
            oldText: {
                type: "string",
                description: "The exact text to find in the file",
            },
            newText: {
                type: "string",
                description: "The text to replace it with",
            },
        },
        required: ["path", "oldText", "newText"]
    },
    async execute(args) {
        // Resolve the path the same way read/write do.
        const filePath = resolve(process.cwd(), String(args.path));
        const oldText = String(args.oldText);
        const newText = String(args.newText);

        // Read the current file content.
        const content = await readFile(filePath, "utf-8");

        // Fail clearly if the text is not there (agent catches this).
        if (!content.includes(oldText)) {
            throw new Error("oldText not found in " + String(args.path));
        }

        // Replace only the first match, then write it back.
        const updated = content.replace(oldText, newText);
        await writeFile(filePath, updated, "utf-8");

        return "Edited " + String(args.path);
    }
}
