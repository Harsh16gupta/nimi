// Nimi codebase architecture graph + live trace-to-architecture mapper.
// Every node, file path, line number, and code snippet corresponds directly
// to the real TypeScript files under src/.

export const SUBSYSTEMS = [
  { id: "entry", label: "entry", color: "var(--nimi-violet)" },
  { id: "config", label: "config", color: "var(--color-text-accent)" },
  { id: "loop", label: "agent loop", color: "var(--color-accent)" },
  { id: "provider", label: "provider", color: "var(--nimi-violet)" },
  { id: "tools", label: "tools", color: "var(--nimi-green)" },
  { id: "permissions", label: "permissions", color: "var(--nimi-amber)" },
  { id: "renderer", label: "renderer", color: "var(--color-text-accent)" },
  { id: "session", label: "session", color: "var(--nimi-green)" },
];

export const SUBSYSTEM_COLOR = Object.fromEntries(
  SUBSYSTEMS.map((s) => [s.id, s.color]),
);

// Architecture nodes positioned on a clean 6-column left-to-right grid
export const ARCH_NODES = [
  // Col 0: Shell
  {
    id: "shell",
    title: "shell",
    sub: "process.argv",
    file: "bin/nimi.js:1",
    group: "entry",
    x: 42,
    y: 256,
    w: 138,
    h: 48,
  },
  // Col 1: Entry
  {
    id: "main",
    title: "main()",
    sub: "src/main.tsx",
    file: "src/main.tsx:18",
    group: "entry",
    x: 222,
    y: 256,
    w: 142,
    h: 48,
  },
  // Col 2: Config, Session & Mode Runners
  {
    id: "parseArgs",
    title: "parseArgs()",
    sub: "src/cli/arg.ts",
    file: "src/cli/arg.ts:18",
    group: "config",
    x: 414,
    y: 54,
    w: 176,
    h: 48,
  },
  {
    id: "loadSettings",
    title: "loadSettings()",
    sub: "src/config/settings.ts",
    file: "src/config/settings.ts:21",
    group: "config",
    x: 414,
    y: 120,
    w: 176,
    h: 48,
  },
  {
    id: "buildSystemPrompt",
    title: "buildSystemPrompt()",
    sub: "src/config/system-prompt.ts",
    file: "src/config/system-prompt.ts:11",
    group: "config",
    x: 414,
    y: 186,
    w: 176,
    h: 48,
  },
  {
    id: "createSession",
    title: "newSessionId()",
    sub: "src/session/store.ts",
    file: "src/session/store.ts:21",
    group: "session",
    x: 414,
    y: 256,
    w: 176,
    h: 48,
  },
  {
    id: "runMode",
    title: "runPrintMode()",
    sub: "src/main.tsx ·withTrace",
    file: "src/main.tsx:106",
    group: "entry",
    x: 414,
    y: 334,
    w: 176,
    h: 50,
  },
  {
    id: "appendMessages",
    title: "appendMessages()",
    sub: ".nimi/sessions/<id>.jsonl",
    file: "src/session/store.ts:30",
    group: "session",
    x: 414,
    y: 424,
    w: 176,
    h: 48,
  },
  // Col 2.5 (left of runMode): Terminal output sink
  {
    id: "terminal",
    title: "your terminal",
    sub: "AgentEvent → stdout",
    file: "src/main.tsx:116",
    group: "renderer",
    x: 210,
    y: 392,
    w: 154,
    h: 48,
  },
  // Col 3: Agent Generator Loop
  {
    id: "runAgent",
    title: "runAgent()",
    sub: "src/agent.ts",
    file: "src/agent.ts:36",
    group: "loop",
    x: 654,
    y: 256,
    w: 168,
    h: 50,
  },
  {
    id: "assembleBlocks",
    title: "decide by blocks",
    sub: "agent.ts · toolCalls[]",
    file: "src/agent.ts:84",
    group: "loop",
    x: 654,
    y: 348,
    w: 168,
    h: 48,
  },
  // Col 4: Compaction, Tool Catalog, Provider Factory, Tool Lookup
  {
    id: "shouldCompact",
    title: "shouldCompact()",
    sub: "src/agent/compaction.ts",
    file: "src/agent/compaction.ts:28",
    group: "loop",
    x: 888,
    y: 78,
    w: 184,
    h: 48,
  },
  {
    id: "getToolDefs",
    title: "getToolDefinitions()",
    sub: "src/tools/index.ts",
    file: "src/tools/index.ts:17",
    group: "tools",
    x: 888,
    y: 150,
    w: 184,
    h: 48,
  },
  {
    id: "getProvider",
    title: "getProvider()",
    sub: "src/providers/index.ts",
    file: "src/providers/index.ts:21",
    group: "provider",
    x: 888,
    y: 256,
    w: 184,
    h: 48,
  },
  {
    id: "getTool",
    title: "getTool(name)",
    sub: "src/tools/index.ts",
    file: "src/tools/index.ts:26",
    group: "tools",
    x: 888,
    y: 416,
    w: 184,
    h: 48,
  },
  // Col 5: Provider Stream, StreamEvent, Permission Gate
  {
    id: "providerStream",
    title: "provider.stream()",
    sub: "src/providers/openai-compat.ts",
    file: "src/providers/openai-compat.ts:70",
    group: "provider",
    x: 1134,
    y: 256,
    w: 188,
    h: 48,
  },
  {
    id: "streamEvent",
    title: "StreamEvent",
    sub: "text_delta · toolCall · done",
    file: "src/providers/openai-compat.ts:99",
    group: "provider",
    x: 1134,
    y: 348,
    w: 188,
    h: 48,
  },
  {
    id: "canUseTool",
    title: "canUseTool()",
    sub: "src/permissions.ts",
    file: "src/permissions.ts:13",
    group: "permissions",
    x: 1134,
    y: 416,
    w: 188,
    h: 48,
  },
  // Col 6: Remote Model API & Local Tool Execution
  {
    id: "modelApi",
    title: "Meta Muse API",
    sub: "chat.completions.create",
    file: "src/providers/openai-compat.ts:71",
    group: "provider",
    x: 1378,
    y: 256,
    w: 166,
    h: 48,
  },
  {
    id: "toolExecute",
    title: "tool.execute()",
    sub: "fs · ripgrep · git spawn",
    file: "src/agent.ts:155",
    group: "tools",
    x: 1378,
    y: 416,
    w: 166,
    h: 48,
  },
];

// Subtle architectural subsystem zones (Eraser.io style backdrop containers)
export const ARCH_ZONES = [
  {
    id: "zone-boot",
    label: "CLI & CONFIG",
    x: 398,
    y: 30,
    w: 208,
    h: 216,
  },
  {
    id: "zone-session",
    label: "MODE & SESSION",
    x: 398,
    y: 248,
    w: 208,
    h: 236,
  },
  {
    id: "zone-loop",
    label: "GENERATOR LOOP",
    x: 638,
    y: 232,
    w: 200,
    h: 180,
  },
  {
    id: "zone-provider",
    label: "PROVIDER STREAM",
    x: 872,
    y: 232,
    w: 686,
    h: 178,
  },
  {
    id: "zone-tools",
    label: "TOOL DISPATCH & PERMISSION GATE",
    x: 872,
    y: 398,
    w: 686,
    h: 82,
  },
];

export const ARCH_EDGES = [
  { id: "e-shell-main", from: "shell", to: "main", label: "argv" },
  { id: "e-main-args", from: "main", to: "parseArgs", label: "slice(2)" },
  { id: "e-main-settings", from: "main", to: "loadSettings", label: "cascade" },
  { id: "e-main-prompt", from: "main", to: "buildSystemPrompt", label: "AGENTS.md" },
  { id: "e-main-session", from: "main", to: "createSession", label: "session_info" },
  { id: "e-main-mode", from: "main", to: "runMode", label: "dispatch" },
  { id: "e-mode-agent", from: "runMode", to: "runAgent", label: "options" },
  { id: "e-agent-compact", from: "runAgent", to: "shouldCompact", label: "75% check" },
  { id: "e-agent-defs", from: "runAgent", to: "getToolDefs", label: "15 tools" },
  { id: "e-agent-prov", from: "runAgent", to: "getProvider", label: "resolve" },
  { id: "e-prov-stream", from: "getProvider", to: "providerStream", label: "stream()" },
  { id: "e-stream-api", from: "providerStream", to: "modelApi", label: "HTTPS SSE" },
  { id: "e-api-event", from: "modelApi", to: "streamEvent", label: "chunks" },
  { id: "e-event-blocks", from: "streamEvent", to: "assembleBlocks", label: "reply" },
  { id: "e-blocks-agent", from: "assembleBlocks", to: "runAgent", label: "turn_end" },
  { id: "e-blocks-tool", from: "assembleBlocks", to: "getTool", label: "toolCalls[]" },
  { id: "e-tool-gate", from: "getTool", to: "canUseTool", label: "readOnly?" },
  { id: "e-gate-exec", from: "canUseTool", to: "toolExecute", label: "allowed" },
  { id: "e-exec-agent", from: "toolExecute", to: "runAgent", label: "toolResult" },
  { id: "e-agent-mode", from: "runAgent", to: "runMode", label: "AgentEvent" },
  { id: "e-mode-term", from: "runMode", to: "terminal", label: "stdout" },
  { id: "e-mode-save", from: "runMode", to: "appendMessages", label: "newMessages" },
];

export const CODE_SNIPPETS = {
  parseArgs: `// src/cli/arg.ts:18
export function parseArgs(argv: string[]): CliArgs {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    // Parses -p, --provider, --model, --session, --trace, --print, --yolo
  }
  return args;
}`,
  loadSettings: `// src/config/settings.ts:21
export async function loadSettings(): Promise<Settings> {
  const global = await readJsonSafe(getGlobalSettingsPath());
  const project = await readJsonSafe(getProjectSettingsPath());
  const merged: Settings = { ...global, ...project };
  if (process.env.NIMI_PROVIDER) merged.provider = process.env.NIMI_PROVIDER;
  return merged;
}`,
  buildSystemPrompt: `// src/config/system-prompt.ts:11
export async function buildSystemPrompt(extra?: string): Promise<string> {
  const toolsList = ALL_TOOLS.map((t) => \`- \${t.name}: \${t.description}\`).join("\\n");
  // Appends AGENTS.md / CLAUDE.md / .nimi/context.md if present in cwd
  return base + toolsSection + contextSection + extraSection;
}`,
  createSession: `// src/session/store.ts:25
export async function appendEntry(id: string, entry: SessionEntry): Promise<void> {
  await mkdir(getSessionDir(), { recursive: true });
  await appendFile(getSessionPath(id), JSON.stringify(entry) + "\\n", "utf-8");
}`,
  runAgent: `// src/agent.ts:36
export async function* runAgent(options: AgentOptions): AsyncGenerator<AgentEvent> {
  const maxTurns = options.maxTurns ?? 20;
  yield { type: "agent_start" };
  for (let round = 0; round < maxTurns; round++) {
    if (shouldCompact(options.messages, options.model, options.contextLimit)) { ... }
    for await (const event of options.provider.stream({ ... })) { ... }
  }
}`,
  providerStream: `// src/providers/openai-compat.ts:70
async *stream({ messages, model, system, tools = [] }) {
  const response = await client.chat.completions.create({
    model, stream: true, stream_options: { include_usage: true },
    messages: [...(system ? [{ role: "system", content: system }] : []), ...toOpenAI(messages)],
  });
  for await (const chunk of response) {
    if (delta?.content) yield { type: "text_delta", delta: delta.content };
  }
}`,
  assembleBlocks: `// src/agent.ts:84
const toolCalls: ToolCallBlock[] = [];
for (const block of reply.content) {
  if (block.type === "toolCall") toolCalls.push(block);
}
// Decide by blocks, not stopReason: providers can report end_turn with tools.
if (toolCalls.length === 0) {
  yield { type: "turn_end" };
  yield { type: "agent_end", message: reply };
  return;
}`,
  getTool: `// src/agent.ts:109 & src/tools/index.ts:26
let toolToRun: Tool | undefined;
for (const candidate of options.tools) {
  if (candidate.name === call.name) toolToRun = candidate;
}`,
  canUseTool: `// src/agent.ts:134
if (toolToRun.readOnly !== true && options.canUseTool !== undefined) {
  const decision = await options.canUseTool(call.name, call.arguments);
  if (decision.behavior === "deny") {
    yield { type: "denied", id: call.id, name: call.name, reason: decision.message };
    yield { type: "tool_end", id: call.id, name: call.name, result: decision.message, isError: true };
    continue;
  }
}`,
  toolExecute: `// src/agent.ts:155
try {
  const output = await toolToRun.execute(call.arguments);
  options.messages.push({
    role: "toolResult", toolCallId: call.id, toolName: call.name, content: output, isError: false,
  });
  yield { type: "tool_end", id: call.id, name: call.name, result: output, isError: false };
}`,
  shouldCompact: `// src/agent/compaction.ts:61
export async function compactMessages(messages: Message[], provider: Provider, model: string) {
  const split = findSafeSplit(messages, KEEP_RECENT); // never orphan a toolResult
  const history = messages.slice(0, split).map(renderForSummary).join("\\n");
  // Summarizes head via provider.stream(), keeps recent turns verbatim
}`,
  appendMessages: `// src/main.tsx:132 & src/session/store.ts:30
// runAgent mutates messages in place: persist only what this run added.
await appendMessages(sessionId, messages.slice(before));`,
};

// Map the current trace item (0..27) + mode/branch to the active architecture
// node, active edges, file:line citation, and plain-English explanation.
export function describeStep(parsed, view, index, { output = "print", branch = "allow" } = {}) {
  const clamped = Math.max(0, Math.min(parsed.items.length - 1, index));
  const item = parsed.items[clamped];
  const { line, obj } = item;

  // If the deny branch truncated earlier than index, describe the denial state
  if (view.denied && clamped >= 12) {
    return {
      phase: "PERMISSIONS",
      phaseId: "permissions",
      shortPhase: "denied",
      fnTitle: `canUseTool("write", { path: "NOTES.md" })`,
      fileRef: "src/permissions.ts:27",
      traceLine: view.denied.line,
      nodeId: "canUseTool",
      secondaryNodes: ["getTool", "runAgent"],
      edgeIds: ["e-tool-gate"],
      edgeNote: "deny → isError:true",
      explanation:
        "Because write is not marked readOnly: true, runAgent() consults canUseTool() before touching the filesystem. On 'deny', Nimi does not crash the loop—it pushes an isError: true toolResult ('User denied write. Do not retry; ask what to do instead.') and yields a denied event.",
      snippet: CODE_SNIPPETS.canUseTool,
    };
  }

  // Step 0: agent_start -> bootstrap + loop entry
  if (obj.type === "event" && obj.event.type === "agent_start") {
    return {
      phase: "ENTRY",
      phaseId: "entry",
      shortPhase: "start",
      fnTitle: "parseArgs() → loadSettings() → runAgent()",
      fileRef: "src/main.tsx:106",
      traceLine: line,
      nodeId: "runAgent",
      secondaryNodes: ["shell", "main", "parseArgs", "loadSettings", "buildSystemPrompt", "createSession", "runMode"],
      edgeIds: ["e-shell-main", "e-main-mode", "e-mode-agent"],
      edgeNote: "AgentOptions",
      explanation:
        "main.tsx parses CLI flags, merges ~/.nimi and .nimi settings, assembles the system prompt with all 15 tool specs, and opens the async generator runAgent(). Its very first yield is { type: 'agent_start' }, tee'd by withTrace() into showcase.jsonl.",
      snippet: CODE_SNIPPETS.runAgent,
    };
  }

  // Streaming text deltas from provider
  if (obj.type === "event" && obj.event.type === "text_delta") {
    const turnNum = obj.i < 6 ? 1 : obj.i < 15 ? 2 : 3;
    return {
      phase: "PROVIDER",
      phaseId: "provider",
      shortPhase: `stream t${turnNum}`,
      fnTitle: `provider.stream({ model: "${parsed.header?.model ?? "muse-spark"}", messages })`,
      fileRef: "src/providers/openai-compat.ts:99",
      traceLine: line,
      nodeId: "streamEvent",
      secondaryNodes: ["providerStream", "modelApi", "runMode", "terminal"],
      edgeIds: ["e-prov-stream", "e-stream-api", "e-api-event", "e-mode-term"],
      edgeNote: `"${obj.event.delta}"`,
      explanation:
        `Turn ${turnNum} streaming chunk from Meta Muse via OpenAI-compatible SSE. Each delta.content chunk is yielded immediately as { type: "text_delta" } so ${output === "print" ? "process.stdout.write()" : "the terminal renderer"} streams tokens live while tool_calls arguments buffer by index.`,
      snippet: CODE_SNIPPETS.providerStream,
    };
  }

  // turn_end event
  if (obj.type === "event" && obj.event.type === "turn_end") {
    return {
      phase: "AGENT LOOP",
      phaseId: "loop",
      shortPhase: "turn_end",
      fnTitle: "decideByBlocks(reply.content) → toolCalls[]",
      fileRef: "src/agent.ts:84",
      traceLine: line,
      nodeId: "assembleBlocks",
      secondaryNodes: ["runAgent", "streamEvent"],
      edgeIds: ["e-event-blocks", "e-blocks-agent"],
      edgeNote: "turn_end",
      explanation:
        "Once provider.stream() finishes, runAgent() pushes the AssistantMessage to messages[] BEFORE running tools. It inspects reply.content blocks rather than stopReason—because some providers emit end_turn even when toolCall blocks are present.",
      snippet: CODE_SNIPPETS.assembleBlocks,
    };
  }

  // messages snapshot line
  if (obj.type === "messages") {
    const isFinal = clamped === parsed.items.length - 1;
    if (isFinal) {
      return {
        phase: "FINISH",
        phaseId: "session",
        shortPhase: "finish",
        fnTitle: "appendMessages(sessionId, newMessages)",
        fileRef: "src/session/store.ts:30",
        traceLine: line,
        nodeId: "appendMessages",
        secondaryNodes: ["runMode", "terminal"],
        edgeIds: ["e-mode-save"],
        edgeNote: "newMessages",
        explanation:
          "One JSONL line per message, appended to .nimi/sessions/<id>.jsonl. Because runAgent() mutates messages[] in place, main.tsx slices messages.slice(before) so resuming with --session replays history without ever duplicating earlier turns.",
        snippet: CODE_SNIPPETS.appendMessages,
      };
    }
    return {
      phase: "SESSION",
      phaseId: "session",
      shortPhase: "snapshot",
      fnTitle: `trace.record(event, messages[${obj.messages.length}])`,
      fileRef: "src/trace/recorder.ts:75",
      traceLine: line,
      nodeId: "createSession",
      secondaryNodes: ["runMode", "runAgent"],
      edgeIds: ["e-agent-mode"],
      edgeNote: `messages[${obj.messages.length}]`,
      explanation:
        `After event #${obj.afterEvent}, withTrace() snapshots all ${obj.messages.length} messages in context. This lets the studio scrub backward or forward to any point in the run and inspect the exact prompt history without re-executing the model.`,
      snippet: CODE_SNIPPETS.createSession,
    };
  }

  // tool_start event
  if (obj.type === "event" && obj.event.type === "tool_start") {
    const { name, input } = obj.event;
    const gated = name === "write";
    if (gated) {
      return {
        phase: "PERMISSIONS",
        phaseId: "permissions",
        shortPhase: "gate:write",
        fnTitle: `canUseTool("${name}", { path: "${input.path}" })`,
        fileRef: "src/agent.ts:134",
        traceLine: line,
        nodeId: "canUseTool",
        secondaryNodes: ["getTool", "toolExecute"],
        edgeIds: ["e-blocks-tool", "e-tool-gate", "e-gate-exec"],
        edgeNote: `${branch === "allow" ? "allow → execute" : "deny"}`,
        explanation:
          "writeTool does not set readOnly: true, so runAgent() pauses at the permission gate before mutating disk. In interactive mode createPromptPermission() asks [y]es / [a]lways / [n]o; when allowed, execution proceeds to writeTool.execute().",
        snippet: CODE_SNIPPETS.canUseTool,
      };
    }
    return {
      phase: "TOOLS",
      phaseId: "tools",
      shortPhase: `tool:${name}`,
      fnTitle: `${name}Tool.execute(${JSON.stringify(input)})`,
      fileRef: `src/tools/${name}.ts:1`,
      traceLine: line,
      nodeId: "getTool",
      secondaryNodes: ["assembleBlocks", "canUseTool", "toolExecute"],
      edgeIds: ["e-blocks-tool", "e-tool-gate", "e-gate-exec"],
      edgeNote: "readOnly: true (bypass gate)",
      explanation:
        `${name} is marked readOnly: true in ALL_TOOLS, so it safely observes the repository without prompting the user. getTool("${name}") resolves the handler from the 15-tool catalog and dispatches directly to tool.execute().`,
      snippet: CODE_SNIPPETS.getTool,
    };
  }

  // tool_end event
  if (obj.type === "event" && obj.event.type === "tool_end") {
    const { name, result } = obj.event;
    return {
      phase: "TOOLS",
      phaseId: "tools",
      shortPhase: `res:${name}`,
      fnTitle: `toolToRun.execute() → "${name}" (${result.split("\n").length} lines)`,
      fileRef: "src/agent.ts:155",
      traceLine: line,
      nodeId: "toolExecute",
      secondaryNodes: ["runAgent", "terminal"],
      edgeIds: ["e-exec-agent", "e-agent-mode", "e-mode-term"],
      edgeNote: "toolResult",
      explanation:
        `tool.execute() finishes and wraps output through truncateOutput(20000) so a huge file or grep match can never blow the context window. The result is appended to messages[] as a toolResult role and yielded as tool_end.`,
      snippet: CODE_SNIPPETS.toolExecute,
    };
  }

  // compacted event
  if (obj.type === "event" && obj.event.type === "compacted") {
    return {
      phase: "COMPACT",
      phaseId: "loop",
      shortPhase: "compact",
      fnTitle: "shouldCompact() → compactMessages(messages, provider, model)",
      fileRef: "src/agent/compaction.ts:61",
      traceLine: line,
      nodeId: "shouldCompact",
      secondaryNodes: ["runAgent", "providerStream"],
      edgeIds: ["e-agent-compact", "e-prov-stream"],
      edgeNote: `${obj.event.before} → 2 msgs`,
      explanation:
        "Before starting the next round, shouldCompact() estimates token usage (~chars/4) against 75% of the context window. findSafeSplit() walks backward so it never splits an assistant toolCall from its following toolResult, replacing the older prefix with a concise summary.",
      snippet: CODE_SNIPPETS.shouldCompact,
    };
  }

  // agent_end event
  return {
    phase: "AGENT LOOP",
    phaseId: "loop",
    shortPhase: "agent_end",
    fnTitle: "runAgent() → yield { type: \"agent_end\", message }",
    fileRef: "src/agent.ts:96",
    traceLine: line,
    nodeId: "runAgent",
    secondaryNodes: ["assembleBlocks", "runMode", "terminal"],
    edgeIds: ["e-agent-mode", "e-mode-term"],
    edgeNote: "agent_end",
    explanation:
      "Turn 3 reply contains text blocks and zero toolCall blocks. runAgent() yields turn_end followed by agent_end with the final AssistantMessage and returns cleanly from the generator.",
    snippet: CODE_SNIPPETS.assembleBlocks,
  };
}
