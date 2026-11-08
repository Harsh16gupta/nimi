import { useEffect, useMemo, useState } from "react";
import showcaseText from "../samples/showcase.jsonl?raw";
import { parseTrace, replay, turnTokens } from "./data/trace.js";
import { describeStep } from "./data/architecture.js";
import Controls from "./components/Controls.jsx";
import FlowCanvas from "./components/FlowCanvas.jsx";
import Inspector from "./components/Inspector.jsx";

const parsed = parseTrace(showcaseText);
const MAX = parsed.items.length - 1;
const DELTAS = turnTokens(parsed);
const SPEEDS = { "0.5x": 800, "1x": 380, "2x": 180 };

function readHash() {
  const [output, branch, index] = window.location.hash.slice(1).split("/");
  return {
    output: output === "classic" ? "classic" : output === "tui" ? "tui" : "print",
    branch: branch === "deny" ? "deny" : "allow",
    index: Math.max(
      0,
      Math.min(MAX, index !== undefined && index !== "" ? Number(index) : MAX),
    ),
  };
}

function shortModel(model) {
  if (!model) return "muse-spark";
  return model.replace(/-\d.*$/, "");
}

export default function App() {
  const [pos, setPos] = useState(readHash);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1x");
  const [canvasMode, setCanvasMode] = useState("dataflow");
  const [pinnedNodeId, setPinnedNodeId] = useState(null);
  const [selTraceId, setSelTraceId] = useState(null);

  const effectiveLimit = pos.branch === "deny" ? 13 : MAX;

  const go = (index) => {
    setPinnedNodeId(null);
    setPos((p) => ({
      ...p,
      index: Math.max(0, Math.min( MAX, index)),
    }));
  };

  useEffect(() => {
    const onHash = () => setPos(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `#${pos.output}/${pos.branch}/${pos.index}`,
    );
  }, [pos]);

  useEffect(() => {
    if (!playing) return;
    if (pos.index >= effectiveLimit) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => go(pos.index + 1), SPEEDS[speed] ?? 380);
    return () => clearTimeout(t);
  }, [playing, pos.index, speed, effectiveLimit]);

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
    () =>
      replay(parsed, pos.index, {
        branch: pos.branch,
        output: replayOutput,
      }),
    [pos.index, pos.branch, replayOutput],
  );

  const stepInfo = useMemo(
    () =>
      describeStep(parsed, view, pos.index, {
        output: replayOutput,
        branch: pos.branch,
      }),
    [view, pos.index, replayOutput, pos.branch],
  );

  const { header } = parsed;

  const togglePlay = () => {
    setPinnedNodeId(null);
    if (!playing && pos.index >= effectiveLimit) {
      setPos((p) => ({ ...p, index: 0 }));
    }
    setPlaying((p) => !p);
  };

  return (
    <div className="studio-shell">
      {/* Top header bar */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-name">nimi</span>
          <span className="brand-trail">
            dataflow · main() → runAgent() → {header.provider}.stream() → tools → your terminal
          </span>
        </div>

        <div className="topbar-right">
          {/* View mode switch: dataflow vs streaming */}
          <div className="seg-group" role="group" aria-label="Canvas lens">
            <button
              type="button"
              className={`seg-btn${canvasMode === "dataflow" ? " active" : ""}`}
              onClick={() => setCanvasMode("dataflow")}
            >
              dataflow
            </button>
            <button
              type="button"
              className={`seg-btn${canvasMode === "streaming" ? " active" : ""}`}
              onClick={() => setCanvasMode("streaming")}
            >
              streaming
            </button>
          </div>

          <span className="ctrl-label">mode</span>
          <div className="seg-group" role="group" aria-label="Execution mode">
            <button
              type="button"
              className={`seg-btn${pos.output === "print" ? " active" : ""}`}
              onClick={() => setPos((p) => ({ ...p, output: "print" }))}
            >
              --print
            </button>
            <button
              type="button"
              className={`seg-btn${pos.output === "tui" ? " active" : ""}`}
              onClick={() => setPos((p) => ({ ...p, output: "tui" }))}
            >
              TUI
            </button>
            <button
              type="button"
              className={`seg-btn${pos.output === "classic" ? " active" : ""}`}
              onClick={() => setPos((p) => ({ ...p, output: "classic" }))}
            >
              classic
            </button>
          </div>

          <span className="ctrl-label">Write permission</span>
          <div className="seg-group" role="group" aria-label="Write permission gate">
            <button
              type="button"
              className={`seg-btn${pos.branch === "allow" ? " active" : ""}`}
              onClick={() => setPos((p) => ({ ...p, branch: "allow", index: MAX }))}
            >
              allow
            </button>
            <button
              type="button"
              className={`seg-btn${pos.branch === "deny" ? " active deny" : ""}`}
              onClick={() => setPos((p) => ({ ...p, branch: "deny", index: 13 }))}
            >
              deny
            </button>
          </div>

          <span className="ctrl-label">provider</span>
          <span className="provider-readout" title={`${header.provider} / ${header.model}`}>
            {header.provider} / {shortModel(header.model)}
          </span>
        </div>
      </header>

      {/* Main split workspace: Left (Canvas + Bottom Scrubber) | Right (Full-height Inspector) */}
      <div className="studio-body">
        <div className="left-column">
          <FlowCanvas
            view={view}
            header={header}
            deltas={DELTAS}
            stepInfo={stepInfo}
            canvasMode={canvasMode}
            uiMode={pos.output}
            pinnedNodeId={pinnedNodeId}
            onSelectArchNode={setPinnedNodeId}
            selTraceId={selTraceId}
            onSelectTraceNode={(n) => setSelTraceId(n.id)}
          />

          <Controls
            pos={pos}
            setPos={(updater) => {
              setPinnedNodeId(null);
              setPos(updater);
            }}
            max={MAX}
            playing={playing}
            setPlaying={togglePlay}
            speed={speed}
            setSpeed={setSpeed}
            stepInfo={stepInfo}
            truncatedAt={pos.branch === "deny" ? 13 : null}
          />
        </div>

        <Inspector
          view={view}
          parsed={parsed}
          stepInfo={stepInfo}
          stepNum={pos.index + 1}
          totalSteps={MAX + 1}
          output={replayOutput}
          pinnedNodeId={pinnedNodeId}
        />
      </div>
    </div>
  );
}
