// Playground: the centre-piece of Nimi Code.
// Blueprint workbench layout: unified header (title row + transport and
// scrubber row), full-width schematic/swimlane flowchart, bottom-docked
// inspector deck. Replay semantics (trace fold, allow/deny branches, URL
// state) are unchanged — only presentation was revamped.
import { useEffect, useMemo, useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import Canvas from "../components/Canvas/Canvas.jsx";
import Swimlane from "../components/Swimlane/Swimlane.jsx";
import Inspector from "../components/Inspector/Inspector.jsx";
import Timeline from "../components/Timeline/Timeline.jsx";
import Toolbar from "../components/Toolbar/Toolbar.jsx";
import "../styles/playground-blueprint.css";
import { replay, findDenyLimit } from "../data/trace.js";
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
  const [bpMode, setBpMode] = useState("schematic");
  const [zoom, setZoom] = useState(1);
  const [fitTick, setFitTick] = useState(0);

  const effectiveLimit = pos.branch === "deny" ? denyLimit : max;

  const go = (index) => {
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

  // Node flow up to the current step: visit counters, first-visit index
  // (click-to-jump), and the previous node for active-wire highlighting.
  const flow = useMemo(() => {
    const nodes = [];
    for (let k = 0; k <= pos.index; k++) {
      const v = replay(parsed, k, { branch: pos.branch, output: replayOutput });
      const info = describeStep(parsed, v, k, { output: replayOutput, branch: pos.branch });
      nodes.push(info?.nodeId ?? null);
    }
    const counts = {};
    const first = {};
    nodes.forEach((id, k) => {
      if (!id) return;
      counts[id] = (counts[id] ?? 0) + 1;
      if (!(id in first)) first[id] = k;
    });
    return { counts, first, prev: nodes[pos.index - 1] ?? null };
  }, [parsed, pos.index, pos.branch, replayOutput]);

  const turnN = useMemo(() => {
    for (const t of view.turns) {
      if (t.steps.some((s) => s.itemIndex === pos.index)) return t.n;
    }
    return 1;
  }, [view, pos.index]);

  const togglePlay = () => {
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
    setPlaying(false);
    window.location.hash = `#/playground?output=${sample.output}&branch=${sample.branch}&index=0`;
  };

  const zoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const zoomFit = () => {
    setZoom(1);
    setFitTick((t) => t + 1);
  };

  return (
    <div className="bp-playground">
      <div className="bp-workbench-header">
        <div className="bp-header-row-1">
          <div className="bp-title-area">
            <span className="bp-replay-badge">REPLAY</span>
            <h1 className="bp-run-title">{currentSample.title}</h1>
            <span className="bp-run-prompt">
              {parsed.header.provider} / {parsed.header.model} · “{parsed.header.prompt}”
            </span>
          </div>
          <div className="bp-header-controls">
            <select
              className="bp-run-select"
              value={currentSample.id}
              onChange={(e) => handleSampleChange(e.target.value)}
              aria-label="Sample run"
            >
              {SAMPLE_RUNS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <SegmentedControl label="Flowchart view" value={bpMode} onChange={setBpMode} size="sm">
              <SegmentedControlItem value="schematic" label="Schematic" />
              <SegmentedControlItem value="swimlane" label="Swimlane" />
            </SegmentedControl>
            <div className="bp-zoom-group" role="group" aria-label="Canvas zoom">
              <button type="button" onClick={zoomFit} title="Fit active node into view">
                Fit
              </button>
              <button type="button" onClick={zoomOut} title="Zoom out">
                -
              </button>
              <button type="button" onClick={() => setZoom(1)} title="Reset to 100%">
                {Math.round(zoom * 100)}%
              </button>
              <button type="button" onClick={zoomIn} title="Zoom in">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="bp-header-row-2">
          <Toolbar
            pos={pos}
            max={max}
            playing={playing}
            onTogglePlay={togglePlay}
            onGo={go}
            speed={speed}
            setSpeed={setSpeed}
          />
          <Timeline pos={pos} go={go} max={max} view={view} />
          <div className="bp-groups">
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <span className="bp-seg-label">Branch:</span>
              <SegmentedControl
                label="Replay permission branch (simulated)"
                value={pos.branch}
                onChange={handleBranchChange}
                size="sm"
              >
                <SegmentedControlItem value="allow" label="Allow" />
                <SegmentedControlItem value="deny" label="Deny" />
              </SegmentedControl>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <span className="bp-seg-label">Lens:</span>
              <SegmentedControl label="Output lens" value={pos.output} onChange={handleOutputChange} size="sm">
                <SegmentedControlItem value="print" label="Print" />
                <SegmentedControlItem value="tui" label="TUI" />
                <SegmentedControlItem value="classic" label="Classic" />
              </SegmentedControl>
            </div>
          </div>
        </div>
      </div>

      <div className="bp-viewport" aria-label={bpMode === "schematic" ? "Architecture flowchart" : "Execution swimlane"}>
        {bpMode === "schematic" ? (
          <Canvas
            stepInfo={stepInfo}
            pos={pos}
            counts={flow.counts}
            first={flow.first}
            prevNodeId={flow.prev}
            denied={Boolean(view.denied)}
            zoom={zoom}
            fitTick={fitTick}
            onJump={go}
          />
        ) : (
          <Swimlane
            parsed={parsed}
            max={max}
            pos={pos}
            go={go}
            output={replayOutput}
            branch={pos.branch}
          />
        )}
      </div>

      <Inspector
        view={view}
        parsed={parsed}
        stepInfo={stepInfo}
        stepNum={pos.index + 1}
        totalSteps={max + 1}
        output={replayOutput}
        branch={pos.branch}
        turnN={turnN}
      />
    </div>
  );
}
