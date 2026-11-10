// Examples library: preloaded agent executions that users can open directly.
import { useState } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { TextInput } from "@astryxdesign/core/TextInput";

const EXAMPLES = [
  {
    id: "showcase",
    title: "Find TODOs and write a note",
    description:
      "A complete three-turn run: the agent searches for TODO comments, reads a file, writes NOTES.md, and verifies the result.",
    tags: ["multi-turn", "write", "verify"],
    mode: "print",
    branch: "allow",
  },
  {
    id: "showcase-deny",
    title: "Permission gate in action",
    description:
      "The same TODO run with write permission denied. See how Nimi stops the tool, returns an error result, and exits cleanly.",
    tags: ["permissions", "deny branch"],
    mode: "print",
    branch: "deny",
  },
  {
    id: "showcase-classic",
    title: "Classic REPL view",
    description:
      "Replay the run as it would appear in the plain readline REPL, with compact result previews.",
    tags: ["classic", "readline"],
    mode: "classic",
    branch: "allow",
  },
  {
    id: "showcase-tui",
    title: "Ink TUI view",
    description:
      "Replay the run as it would render inside the terminal UI built with Ink, showing the mode runner node change.",
    tags: ["tui", "ink"],
    mode: "tui",
    branch: "allow",
  },
];

const TAG_COLORS = {
  "multi-turn": "blue",
  write: "warning",
  verify: "success",
  permissions: "warning",
  "deny branch": "error",
  classic: "info",
  readline: "info",
  tui: "info",
  ink: "info",
};

export default function ExamplesPage() {
  const [query, setQuery] = useState("");

  const filtered = EXAMPLES.filter(
    (ex) =>
      ex.title.toLowerCase().includes(query.toLowerCase()) ||
      ex.description.toLowerCase().includes(query.toLowerCase()) ||
      ex.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <main className="nimi-examples">
      <div className="nimi-section-header">
        <Heading level={1} className="nimi-section-title">
          Examples
        </Heading>
        <p className="nimi-section-lead">
          Explore preloaded agent executions. Each example demonstrates a different pattern, branch, or
          render mode. Open any example directly in the playground.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <TextInput
          type="search"
          label="Search examples"
          placeholder="Search examples..."
          value={query}
          onChange={(v) => setQuery(v)}
          startIcon="search"
          isLabelHidden
          size="md"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="nimi-examples-grid">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="nimi-example-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                window.location.hash = `#/playground?output=${ex.mode}&branch=${ex.branch}&index=0`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  window.location.hash = `#/playground?output=${ex.mode}&branch=${ex.branch}&index=0`;
                }
              }}
              aria-label={`Open ${ex.title} in playground`}
            >
              <div className="nimi-example-tags">
                {ex.tags.map((tag) => (
                  <Badge key={tag} label={tag} tone={TAG_COLORS[tag] ?? "neutral"} size="sm" />
                ))}
              </div>
              <div>
                <Heading level={3} style={{ fontSize: "var(--font-size-lg)", margin: 0 }}>
                  {ex.title}
                </Heading>
              </div>
              <Text type="body" color="secondary" style={{ margin: 0, lineHeight: 1.5 }}>
                {ex.description}
              </Text>
              <div style={{ marginTop: "auto", paddingTop: "var(--spacing-2)" }}>
                <Button label="Open in playground" variant="primary" size="sm" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No examples match"
          description="Try a different search term."
          actions={
            <Button label="Clear search" variant="secondary" size="sm" onClick={() => setQuery("")} />
          }
        />
      )}
    </main>
  );
}
