import { spawn } from "node:child_process";
import type { Tool } from "../types.ts";
import { truncateOutput } from "./output.ts";

// Run git with args array (no shell, so no injection).
// Timeout kills hung git; non-zero exit throws so agent marks isError.
function runGit(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn("git", args, { cwd: process.cwd() });
        let out = "";
        let err = "";
        const timer = setTimeout(() => {
            child.kill();
            reject(new Error("git timed out after 30s"));
        }, 30_000);
        child.stdout.on("data", (d) => { out += String(d); });
        child.stderr.on("data", (d) => { err += String(d); });
        child.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            const full = out + (err ? "\n" + err : "");
            if (code !== 0) reject(new Error(full.trim() || "git exited " + code));
            else resolve(truncateOutput(full.trim() || "(no output)"));
        });
    });
}

export const gitStatusTool: Tool = {
    name: "git_status",
    description: "Show git working tree status",
    readOnly: true,
    parameters: {
        type: "object",
        properties: { porcelain: { type: "boolean", description: "Machine-readable short format" } },
        required: [],
    },
    async execute(args) {
        const a = ["status"];
        if (args.porcelain) a.push("--porcelain");
        return runGit(a);
    },
};

export const gitLogTool: Tool = {
    name: "git_log",
    description: "Show recent commit history",
    readOnly: true,
    parameters: {
        type: "object",
        properties: {
            limit: { type: "number", description: "How many commits (default 10)" },
            oneline: { type: "boolean", description: "One line per commit (default true)" },
        },
        required: [],
    },
    async execute(args) {
        const limit = Number(args.limit ?? 10);
        const a = ["log", "-n", String(limit)];
        if (args.oneline !== false) a.push("--oneline");
        return runGit(a);
    },
};

export const gitDiffTool: Tool = {
    name: "git_diff",
    description: "Show unstaged/staged diff, optionally stat only or for a file",
    readOnly: true,
    parameters: {
        type: "object",
        properties: {
            cached: { type: "boolean", description: "Show staged (--cached) instead of unstaged" },
            stat: { type: "boolean", description: "Show --stat summary only" },
            file: { type: "string", description: "Limit diff to one file" },
        },
        required: [],
    },
    async execute(args) {
        const a = ["diff"];
        if (args.cached) a.push("--cached");
        if (args.stat) a.push("--stat");
        if (args.file) a.push("--", String(args.file));
        return runGit(a);
    },
};
