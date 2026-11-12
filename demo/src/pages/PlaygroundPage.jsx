// Playground: the centre-piece of Nimi Code.
// Workbench layout: run header, compact control row, graph + inspector,
// and a persistent timeline footer. The replay semantics (trace fold,
// allow/deny branches, URL state) are unchanged.
import { useEffect, useMemo, useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import Canvas from "../components/Canvas/Canvas.jsx";
import Inspector from "../components/Inspector/Inspector.jsx";
import Timeline from "../components/Timeline/Timeline.jsx";
import Toolbar from "../components/Toolbar/Toolbar.jsx";
import { replay, turnTokens, findDenyLimit } from "../data/trace.js";
import { describeStep } from "../data/architecture.js";
import { SAMPLE_RUNS, matchSample } from "../data/samples.js";

const SPEEDS = { "0.5x": 800, "1x": 380, "2x": 180 };

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
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
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

  const currentSample = matchSample(pos.output, pos.branch);
  const handleSampleChange = (id) => {
    const sample = SAMPLE_RUNS.find((s) => s.id === id);
    if (!sample) return;
    setPinnedNodeId(null);
    setSelTraceId(null);
    setPlaying(false);
    window.location.hash = `#/playground?output=${sample.output}&branch=${sample.branch}&index=0`;
  };

  return (
    <div className="nimi-playground">
      <div className="nimi-run-header ih-runband">
        <div className="ih-runband-identity">
          <div className="ih-runband-title-row">
            <span className="ih-sample-pill">SAMPLE REPLAY</span>
            <h1 className="ih-runband-title">{currentSample.title}</h1>
          </div>
          <p className="ih-runband-meta">
            {parsed.header.provider} / {parsed.header.model} · “{parsed.header.prompt}”
          </p>
          <p className="ih-runband-note">
            Bundled trace replay — Allow / Deny only switches the replay branch. Nothing here
            touches a live machine.
          </p>
        </div>
        <div className="ih-runband-picker">
          <label htmlFor="ih-sample-select">Sample run:</label>
          <select id="ih-sample-select" value={currentSample.id} onChange={(e) => handleSampleChange(e.target.value)}>
            {SAMPLE_RUNS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Toolbar
        pos={pos}
        max={max}
        playing={playing}
        onTogglePlay={togglePlay}
        onGo={go}
        onOutputChange={handleOutputChange}
        onBranchChange={handleBranchChange}
      />
      <div className="nimi-playground-body">
        <section className="nimi-playground-main" aria-label="Replay graph">
          <div className="nimi-workbench-heading">
            <Text type="label" weight="semibold">
              {canvasMode === "dataflow" ? "Architecture · dataflow" : "Execution · streaming"}
            </Text>
            <Text type="label" color="secondary">
              {canvasMode === "dataflow"
                ? "Where the current step runs in the codebase"
                : "Chronological chain of trace events"}
            </Text>
          </div>
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
              denyLimit={denyLimit}
              speed={speed}
              setSpeed={setSpeed}
              stepInfo={stepInfo}
              view={view}
            />
          </div>
        </section>
        <aside className="nimi-playground-sidebar" aria-label="Step inspector">
          <Inspector
            view={view}
            parsed={parsed}
            stepInfo={stepInfo}
            stepNum={pos.index + 1}
            totalSteps={max + 1}
            output={replayOutput}
            uiMode={pos.output}
            branch={pos.branch}
            pinnedNodeId={pinnedNodeId}
          />
        </aside>
      </div>
    </div>
  );
}
