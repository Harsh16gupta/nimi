// Eraser.io / Cogent-inspired interactive architecture & dataflow canvas.
// Supports smooth drag-to-pan, wheel-to-zoom, subsystem zone frames,
// animated dataflow packets along active edges, and both "dataflow"
// (codebase call-graph) and "streaming" (chronological trace chain) views.
import { useMemo, useRef, useState } from "react";
import {
  ARCH_EDGES,
  ARCH_NODES,
  ARCH_ZONES,
  SUBSYSTEMS,
  SUBSYSTEM_COLOR,
} from "../data/architecture.js";
import { buildFlow } from "../data/flow.js";

function computeEdgePoints(fromNode, toNode) {
  const fCx = fromNode.x + fromNode.w / 2;
  const fCy = fromNode.y + fromNode.h / 2;
  const tCx = toNode.x + toNode.w / 2;
  const tCy = toNode.y + toNode.h / 2;

  // Vertical connection in same column (e.g. runMode -> appendMessages, streamEvent -> assembleBlocks)
  if (Math.abs(fCx - tCx) < 40) {
    const down = tCy > fCy;
    const x1 = fCx;
    const y1 = down ? fromNode.y + fromNode.h : fromNode.y;
    const x2 = tCx;
    const y2 = down ? toNode.y : toNode.y + toNode.h;
    const my = (y1 + y2) / 2;
    return {
      d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
      lx: x1 + 36,
      ly: my,
    };
  }

  // Right-to-left return edge (e.g. streamEvent -> assembleBlocks, toolExecute -> runAgent, runMode -> terminal)
  if (tCx < fCx - 30) {
    // toolExecute -> runAgent feedback curve along bottom/middle
    if (fromNode.id === "toolExecute" && toNode.id === "runAgent") {
      const x1 = fromNode.x;
      const y1 = fCy;
      const x2 = toNode.x + toNode.w;
      const y2 = tCy + 10;
      return {
        d: `M ${x1} ${y1} C ${x1 - 240} ${y1 - 40}, ${x2 + 110} ${y2 + 65}, ${x2} ${y2}`,
        lx: (x1 + x2) / 2 - 40,
        ly: (y1 + y2) / 2 + 12,
      };
    }
    const x1 = fromNode.x;
    const y1 = fCy;
    const x2 = toNode.x + toNode.w;
    const y2 = tCy;
    const mx = (x1 + x2) / 2;
    return {
      d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
      lx: mx,
      ly: (y1 + y2) / 2 - 8,
    };
  }

  // Standard left-to-right cubic bezier
  const x1 = fromNode.x + fromNode.w;
  const y1 = fCy;
  const x2 = toNode.x;
  const y2 = tCy;
  const dx = Math.max(36, (x2 - x1) * 0.52);
  return {
    d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
    lx: (x1 + x2) / 2,
    ly: (y1 + y2) / 2 - 8,
  };
}

export default function FlowCanvas({
  view,
  header,
  deltas,
  stepInfo,
  canvasMode,
  uiMode,
  pinnedNodeId,
  onSelectArchNode,
  selTraceId,
  onSelectTraceNode,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [hoverGroup, setHoverGroup] = useState(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Adapt mode runner node title dynamically when user switches --print / TUI / classic
  const nodes = useMemo(() => {
    return ARCH_NODES.map((n) => {
      if (n.id !== "runMode") return n;
      if (uiMode === "tui") {
        return {
          ...n,
          title: "render(<App />)",
          sub: "src/tui/App.tsx · Ink",
          file: "src/main.tsx:164",
        };
      }
      if (uiMode === "classic") {
        return {
          ...n,
          title: "runClassic()",
          sub: "src/modes/classic.ts",
          file: "src/modes/classic.ts:20",
        };
      }
      return n;
    });
  }, [uiMode]);

  const nodeMap = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  // Count how many events in current fold hit each subsystem node
  const hitCounts = useMemo(() => {
    const counts = {
      shell: 1,
      main: 1,
      parseArgs: 1,
      loadSettings: 1,
      buildSystemPrompt: 1,
      createSession: 1,
      runMode: 1,
      getProvider: 1,
      getToolDefs: 1,
    };
    for (const { event } of view.events) {
      if (event.type === "agent_start") counts.runAgent = (counts.runAgent ?? 0) + 1;
      else if (event.type === "text_delta") {
        counts.providerStream = (counts.providerStream ?? 0) + 1;
        counts.modelApi = (counts.modelApi ?? 0) + 1;
        counts.streamEvent = (counts.streamEvent ?? 0) + 1;
        counts.terminal = (counts.terminal ?? 0) + 1;
      } else if (event.type === "turn_end") {
        counts.assembleBlocks = (counts.assembleBlocks ?? 0) + 1;
      } else if (event.type === "tool_start") {
        counts.getTool = (counts.getTool ?? 0) + 1;
        counts.canUseTool = (counts.canUseTool ?? 0) + 1;
      } else if (event.type === "tool_end") {
        counts.toolExecute = (counts.toolExecute ?? 0) + 1;
        counts.terminal = (counts.terminal ?? 0) + 1;
      } else if (event.type === "compacted") {
        counts.shouldCompact = (counts.shouldCompact ?? 0) + 1;
      } else if (event.type === "agent_end") {
        counts.appendMessages = 1;
      }
    }
    return counts;
  }, [view.events]);

  const traceNodes = useMemo(
    () => buildFlow(view, header, deltas),
    [view, header, deltas],
  );

  const handlePointerDown = (e) => {
    if (e.target.closest("button") || e.target.closest(".arch-node")) return;
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => setDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.max(0.65, Math.min(1.75, Number((z + delta).toFixed(2)))));
  };

  const resetFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const activeNodeId = pinnedNodeId ?? stepInfo.nodeId;
  const activeEdges = new Set(stepInfo.edgeIds ?? []);
  const secondaryNodes = new Set(stepInfo.secondaryNodes ?? []);

  return (
    <div
      className={`canvas-stage${dragging ? " is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Top-left floating zoom / fit HUD (Cogent + Eraser.io style) */}
      <div className="canvas-hud">
        <button type="button" className="hud-btn" onClick={resetFit} title="Reset pan and zoom">
          fit
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.12).toFixed(2))))}
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.12).toFixed(2))))}
          title="Zoom out"
        >
          −
        </button>
        <span className="hud-zoom-pct">{Math.round(zoom * 100)}%</span>
        {canvasMode === "dataflow" && (
          <button
            type="button"
            className={`hud-btn hud-toggle${showZones ? " on" : ""}`}
            onClick={() => setShowZones((s) => !s)}
            title="Toggle architectural subsystem frames"
          >
            zones
          </button>
        )}
        {pinnedNodeId && (
          <button
            type="button"
            className="hud-btn hud-unpin"
            onClick={() => onSelectArchNode(null)}
            title="Resume following step playback"
          >
            unpin ({pinnedNodeId}) ✕
          </button>
        )}
      </div>

      {/* Interactive pan/zoom viewport */}
      <div className="canvas-viewport">
        <div
          className="canvas-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          {canvasMode === "dataflow" ? (
            <svg
              viewBox="0 0 1585 510"
              className="arch-svg"
              role="img"
              aria-label="Nimi codebase architecture and dataflow graph"
            >
              <defs>
                <marker
                  id="arrow-dim"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path
                    d="M0.5 1 L6 3.5 L0.5 6"
                    fill="none"
                    stroke="#48443E"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
                <marker
                  id="arrow-hot"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path
                    d="M0.5 1 L6 3.5 L0.5 6"
                    fill="none"
                    stroke="#D97750"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
                <filter id="node-glow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="6"
                    floodColor="#D97750"
                    floodOpacity="0.32"
                  />
                </filter>
              </defs>

              {/* Eraser.io style subtle subsystem container zones */}
              {showZones &&
                ARCH_ZONES.map((z) => (
                  <g key={z.id} className="arch-zone">
                    <rect
                      x={z.x}
                      y={z.y}
                      width={z.w}
                      height={z.h}
                      rx="10"
                      fill="rgba(26, 25, 23, 0.36)"
                      stroke="#252320"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={z.x + 10}
                      y={z.y + 14}
                      fontSize="9"
                      fontFamily="var(--mono)"
                      letterSpacing="0.09em"
                      fill="#545049"
                    >
                      {z.label}
                    </text>
                  </g>
                ))}

              {/* Directed call-graph edges */}
              {ARCH_EDGES.map((edge) => {
                const fromNode = nodeMap[edge.from];
                const toNode = nodeMap[edge.to];
                if (!fromNode || !toNode) return null;
                const { d, lx, ly } = computeEdgePoints(fromNode, toNode);
                const isHot =
                  activeEdges.has(edge.id) ||
                  (pinnedNodeId && (edge.from === pinnedNodeId || edge.to === pinnedNodeId));

                return (
                  <g key={edge.id} className="arch-edge">
                    {isHot && (
                      <path
                        d={d}
                        fill="none"
                        stroke="#D97750"
                        strokeWidth="4.5"
                        strokeOpacity="0.14"
                      />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={isHot ? "#D97750" : "#3A3733"}
                      strokeWidth={isHot ? "1.65" : "1.15"}
                      markerEnd={isHot ? "url(#arrow-hot)" : "url(#arrow-dim)"}
                    />
                    {isHot && (
                      <path
                        d={d}
                        fill="none"
                        stroke="#F4B297"
                        strokeWidth="1.65"
                        strokeDasharray="4 10"
                        className="edge-packet-flow"
                      />
                    )}
                    {isHot && (
                      <g transform={`translate(${lx}, ${ly})`}>
                        <rect
                          x="-44"
                          y="-9"
                          width="88"
                          height="17"
                          rx="4"
                          fill="#181715"
                          stroke="#5A392B"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="2.5"
                          textAnchor="middle"
                          fontSize="9.5"
                          fontFamily="var(--mono)"
                          fill="#E59877"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Codebase architecture nodes */}
              {nodes.map((node) => {
                const isPrimary = node.id === activeNodeId;
                const isSecondary = !isPrimary && secondaryNodes.has(node.id);
                const groupColor = SUBSYSTEM_COLOR[node.group] ?? "#D97750";
                const hits = hitCounts[node.id] ?? 0;
                const isDeniedNode =
                  view.denied && node.id === "canUseTool" && stepInfo.shortPhase === "denied";
                const dimmedByHover = hoverGroup && node.group !== hoverGroup;

                let fill = "#1D1C1A";
                let stroke = "#32302B";
                let titleFill = "#ECE9E2";
                let subFill = "#7D776F";

                if (isSecondary) {
                  fill = "#231E1B";
                  stroke = "#6D4635";
                }
                if (isPrimary) {
                  fill = isDeniedNode ? "#2C1919" : "#2D201A";
                  stroke = isDeniedNode ? "#D96060" : "#D97750";
                  titleFill = "#FFFFFF";
                  subFill = isDeniedNode ? "#E89B9B" : "#D5A18A";
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className={`arch-node${isPrimary ? " is-active" : ""}`}
                    onClick={() =>
                      onSelectArchNode(pinnedNodeId === node.id ? null : node.id)
                    }
                    opacity={dimmedByHover ? 0.25 : 1}
                  >
                    <rect
                      width={node.w}
                      height={node.h}
                      rx="6"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isPrimary ? "1.6" : "1"}
                      filter={isPrimary ? "url(#node-glow)" : undefined}
                    />
                    {/* Subsystem left accent pill */}
                    <rect
                      x="0.5"
                      y="8"
                      width="2.5"
                      height={node.h - 16}
                      rx="1.25"
                      fill={groupColor}
                      opacity={isPrimary ? 1 : 0.72}
                    />
                    {/* Function / Module name */}
                    <text
                      x="11"
                      y="20"
                      fontSize="11.5"
                      fontWeight="600"
                      fontFamily="var(--mono)"
                      fill={titleFill}
                    >
                      {node.title}
                    </text>
                    {/* File path */}
                    <text
                      x="11"
                      y="35"
                      fontSize="9.8"
                      fontFamily="var(--mono)"
                      fill={subFill}
                    >
                      {node.sub}
                    </text>
                    {/* Call hit badge */}
                    {hits > 0 && (
                      <g transform={`translate(${node.w - 22}, 13)`}>
                        <rect
                          x="-10"
                          y="-7"
                          width="22"
                          height="14"
                          rx="3.5"
                          fill={isPrimary ? "rgba(217, 119, 80, 0.22)" : "#151413"}
                          stroke={isPrimary ? "#D97750" : "#2C2A26"}
                          strokeWidth="0.8"
                        />
                        <text
                          x="1"
                          y="3"
                          textAnchor="middle"
                          fontSize="8.5"
                          fontFamily="var(--mono)"
                          fill={isPrimary ? "#F2B094" : "#807A72"}
                        >
                          ×{hits}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          ) : (
            /* "streaming" view: chronological execution trace chain in the same compact card language */
            <svg
              viewBox="0 0 1540 360"
              className="arch-svg"
              role="img"
              aria-label="Nimi streaming execution chain"
            >
              <defs>
                <marker
                  id="s-arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path
                    d="M0.5 1 L6 3.5 L0.5 6"
                    fill="none"
                    stroke="#D97750"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              </defs>
              {traceNodes.map((n, idx) => {
                const col = idx % 6;
                const row = Math.floor(idx / 6);
                const x = 44 + col * 244;
                const y = 66 + row * 140;
                const w = 202;
                const h = 58;
                const isSel =
                  n.id === selTraceId ||
                  n.IdShort === selTraceId ||
                  idx === traceNodes.length - 1;
                const next = traceNodes[idx + 1];
                let edgePath = null;
                if (next) {
                  const nCol = (idx + 1) % 6;
                  const nRow = Math.floor((idx + 1) / 6);
                  const nx = 44 + nCol * 244;
                  const ny = 66 + nRow * 140;
                  if (nRow === row) {
                    edgePath = `M ${x + w} ${y + h / 2} L ${nx} ${ny + h / 2}`;
                  } else {
                    edgePath = `M ${x + w / 2} ${y + h} C ${x + w / 2} ${y + h + 44}, ${nx + w / 2} ${ny - 44}, ${nx + w / 2} ${ny}`;
                  }
                }
                return (
                  <g key={n.id}>
                    {edgePath && (
                      <path
                        d={edgePath}
                        fill="none"
                        stroke="#7E503D"
                        strokeWidth="1.4"
                        markerEnd="url(#s-arrow)"
                      />
                    )}
                    <g
                      transform={`translate(${x}, ${y})`}
                      className="arch-node"
                      onClick={() => onSelectTraceNode(n)}
                    >
                      <rect
                        width={w}
                        height={h}
                        rx="6"
                        fill={isSel ? "#2D201A" : "#1D1C1A"}
                        stroke={isSel ? "#D97750" : "#32302B"}
                        strokeWidth={isSel ? "1.6" : "1"}
                      />
                      <text
                        x="12"
                        y="23"
                        fontSize="11.5"
                        fontWeight="600"
                        fontFamily="var(--mono)"
                        fill="#ECE9E2"
                      >
                        {n.title}
                      </text>
                      <text
                        x="12"
                        y="41"
                        fontSize="10"
                        fontFamily="var(--mono)"
                        fill="#8E8980"
                      >
                        {n.sub}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Bottom canvas legend & keyboard/mouse hint bar */}
      <div className="canvas-footer-bar">
        <div className="subsystem-legend">
          {SUBSYSTEMS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`legend-chip${hoverGroup === s.id ? " active" : ""}`}
              onMouseEnter={() => setHoverGroup(s.id)}
              onMouseLeave={() => setHoverGroup(null)}
              onClick={() => setHoverGroup((g) => (g === s.id ? null : s.id))}
            >
              <i className="legend-swatch" style={{ background: s.color }} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="canvas-hints">
          drag to pan · scroll to zoom · ←/→ to step · space to play
        </div>
      </div>
    </div>
  );
}
