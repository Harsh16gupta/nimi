// Static hero preview of the Nimi architecture graph.
// Lighter than the full Canvas so the landing page renders reliably.
import {
  ARCH_EDGES,
  ARCH_NODES,
  ARCH_ZONES,
  SUBSYSTEMS,
} from "../../data/architecture.js";
import { getNodeColor } from "../Canvas/canvasTheme.js";

function computeEdgePoints(fromNode, toNode) {
  const fCx = fromNode.x + fromNode.w / 2;
  const fCy = fromNode.y + fromNode.h / 2;
  const tCx = toNode.x + toNode.w / 2;
  const tCy = toNode.y + toNode.h / 2;

  if (Math.abs(fCx - tCx) < 40) {
    const down = tCy > fCy;
    const x1 = fCx;
    const y1 = down ? fromNode.y + fromNode.h : fromNode.y;
    const x2 = tCx;
    const y2 = down ? toNode.y : toNode.y + toNode.h;
    const my = (y1 + y2) / 2;
    return { d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}` };
  }

  if (tCx < fCx - 30) {
    if (fromNode.id === "toolExecute" && toNode.id === "runAgent") {
      const x1 = fromNode.x;
      const y1 = fCy;
      const x2 = toNode.x + toNode.w;
      const y2 = tCy + 10;
      return { d: `M ${x1} ${y1} C ${x1 - 240} ${y1 - 40}, ${x2 + 110} ${y2 + 65}, ${x2} ${y2}` };
    }
    const x1 = fromNode.x;
    const y1 = fCy;
    const x2 = toNode.x + toNode.w;
    const y2 = tCy;
    const mx = (x1 + x2) / 2;
    return { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` };
  }

  const x1 = fromNode.x + fromNode.w;
  const y1 = fCy;
  const x2 = toNode.x;
  const y2 = tCy;
  const dx = Math.max(36, (x2 - x1) * 0.52);
  return { d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}` };
}

export default function HeroPreview({ viewBox = "0 0 1585 510", legend = true }) {
  const nodeMap = Object.fromEntries(ARCH_NODES.map((n) => [n.id, n]));
  const activeEdges = new Set([
    "e-mode-agent",
    "e-agent-prov",
    "e-prov-stream",
    "e-stream-api",
    "e-api-event",
  ]);
  const activeNodes = new Set(["runAgent", "getProvider", "providerStream", "modelApi", "streamEvent"]);

  return (
    <div className="nimi-hero-preview-inner">
      <svg viewBox={viewBox} className="nimi-canvas-svg" role="img" aria-label="Nimi architecture preview">
        <defs>
          <marker id="hp-arrow-dim" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path
              d="M0.5 1 L6 3.5 L0.5 6"
              fill="none"
              stroke="var(--nimi-graph-edge)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
          <marker id="hp-arrow-hot" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path
              d="M0.5 1 L6 3.5 L0.5 6"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {ARCH_ZONES.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="10"
              fill="var(--nimi-graph-zone)"
              stroke="var(--nimi-graph-zone-border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={z.x + 10}
              y={z.y + 14}
              fontSize="9"
              fontFamily="var(--font-family-code)"
              letterSpacing="0.09em"
              fill="var(--color-text-secondary)"
            >
              {z.label}
            </text>
          </g>
        ))}

        {ARCH_EDGES.map((edge) => {
          const fromNode = nodeMap[edge.from];
          const toNode = nodeMap[edge.to];
          if (!fromNode || !toNode) return null;
          const { d } = computeEdgePoints(fromNode, toNode);
          const isHot = activeEdges.has(edge.id);
          return (
            <path
              key={edge.id}
              d={d}
              fill="none"
              stroke={isHot ? "var(--color-accent)" : "var(--nimi-graph-edge)"}
              strokeWidth={isHot ? "1.65" : "1.15"}
              markerEnd={isHot ? "url(#hp-arrow-hot)" : "url(#hp-arrow-dim)"}
            />
          );
        })}

        {ARCH_NODES.map((node) => {
          const isActive = activeNodes.has(node.id);
          const groupColor = getNodeColor(node.group);
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                width={node.w}
                height={node.h}
                rx="8"
                fill={isActive ? "var(--nimi-graph-node-active)" : "var(--nimi-graph-node)"}
                stroke={isActive ? groupColor : "var(--color-border-emphasized)"}
                strokeWidth={isActive ? "1.6" : "1"}
              />
              <rect
                x="0.5"
                y="8"
                width="2.5"
                height={node.h - 16}
                rx="1.25"
                fill={groupColor}
                opacity={isActive ? 1 : 0.72}
              />
              <text
                x="12"
                y="21"
                fontSize="12.5"
                fontWeight="600"
                fontFamily="var(--font-family-code)"
                fill={isActive ? "var(--color-text-primary)" : "var(--nimi-graph-text)"}
              >
                {node.title}
              </text>
              <text x="12" y="36" fontSize="10.5" fontFamily="var(--font-family-code)" fill="var(--nimi-graph-sub)">
                {node.sub}
              </text>
            </g>
          );
        })}
      </svg>

      {legend && (
        <div className="nimi-preview-legend">
          {SUBSYSTEMS.map((s) => (
            <span key={s.id} className="nimi-preview-legend-chip">
              <span className="nimi-canvas-legend-dot" style={{ background: getNodeColor(s.id) }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
