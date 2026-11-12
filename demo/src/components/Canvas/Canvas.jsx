// Blueprint schematic flowchart: the real architecture nodes from
// data/architecture.js laid out in the zone flow from the design brief,
// wired with orthogonal PCB traces. Active wire + node follow the live
// replay step; cards show visit counters; the deny branch draws the
// vermilion rejection trace. Click a card to jump to its first step.
// Pan via scroll; zoom is controlled from the header (Fit/-/100%/+).
import { useEffect, useRef } from "react";
import { ARCH_NODES } from "../../data/architecture.js";

const W = 1400;
const H = 520;
const CARD_W = 195;
const CARD_H = 48;

// Node centers in the 1400x520 blueprint space (zone flow left -> right).
const POS = {
  shell: { x: 112, y: 140 },
  main: { x: 112, y: 260 },
  terminal: { x: 112, y: 380 },
  parseArgs: { x: 337, y: 160 },
  loadSettings: { x: 337, y: 270 },
  buildSystemPrompt: { x: 337, y: 380 },
  createSession: { x: 567, y: 160 },
  runMode: { x: 567, y: 270 },
  appendMessages: { x: 567, y: 380 },
  shouldCompact: { x: 567, y: 50 },
  runAgent: { x: 797, y: 200 },
  assembleBlocks: { x: 797, y: 330 },
  getToolDefs: { x: 797, y: 50 },
  getProvider: { x: 1027, y: 90 },
  providerStream: { x: 1027, y: 190 },
  modelApi: { x: 1027, y: 290 },
  streamEvent: { x: 1027, y: 390 },
  getTool: { x: 1257, y: 290 },
  canUseTool: { x: 1257, y: 370 },
  toolExecute: { x: 1257, y: 440 },
};

const ZONES = [
  { label: "ZONE 1: CLI & CONFIG", top: 100, left: 230, width: 195, height: 370 },
  { label: "ZONE 2: MODES & SESSION", top: 100, left: 460, width: 195, height: 370 },
  { label: "ZONE 3: GENERATOR LOOP", top: 100, left: 690, width: 195, height: 370 },
  { label: "ZONE 4: PROVIDER STREAM", top: 40, left: 920, width: 195, height: 430 },
  { label: "ZONE 5: TOOL GATE", top: 240, left: 1145, width: 235, height: 230 },
];

// Architectural flow edges (left -> right, feedback returns included).
const WIRES = [
  ["shell", "parseArgs"],
  ["parseArgs", "loadSettings"],
  ["loadSettings", "buildSystemPrompt"],
  ["buildSystemPrompt", "createSession"],
  ["createSession", "runMode"],
  ["runMode", "appendMessages"],
  ["appendMessages", "runAgent"],
  ["runAgent", "getProvider"],
  ["getProvider", "providerStream"],
  ["providerStream", "modelApi"],
  ["modelApi", "streamEvent"],
  ["streamEvent", "assembleBlocks"],
  ["assembleBlocks", "getTool"],
  ["getTool", "canUseTool"],
  ["canUseTool", "toolExecute"],
  ["toolExecute", "appendMessages"],
  ["runAgent", "terminal"],
];

function ortho(p1, p2) {
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

const nodeById = Object.fromEntries(ARCH_NODES.map((n) => [n.id, n]));

export default function Canvas({
  stepInfo,
  pos,
  counts,
  first,
  prevNodeId,
  denied,
  zoom,
  fitTick,
  onJump,
}) {
  const scrollRef = useRef(null);
  const activeId = stepInfo?.nodeId ?? null;

  useEffect(() => {
    if (fitTick === 0) return;
    const el = scrollRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [fitTick]);

  return (
    <div className="bp-scroll" ref={scrollRef}>
      <div style={{ width: W * zoom, height: H * zoom }}>
        <div className="bp-stage" style={{ width: W, height: H, transform: `scale(${zoom})` }}>
          <svg className="bp-wires" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
            <defs>
              <marker id="bp-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0300EB" />
              </marker>
              <marker id="bp-arrow-dim" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#D4DCF7" />
              </marker>
              <marker id="bp-arrow-denied" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#D9381E" />
              </marker>
            </defs>
            {WIRES.map(([from, to]) => {
              const p1 = POS[from];
              const p2 = POS[to];
              if (!p1 || !p2) return null;
              const isActive = prevNodeId === from && activeId === to;
              return (
                <g key={`${from}-${to}`}>
                  <path
                    d={ortho(p1, p2)}
                    stroke={isActive ? "#0300EB" : "#D4DCF7"}
                    strokeWidth={isActive ? 2 : 1.5}
                    fill="none"
                    markerEnd={isActive ? "url(#bp-arrow)" : "url(#bp-arrow-dim)"}
                  />
                  <circle cx={p1.x} cy={p1.y} r="3" fill={isActive ? "#0300EB" : "#D4DCF7"} />
                </g>
              );
            })}
            {denied && (
              <path
                d="M 1257 370 L 1257 410 L 797 410 L 797 330"
                stroke="#D9381E"
                strokeDasharray="4 4"
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#bp-arrow-denied)"
              />
            )}
          </svg>

          {ZONES.map((z) => (
            <div
              key={z.label}
              className="bp-zone"
              style={{ top: z.top, left: z.left, width: z.width, height: z.height }}
            >
              <span className="bp-zone-label">{z.label}</span>
            </div>
          ))}

          {Object.entries(POS).map(([id, p]) => {
            const node = nodeById[id];
            if (!node) return null;
            const isActive = id === activeId;
            const count = counts[id] ?? 0;
            const state = isActive ? "active" : count > 0 ? "visited" : "unvisited";
            return (
              <button
                key={id}
                type="button"
                className={`bp-node ${state}`}
                data-active={isActive}
                style={{ left: p.x - CARD_W / 2, top: p.y - CARD_H / 2 }}
                onClick={() => first[id] != null && onJump(first[id])}
                title={count > 0 ? `${node.title} — jump to first of ${count} visits` : node.title}
                aria-label={`${node.title}, ${node.sub}${isActive ? ", current step" : ""}, visited ${count} times`}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="bp-node-head">
                  <span className="bp-node-func">{node.title}</span>
                  <span className="bp-node-count">×{count}</span>
                </span>
                <span className="bp-node-path">{node.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
