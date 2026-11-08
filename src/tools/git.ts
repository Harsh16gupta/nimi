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

// Writable tools below: no readOnly, so the permission gate asks first.
// Staging.
export const gitAddTool: Tool = {
    name: "git_add",
    description: "Stage files for commit",
    parameters: {
        type: "object",
        properties: {
            paths: { type: "array", description: "Files to stage, e.g. [\"src/a.ts\"]" },
            all: { type: "boolean", description: "Stage all changes including deletions" },
        },
        required: [],
    },
    async execute(args) {
        const paths = (args.paths as string[] | undefined) ?? [];
        const a = ["add"];
        if (args.all) a.push("--all");
        else if (paths.length > 0) a.push(...paths.map(String));
        else throw new Error("No files specified. Pass paths or set all=true.");
        return runGit(a);
    },
};

// Committing needs a message; amend reuses it on the last commit.
export const gitCommitTool: Tool = {
    name: "git_commit",
    description: "Create a commit with staged changes",
    parameters: {
        type: "object",
        properties: {
            message: { type: "string", description: "Commit message (required)" },
            amend: { type: "boolean", description: "Amend the previous commit" },
        },
        required: ["message"],
    },
    async execute(args) {
        const message = String(args.message ?? "").trim();
        if (!message) throw new Error("Commit message is required and cannot be empty.");
        const a = ["commit", "-m", message];
        if (args.amend) a.push("--amend");
        return runGit(a);
    },
};

// One tool for list/create/delete: listing is cheap, but the same tool
// can delete, so it stays writable and asks permission.
export const gitBranchTool: Tool = {
    name: "git_branch",
    description: "List, create, or delete branches",
    parameters: {
        type: "object",
        properties: {
            action: { type: "string", description: "list, create, or delete (default list)" },
            name: { type: "string", description: "Branch name for create/delete" },
            all: { type: "boolean", description: "List local and remote branches" },
        },
        required: [],
    },
    async execute(args) {
        const action = String(args.action ?? "list");
        const a = ["branch"];
        if (action === "list") {
            if (args.all) a.push("-a");
        } else if (action === "create" || action === "delete") {
            if (!args.name) throw new Error("Branch name required for " + action + ".");
            if (action === "delete") a.push("-d");
            a.push(String(args.name));
        } else throw new Error("Unknown action: " + action + " (use list/create/delete).");
        return runGit(a);
    },
};

// Switch branches (optionally creating) or restore a file from HEAD.
export const gitCheckoutTool: Tool = {
    name: "git_checkout",
    description: "Switch branches or restore a file from HEAD",
    parameters: {
        type: "object",
        properties: {
            branch: { type: "string", description: "Branch name to checkout" },
            createNew: { type: "boolean", description: "Create and checkout a new branch (-b)" },
            file: { type: "string", description: "File path to restore instead of switching" },
        },
        required: [],
    },
    async execute(args) {
        const a = ["checkout"];
        if (args.file) a.push("--", String(args.file));
        else if (args.branch) {
            if (args.createNew) a.push("-b");
            a.push(String(args.branch));
        } else throw new Error("Specify either branch or file.");
        return runGit(a);
    },
};

// Unstage or reset: default unstages (mixed to HEAD), --hard discards.
export const gitResetTool: Tool = {
    name: "git_reset",
    description: "Unstage changes or reset to a commit",
    parameters: {
        type: "object",
        properties: {
            target: { type: "string", description: "Commit to reset to (default HEAD)" },
            mode: { type: "string", description: "soft, mixed, or hard (default mixed)" },
            file: { type: "string", description: "Specific file to unstage" },
        },
        required: [],
    },
    async execute(args) {
        const mode = String(args.mode ?? "mixed");
        if (mode !== "soft" && mode !== "mixed" && mode !== "hard") throw new Error("Unknown mode: " + mode + ".");
        const a = ["reset"];
        if (mode !== "mixed") a.push("--" + mode);
        a.push(String(args.target ?? "HEAD"));
        if (args.file) a.push(String(args.file));
        return runGit(a);
    },
};
