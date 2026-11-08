import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gitAddTool, gitBranchTool, gitCheckoutTool, gitCommitTool, gitResetTool, gitStatusTool } from "../src/tools/git.ts";
import { findTool } from "../src/tools/find.ts";
import { grepTool } from "../src/tools/grep.ts";
import { lsTool } from "../src/tools/ls.ts";
import { truncateOutput } from "../src/tools/output.ts";
import { readTool } from "../src/tools/read.ts";
import { editTool } from "../src/tools/edit.ts";
import { writeTool } from "../src/tools/write.ts";

// Tools resolve paths against process.cwd, so each test works in a
// fresh temp dir. No network, no API keys, no repo mutation.
let dir = "";
let prev = "";
beforeEach(() => {
    prev = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "nimi-test-"));
    process.chdir(dir);
});
afterEach(() => {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
});

describe("read/write/edit", () => {
    it("round-trips a file", async () => {
        await writeTool.execute({ path: "a.txt", content: "hello" });
        expect(await readTool.execute({ path: "a.txt" })).toBe("hello");
        await editTool.execute({ path: "a.txt", oldText: "hello", newText: "bye" });
        expect(await readTool.execute({ path: "a.txt" })).toBe("bye");
    });
    it("edit throws when oldText is missing", async () => {
        await writeTool.execute({ path: "a.txt", content: "hello" });
        await expect(editTool.execute({ path: "a.txt", oldText: "nope", newText: "x" })).rejects.toThrow();
    });
});

describe("ls/find/grep", () => {
    it("lists, finds, and greps", async () => {
        await writeTool.execute({ path: "sub/b.ts", content: "TODO one\ntwo\n" });
        expect(await lsTool.execute({ path: "." })).toContain("sub/");
        expect(await findTool.execute({ pattern: "*.ts", path: "." })).toContain("b.ts");
        const hits = await grepTool.execute({ pattern: "TODO", path: ".", include: "*.ts" });
        expect(hits).toContain("b.ts:1:");
    });
    it("grep rejects bad regex", async () => {
        await expect(grepTool.execute({ pattern: "[[" })).rejects.toThrow("Invalid regex");
    });
    it("truncate caps long output", () => {
        expect(truncateOutput("x".repeat(20001))).toContain("[truncated");
    });
});

describe("git", () => {
    it("validates writes without mutating", async () => {
        await expect(gitAddTool.execute({})).rejects.toThrow("No files");
        await expect(gitCommitTool.execute({})).rejects.toThrow("required");
        await expect(gitCheckoutTool.execute({})).rejects.toThrow("either branch or file");
        await expect(gitResetTool.execute({ mode: "nope" })).rejects.toThrow("Unknown mode");
        await expect(gitBranchTool.execute({ action: "create" })).rejects.toThrow("Branch name");
    });
    it("reads real repo state", async () => {
        process.chdir(prev); // temp dir is not a repo; project dir is
        expect(await gitStatusTool.execute({})).toContain("On branch");
        expect((await gitBranchTool.execute({ action: "list" })).length).toBeGreaterThan(0);
    });
});
