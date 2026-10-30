
import { readFile } from "node:fs/promises";
import type { Tool } from "../types.ts";
import { resolve } from "node:path";


export const readTool:Tool = {
    name: "read",
    description: "Read a text file and return its contents",
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the file, relative to the current folder",
            },
        },
        required: ["path"]
    },
    async execute(args){
        return readFile(
            resolve(process.cwd(), String(args.path)),
            "utf-8"
        );
    }
}