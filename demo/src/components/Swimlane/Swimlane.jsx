// Execution swimlane: the same 28 replay steps placed in their
// architecture zone rows at chronological columns. Click a block to jump.
// Turn boundaries get a cobalt divider. Branch-aware: on deny, steps past
// the gate read as the denial state, matching the replay fold.
import { useMemo } from "react";
import { replay } from "../../data/trace.js";
import { describeStep } from "../../data/architecture.js";

const ZONE_ROWS = [
  { id: "zone1", label: "Zone 1 · CLI & Config" },
  { id: "zone2", label: "Zone 2 · Modes & Session" },
  { id: "zone3", label: "Zone 3 · Generator Loop" },
  { id: "zone4", label: "Zone 4 · Provider Stream" },
  { id: "zone5", label: "Zone 5 · Tool Gate" },
];

// Every architecture node belongs to exactly one swimlane row.
const ZONE_OF = {
  shell: "zone1",
  main: "zone1",
  parseArgs: "zone1",
  loadSettings: "zone1",
  buildSystemPrompt: "zone1",
  createSession: "zone2",
  runMode: "zone2",
  appendMessages: "zone2",
  shouldCompact: "zone2",
  terminal: "zone2",
  runAgent: "zone3",
  assembleBlocks: "zone3",
  getToolDefs: "zone3",
  getProvider: "zone4",
  providerStream: "zone4",
  modelApi: "zone4",
  streamEvent: "zone4",
  getTool: "zone5",
  canUseTool: "zone5",
  toolExecute: "zone5",
};

export default function Swimlane({ parsed, max, pos, go, output, branch }) {
  const { columns, turnOf } = useMemo(() => {
    const opts = { output, branch };
    const cols = [];
    for (let k = 0; k <= max; k++) {
      const v = replay(parsed, k, opts);
      const info = describeStep(parsed, v, k, opts);
      cols.push({ nodeId: info?.nodeId ?? null });
    }
    const full = replay(parsed, max, { output, branch: "allow" });
    const turns = {};
    full.turns.forEach((t) => t.steps.forEach((s) => {
      turns[s.itemIndex] = t.n;
    }));
    return { columns: cols, turnOf: turns };
  }, [parsed, max, output, branch]);

  return (
    <div className="bp-swim" role="img" aria-label="Execution swimlane: replay steps grouped by architecture zone">
      <h3 className="bp-swim-title">Execution Chronology & Zone Waterfall</h3>
      <div className="bp-swim-head" aria-hidden>
        <span className="bp-swim-corner">Step →</span>
        {columns.map((_, k) => (
          <span key={k} className="bp-swim-stepnum">{k + 1}</span>
        ))}
      </div>
      {ZONE_ROWS.map((row) => (
        <div key={row.id} className="bp-swim-row">
          <span className="bp-swim-zone">{row.label}</span>
          {columns.map((col, k) => {
            const hit = col.nodeId && ZONE_OF[col.nodeId] === row.id;
            if (!hit) return <span key={k} className="bp-swim-cell off" aria-hidden />;
            const cls = k === pos.index ? "active" : k < pos.index ? "visited" : "hit";
            const div = k > 0 && turnOf[k] !== turnOf[k - 1] ? " turn-div" : "";
            return (
              <button
                key={k}
                type="button"
                className={`bp-swim-cell ${cls}${div}`}
                onClick={() => go(k)}
                title={`Step ${k + 1} of ${max + 1} — jump`}
                aria-label={`Jump to step ${k + 1} of ${max + 1}${k === pos.index ? ", current step" : ""}`}
                aria-current={k === pos.index ? "step" : undefined}
              >
                {k + 1}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
