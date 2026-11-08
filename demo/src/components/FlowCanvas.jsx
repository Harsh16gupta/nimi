// Single-chain flow canvas: one left-to-right story, no turn lanes.
// Hand-built SVG (original icons, editorial restraint: 1px hairlines,
// one indigo accent, amber gate, green done, red denied). Click a node
// to open its payload; nodes outside the fold never render, so scrubbing
// grows the chain in place.
import { buildFlow } from "../data/flow.js";

const W = 118;
const H = 82;
const GAP = 48;
const TOP = 24;

const TILE = {
  user: ["#edf0f4", "#5b6b7c"],
  llm: ["#efedfe", "#6d5ef0"],
  tool: ["#eaf1fe", "#2f6fed"],
  result: ["#e9f7ef", "#16a34a"],
  gate: ["#fdf3e3", "#b45309"],
  compact: ["#f1ebfd", "#7c5cd6"],
  done: ["#e9f7ef", "#16a34a"],
};

function Glyph({ kind }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === "user") return <g {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6" /></g>;
  if (kind === "llm") return <g {...p}><path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z" /><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></g>;
  if (kind === "tool") return <g {...p}><circle cx="10.5" cy="10.5" r="5.8" /><path d="M15.2 15.2L20.5 20.5" /></g>;
  if (kind === "result") return <g {...p}><path d="M6 3.5h7.5L18 8v12.5H6z" /><path d="M13.5 3.5V8H18" /></g>;
  if (kind === "gate") return <g {...p}><path d="M12 3.5l6.5 2.6v5c0 4.6-3.2 7.4-6.5 8.4-3.3-1-6.5-3.8-6.5-8.4v-5z" /><path d="M9.2 11.8l2 2 3.6-3.8" /></g>;
  if (kind === "compact") return <g {...p}><rect x="2.5" y="9" width="5" height="6" rx="1" /><rect x="16.5" y="9" width="5" height="6" rx="1" /><path d="M9.5 12h5M12.8 10l2 2-2 2" /></g>;
  return <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.3 12.4l2.5 2.5 4.9-5.4" /></g>;
}

export default function FlowCanvas({ view, header, deltas, selKey, onSelect, query }) {
  const nodes = buildFlow(view, header, deltas);
  const q = query?.trim().toLowerCase();
  const width = nodes.length * (W + GAP) + GAP;
  const midY = TOP + H / 2;
  return (
    <div className="canvas-scroll">
      <svg width={width} height={TOP + H + 28} role="img" aria-label="agent run flow">
        <defs>
          <marker id="flow-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0L8 4L0 8" fill="none" stroke="#9db0a8" strokeWidth="1.4" />
          </marker>
        </defs>
        {nodes.slice(0, -1).map((n, i) => {
          const x1 = GAP + i * (W + GAP) + W;
          const x2 = GAP + (i + 1) * (W + GAP);
          const mx = (x1 + x2) / 2;
          return <path key={n.key} d={`M${x1} ${midY} C${mx} ${midY}, ${mx} ${midY}, ${x2} ${midY}`} fill="none" stroke="#9db0a8" strokeWidth="1.4" markerEnd="url(#flow-arr)" />;
        })}
        {nodes.map((n, i) => {
          const x = GAP + i * (W + GAP);
          const [tile, fg] = TILE[n.kind] ?? TILE.tool;
          const denied = n.kind === "gate" && n.denied;
          const ring = n.key === selKey ? "#6d5ef0" : denied ? "#b91c1c" : "#dfe5e1";
          const [bg, color] = denied ? ["#fdeaea", "#b91c1c"] : [tile, fg];
          const dimmed = q && !(n.title + " " + n.sub + " " + (n.text ?? "")).toLowerCase().includes(q);
          return (
            <g key={n.key} transform={`translate(${x},${TOP})`} className={`fnode${n.key === selKey ? " sel" : ""}`} onClick={() => onSelect(n)} opacity={dimmed ? 0.22 : 1}>
              <rect width={W} height={H} rx="14" fill="#fff" stroke={ring} strokeWidth={n.key === selKey || denied ? 2 : 1} />
              <rect x={(W - 30) / 2} y="8" width="30" height="30" rx="9" fill={bg} />
              <g transform="translate(49,13) scale(0.85)" style={{ color }}>
                <Glyph kind={n.kind} />
              </g>
              <text x={W / 2} y="56" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#17322c">{n.title}</text>
              <text x={W / 2} y="70" textAnchor="middle" fontSize="9.5" fontFamily="ui-monospace,monospace" fill="#5d746d">{n.sub}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
