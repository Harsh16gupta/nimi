import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "../types.ts";

// exec gives us a callback; promisify turns it into "await exec(...)".
const run = promisify(exec);

export const bashTool:Tool = {
    name: "bash",
    description: "Run a shell command in the current folder and return its output",
    parameters: {
        type: "object",
        properties: {
            command: {
                type: "string",
                description: "The shell command to run",
            },
        },
        required: ["command"]
    },
    async execute(args){
        // Run the command and wait for it to finish.
        const { stdout, stderr } = await run(String(args.command), {
            cwd: process.cwd(),
        });
        // Return both streams; a lot of CLIs print errors to stderr.
        return stdout + stderr;
    }
}
