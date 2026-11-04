import type { Tool, ToolSpec } from "../types.ts";
import { bashTool } from "./bash.ts";
import { editTool } from "./edit.ts";
import { findTool } from "./find.ts";
import { grepTool } from "./grep.ts";
import { lsTool } from "./ls.ts";
import { readTool } from "./read.ts";
import { writeTool } from "./write.ts";

export * from "../types.ts";

// All tools registered here — add new tools to this list
export const ALL_TOOLS: Tool[] = [readTool, writeTool, editTool, bashTool, lsTool, findTool, grepTool];

// Convert our Tool format to the JSON Schema format the LLM expects
export function getToolDefinitions(): ToolSpec[] {
	return ALL_TOOLS.map((t) => ({
		name: t.name,
		description: t.description,
		parameters: t.parameters,
	}));
}

// Look up a tool by name — used in the agent loop when LLM calls a tool
export function getTool(name: string): Tool | undefined {
	return ALL_TOOLS.find((t) => t.name === name);
}
