// Sample runs for the playground selector.
// Every preset replays the same bundled showcase.jsonl trace; presets differ
// only in the output lens and permission branch used for the replay fold.
// These are the scenarios previously listed on the Examples page.
export const SAMPLE_RUNS = [
  {
    id: "showcase",
    title: "Find TODOs and write a note",
    description:
      "The full three-turn run: the agent searches for TODO comments, reads a file, writes NOTES.md, and verifies the result.",
    output: "print",
    branch: "allow",
    tags: ["multi-turn", "write", "verify"],
  },
  {
    id: "showcase-deny",
    title: "Permission gate in action",
    description:
      "The same TODO run with the write permission denied. Nimi stops the tool, records an error result, and exits cleanly.",
    output: "print",
    branch: "deny",
    tags: ["permissions", "deny branch"],
  },
  {
    id: "showcase-classic",
    title: "Classic REPL view",
    description:
      "The same run through the plain readline renderer, which shows shorter tool-result previews than Print.",
    output: "classic",
    branch: "allow",
    tags: ["classic", "readline"],
  },
  {
    id: "showcase-tui",
    title: "Ink TUI view",
    description:
      "The same run with the TUI lens selected. The terminal stream matches Print; the graph highlights the Ink renderer node instead.",
    output: "tui",
    branch: "allow",
    tags: ["tui", "ink"],
  },
];

export const DEFAULT_SAMPLE_ID = "showcase";

export function sampleById(id) {
  return SAMPLE_RUNS.find((s) => s.id === id) ?? SAMPLE_RUNS[0];
}

// Match the selector to the current replay position. Index is playback
// progress, not sample identity, so it is intentionally ignored here.
export function matchSample(output, branch) {
  return (
    SAMPLE_RUNS.find((s) => s.output === output && s.branch === branch) ??
    SAMPLE_RUNS[0]
  );
}
