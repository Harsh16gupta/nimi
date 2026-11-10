// Playground: the centre-piece of Nimi Code.
// Workbench layout: run header, compact control row, graph + inspector,
// and a persistent timeline footer. The replay semantics (trace fold,
// allow/deny branches, URL state) are unchanged.
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import Canvas from "../components/Canvas/Canvas.jsx";
import Inspector from "../components/Inspector/Inspector.jsx";
import Timeline from "../components/Timeline/Timeline.jsx";
import Toolbar from "../components/Toolbar/Toolbar.jsx";
import { replay, turnTokens } from "../data/trace.js";
import { describeStep } from "../data/architecture.js";
import { SAMPLE_RUNS, matchSample } from "../data/samples.js";

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
      <div className="nimi-run-header">
        <div className="nimi-run-identity">
          <div className="nimi-run-title-row">
            <Text type="body" weight="semibold" className="nimi-run-sample-name">
              {currentSample.title}
            </Text>
            <Badge label="Sample replay" tone="info" size="sm" />
          </div>
          <Text type="label" color="secondary" className="nimi-mono nimi-run-meta">
            {parsed.header.provider} / {parsed.header.model} · “{parsed.header.prompt}”
          </Text>
          <Text type="label" color="secondary" className="nimi-run-note">
            Bundled trace replay — Allow / Deny only switches the replay branch. Nothing here
            touches a live machine.
          </Text>
        </div>
        <div className="nimi-run-sample-picker">
          <Selector
            label="Sample run"
            value={currentSample.id}
            onChange={handleSampleChange}
            options={SAMPLE_RUNS.map((s) => ({ value: s.id, label: s.title }))}
            size="sm"
          />
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
