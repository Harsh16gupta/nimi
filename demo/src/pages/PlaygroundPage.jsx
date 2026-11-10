// Playground: the centre-piece of Nimi Code.
// Canvas-first layout with an inspector sidebar and a playback timeline.
import { useEffect, useMemo, useState } from "react";
import Canvas from "../components/Canvas/Canvas.jsx";
import Inspector from "../components/Inspector/Inspector.jsx";
import Timeline from "../components/Timeline/Timeline.jsx";
import Toolbar from "../components/Toolbar/Toolbar.jsx";
import { replay, turnTokens } from "../data/trace.js";
import { describeStep } from "../data/architecture.js";

const SPEEDS = { "0.5x": 800, "1x": 380, "2x": 180 };

function findDenyLimit(parsed) {
  for (let i = 0; i < parsed.items.length; i++) {
    const { obj } = parsed.items[i];
    if (obj.type === "event" && obj.event.type === "tool_end") {
      // write is the only gated tool in the showcase trace
      if (obj.event.name === "write") return i;
    }
  }
  return parsed.items.length - 1;
}

function readParams() {
  const hash = window.location.hash.slice(1);
  const queryIdx = hash.indexOf("?");
  const params = queryIdx > -1 ? new URLSearchParams(hash.slice(queryIdx + 1)) : new URLSearchParams();
  const indexRaw = params.get("index");
  return {
    output: params.get("output") === "classic" ? "classic" : params.get("output") === "tui" ? "tui" : "print",
    branch: params.get("branch") === "deny" ? "deny" : "allow",
    index: Number.isFinite(Number(indexRaw)) ? Math.max(0, Number(indexRaw)) : undefined,
  };
}

function writeParams(pos) {
  const base = "#/playground";
  const params = new URLSearchParams();
  params.set("output", pos.output);
  params.set("branch", pos.branch);
  params.set("index", String(pos.index));
  return `${base}?${params.toString()}`;
}

export default function PlaygroundPage({ parsed }) {
  const max = parsed.items.length - 1;
  const denyLimit = findDenyLimit(parsed);
  const initial = readParams();
  const defaultIndex = initial.branch === "deny" ? denyLimit : max;
  const [pos, setPos] = useState({
    output: initial.output,
    branch: initial.branch,
    index: initial.index ?? defaultIndex,
  });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1x");
  const [canvasMode, setCanvasMode] = useState("dataflow");
  const [pinnedNodeId, setPinnedNodeId] = useState(null);
  const [selTraceId, setSelTraceId] = useState(null);

  const effectiveLimit = pos.branch === "deny" ? denyLimit : max;
  const deltas = useMemo(() => turnTokens(parsed), [parsed]);

  const go = (index) => {
    setPinnedNodeId(null);
    setPos((p) => ({
      ...p,
      index: Math.max(0, Math.min(max, index)),
    }));
  };

  useEffect(() => {
    const onHash = () => {
      const next = readParams();
      setPos((p) => ({
        output: next.output ?? p.output,
        branch: next.branch ?? p.branch,
        index: next.index ?? p.index,
      }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [max]);

  useEffect(() => {
    window.history.replaceState(null, "", writeParams(pos));
  }, [pos]);

  useEffect(() => {
    if (!playing) return;
    if (pos.index >= effectiveLimit) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => go(pos.index + 1), SPEEDS[speed] ?? 380);
    return () => clearTimeout(t);
  }, [playing, pos.index, speed, effectiveLimit, max]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") go(pos.index + 1);
      else if (e.key === "ArrowLeft") go(pos.index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pos.index]);

  const replayOutput = pos.output === "classic" ? "classic" : "print";
  const view = useMemo(
    () => replay(parsed, pos.index, { branch: pos.branch, output: replayOutput }),
    [parsed, pos.index, pos.branch, replayOutput],
  );

  const stepInfo = useMemo(
    () => describeStep(parsed, view, pos.index, { output: replayOutput, branch: pos.branch }),
    [parsed, view, pos.index, replayOutput, pos.branch],
  );

  const togglePlay = () => {
    setPinnedNodeId(null);
    if (!playing && pos.index >= effectiveLimit) {
      setPos((p) => ({ ...p, index: 0 }));
    }
    setPlaying((p) => !p);
  };

  const handleOutputChange = (v) => setPos((p) => ({ ...p, output: v }));
  const handleBranchChange = (v) =>
    setPos((p) =>
      v === "allow" ? { ...p, branch: "allow", index: max } : { ...p, branch: "deny", index: denyLimit },
    );

  return (
    <div className="nimi-playground">
      <Toolbar
        pos={pos}
        max={max}
        playing={playing}
        onTogglePlay={togglePlay}
        onGo={go}
        onOutputChange={handleOutputChange}
        onBranchChange={handleBranchChange}
        header={parsed.header}
      />
      <div className="nimi-playground-body">
        <div className="nimi-playground-main">
          <div className="nimi-playground-canvas">
            <Canvas
              view={view}
              header={parsed.header}
              deltas={deltas}
              stepInfo={stepInfo}
              canvasMode={canvasMode}
              onCanvasModeChange={setCanvasMode}
              uiMode={pos.output}
              pinnedNodeId={pinnedNodeId}
              onSelectArchNode={setPinnedNodeId}
              selTraceId={selTraceId}
              onSelectTraceNode={(n) => setSelTraceId(n.id)}
            />
          </div>
          <div className="nimi-playground-footer">
            <Timeline
              pos={pos}
              go={go}
              max={max}
              speed={speed}
              setSpeed={setSpeed}
              stepInfo={stepInfo}
              view={view}
            />
          </div>
        </div>
        <div className="nimi-playground-sidebar">
          <Inspector
            view={view}
            parsed={parsed}
            stepInfo={stepInfo}
            stepNum={pos.index + 1}
            totalSteps={max + 1}
            output={replayOutput}
            branch={pos.branch}
            pinnedNodeId={pinnedNodeId}
            onPlay={togglePlay}
          />
        </div>
      </div>
    </div>
  );
}
