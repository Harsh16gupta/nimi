// Interactive architecture & execution canvas.
// Supports dataflow (codebase call-graph) and streaming (chronological
// trace chain) lenses, with drag-to-pan, wheel-to-zoom, and node selection.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import {
  ARCH_EDGES,
  ARCH_NODES,
  ARCH_ZONES,
  SUBSYSTEMS,
} from "../../data/architecture.js";
import { buildFlow } from "../../data/flow.js";
import { getNodeColor, getEdgeColor } from "./canvasTheme.js";

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
    return {
      d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
      lx: x1 + 36,
      ly: my,
    };
  }

  if (tCx < fCx - 30) {
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

export default function Canvas({
  view,
  header,
  deltas,
  stepInfo,
  canvasMode,
  onCanvasModeChange,
  uiMode,
  pinnedNodeId,
  onSelectArchNode,
  selTraceId,
  onSelectTraceNode,
  readOnly = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [hoverGroup, setHoverGroup] = useState(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || readOnly) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((z) => Math.max(0.65, Math.min(1.75, Number((z + delta).toFixed(2)))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [readOnly]);

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

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const traceNodes = useMemo(() => buildFlow(view, header, deltas), [view, header, deltas]);

  const handlePointerDown = (e) => {
    if (e.target.closest("button") || e.target.closest(".nimi-canvas-node")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => setDragging(false);

  const resetFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const activeNodeId = pinnedNodeId ?? stepInfo.nodeId;
  const activeEdges = new Set(stepInfo.edgeIds ?? []);
  const secondaryNodes = new Set(stepInfo.secondaryNodes ?? []);

  return (
    <div
      ref={canvasRef}
      className={`nimi-canvas${dragging ? " is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {!readOnly && (
        <div className="nimi-canvas-float-tl">
          <SegmentedControl
            label="Canvas lens"
            value={canvasMode}
            onChange={onCanvasModeChange}
            size="sm"
          >
            <SegmentedControlItem value="dataflow" label="Dataflow" />
            <SegmentedControlItem value="streaming" label="Streaming" />
          </SegmentedControl>
          <Button label="Fit" size="sm" variant="secondary" onClick={resetFit} tooltip="Reset pan and zoom" />
          <Button
            label="+"
            size="sm"
            variant="secondary"
            onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.12).toFixed(2))))}
            tooltip="Zoom in"
          />
          <Button
            label="−"
            size="sm"
            variant="secondary"
            onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.12).toFixed(2))))}
            tooltip="Zoom out"
          />
          <Text type="label" color="secondary" className="nimi-mono">
            {Math.round(zoom * 100)}%
          </Text>
          {canvasMode === "dataflow" && (
            <Button
              label={showZones ? "Zones on" : "Zones off"}
              size="sm"
              variant="secondary"
              onClick={() => setShowZones((s) => !s)}
              tooltip="Toggle architectural subsystem frames"
            />
          )}
          {pinnedNodeId && (
            <Button
              label={`Unpin ${pinnedNodeId}`}
              size="sm"
              variant="secondary"
              onClick={() => onSelectArchNode(null)}
              tooltip="Resume following step playback"
            />
          )}
        </div>
      )}

      <div className="nimi-canvas-viewport">
        <div
          className="nimi-canvas-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          {canvasMode === "dataflow" ? (
            <DataflowSvg
              nodes={nodes}
              nodeMap={nodeMap}
              activeNodeId={activeNodeId}
              activeEdges={activeEdges}
              secondaryNodes={secondaryNodes}
              hoverGroup={hoverGroup}
              showZones={showZones}
              pinnedNodeId={pinnedNodeId}
              onSelectArchNode={onSelectArchNode}
              view={view}
              stepInfo={stepInfo}
            />
          ) : (
            <StreamingSvg
              traceNodes={traceNodes}
              selTraceId={selTraceId}
              onSelectTraceNode={onSelectTraceNode}
            />
          )}
        </div>
      </div>

      {!readOnly && (
        <>
          <div className="nimi-canvas-float-bl">
            {SUBSYSTEMS.map((s) => (
              <Button
                key={s.id}
                label={s.label}
                size="sm"
                variant="ghost"
                icon={<span className="nimi-canvas-legend-dot" style={{ background: getNodeColor(s.id) }} />}
                onClick={() => setHoverGroup((g) => (g === s.id ? null : s.id))}
                tooltip={`Highlight ${s.label} subsystem`}
              />
            ))}
          </div>
          <div className="nimi-canvas-float-br">
            <Text type="label" color="secondary" className="nimi-mono">
              drag pan · scroll zoom · ←/→ step · space play
            </Text>
          </div>
        </>
      )}
    </div>
  );
}

function DataflowSvg({
  nodes,
  nodeMap,
  activeNodeId,
  activeEdges,
  secondaryNodes,
  hoverGroup,
  showZones,
  pinnedNodeId,
  onSelectArchNode,
  view,
  stepInfo,
}) {
  const edgeColor = getEdgeColor(false);
  const edgeActiveColor = getEdgeColor(true);

  return (
    <svg
      viewBox="0 0 1585 510"
      className="nimi-canvas-svg"
      role="img"
      aria-label="Nimi codebase architecture and dataflow graph"
    >
      <defs>
        <marker id="nimi-arrow-dim" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path
            d="M0.5 1 L6 3.5 L0.5 6"
            fill="none"
            stroke={edgeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
        <marker id="nimi-arrow-hot" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path
            d="M0.5 1 L6 3.5 L0.5 6"
            fill="none"
            stroke={edgeActiveColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
        <filter id="nimi-node-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="var(--color-accent)" floodOpacity="0.28" />
        </filter>
      </defs>

      {showZones &&
        ARCH_ZONES.map((z) => (
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
              fill="var(--color-text-tertiary)"
            >
              {z.label}
            </text>
          </g>
        ))}

      {ARCH_EDGES.map((edge) => {
        const fromNode = nodeMap[edge.from];
        const toNode = nodeMap[edge.to];
        if (!fromNode || !toNode) return null;
        const { d, lx, ly } = computeEdgePoints(fromNode, toNode);
        const isHot =
          activeEdges.has(edge.id) ||
          (pinnedNodeId && (edge.from === pinnedNodeId || edge.to === pinnedNodeId));

        return (
          <g key={edge.id}>
            {isHot && (
              <path d={d} fill="none" stroke={edgeActiveColor} strokeWidth="4.5" strokeOpacity="0.12" />
            )}
            <path
              d={d}
              fill="none"
              stroke={isHot ? edgeActiveColor : edgeColor}
              strokeWidth={isHot ? "1.65" : "1.15"}
              markerEnd={isHot ? "url(#nimi-arrow-hot)" : "url(#nimi-arrow-dim)"}
            />
            {isHot && (
              <path
                d={d}
                fill="none"
                stroke="var(--color-text-accent)"
                strokeWidth="1.65"
                strokeDasharray="4 8"
                opacity="0.8"
              />
            )}
            {isHot && (
              <g transform={`translate(${lx}, ${ly})`}>
                <rect
                  x="-46"
                  y="-10"
                  width="92"
                  height="19"
                  rx="5"
                  fill="var(--nimi-panel-elevated)"
                  stroke="var(--color-border-accent)"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="var(--font-family-code)"
                  fill="var(--color-text-accent)"
                >
                  {edge.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {nodes.map((node) => {
        const isPrimary = node.id === activeNodeId;
        const isSecondary = !isPrimary && secondaryNodes.has(node.id);
        const groupColor = getNodeColor(node.group);
        const isDeniedNode = view.denied && node.id === "canUseTool" && stepInfo.shortPhase === "denied";
        const dimmedByHover = hoverGroup && node.group !== hoverGroup;

        let fill = "var(--nimi-graph-node)";
        let stroke = "var(--color-border-emphasized)";
        let titleFill = "var(--nimi-graph-text)";
        let subFill = "var(--nimi-graph-sub)";

        if (isSecondary) {
          fill = "var(--color-background-muted)";
          stroke = groupColor;
        }
        if (isPrimary) {
          fill = isDeniedNode ? "var(--nimi-amber-muted)" : "var(--nimi-graph-node-active)";
          stroke = isDeniedNode ? "var(--nimi-amber)" : groupColor;
          titleFill = "var(--color-text-primary)";
          subFill = isDeniedNode ? "var(--nimi-amber)" : "var(--color-text-secondary)";
        }

        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            className="nimi-canvas-node"
            onClick={() => onSelectArchNode(pinnedNodeId === node.id ? null : node.id)}
            opacity={dimmedByHover ? 0.25 : 1}
          >
            <rect
              width={node.w}
              height={node.h}
              rx="8"
              fill={fill}
              stroke={stroke}
              strokeWidth={isPrimary ? "1.6" : "1"}
              filter={isPrimary ? "url(#nimi-node-glow)" : undefined}
            />
            <rect
              x="0.5"
              y="8"
              width="2.5"
              height={node.h - 16}
              rx="1.25"
              fill={groupColor}
              opacity={isPrimary ? 1 : 0.72}
            />
            <text x="12" y="21" fontSize="12.5" fontWeight="600" fontFamily="var(--font-family-code)" fill={titleFill}>
              {node.title}
            </text>
            <text x="12" y="36" fontSize="10.5" fontFamily="var(--font-family-code)" fill={subFill}>
              {node.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StreamingSvg({ traceNodes, selTraceId, onSelectTraceNode }) {
  return (
    <svg
      viewBox="0 0 1540 360"
      className="nimi-canvas-svg"
      role="img"
      aria-label="Nimi streaming execution chain"
    >
      <defs>
        <marker id="nimi-s-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path
            d="M0.5 1 L6 3.5 L0.5 6"
            fill="none"
            stroke="var(--color-text-accent)"
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
        const isSel = n.id === selTraceId || n.IdShort === selTraceId || idx === traceNodes.length - 1;
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
                stroke="var(--color-border-accent)"
                strokeWidth="1.4"
                markerEnd="url(#nimi-s-arrow)"
              />
            )}
            <g
              transform={`translate(${x}, ${y})`}
              className="nimi-canvas-node"
              onClick={() => onSelectTraceNode(n)}
            >
              <rect
                width={w}
                height={h}
                rx="6"
                fill={isSel ? "var(--nimi-graph-node-active)" : "var(--nimi-graph-node)"}
                stroke={isSel ? "var(--color-accent)" : "var(--color-border-emphasized)"}
                strokeWidth={isSel ? "1.6" : "1"}
              />
              <text
                x="12"
                y="23"
                fontSize="11.5"
                fontWeight="600"
                fontFamily="var(--font-family-code)"
                fill="var(--nimi-graph-text)"
              >
                {n.title}
              </text>
              <text x="12" y="41" fontSize="10" fontFamily="var(--font-family-code)" fill="var(--nimi-graph-sub)">
                {n.sub}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
