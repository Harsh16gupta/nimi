import type readline from "node:readline";

// What the gate returns: allow it, or deny with a note for the model.
export type PermissionDecision = { behavior: "allow" } | { behavior: "deny"; message: string };
export type CanUseTool = (name: string, input: Record<string, unknown>) => Promise<PermissionDecision>;

// Scripts/pipes can't prompt, so they auto-allow (use --yolo explicitly).
export function allowAll(): CanUseTool {
    return async () => ({ behavior: "allow" });
}

// Ask y/a/n on the terminal. Remembers "always" per tool for the session.
export function createPromptPermission(rl: readline.Interface): CanUseTool {
    const always = new Set<string>();
    return async (name, input) => {
        if (always.has(name)) return { behavior: "allow" };
        const what = input.command ?? input.path ?? input.file ?? JSON.stringify(input);
        console.log(`\nPermission needed: ${name} ${String(what).slice(0, 120)}`);
        console.log("[y]es / [a]lways / [n]o (default)");
        const answer = await new Promise<string>((resolve) => rl.question("> ", resolve));
        const choice = answer.trim().toLowerCase();
        if (choice === "a" || choice === "always") {
            always.add(name);
            return { behavior: "allow" };
        }
        if (choice === "y" || choice === "yes") return { behavior: "allow" };
        return { behavior: "deny", message: `User denied ${name}. Do not retry; ask what to do instead.` };
    };
}
