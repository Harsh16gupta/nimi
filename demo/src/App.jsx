import { useEffect, useMemo, useState } from "react";
import showcaseText from "../samples/showcase.jsonl?raw";
import { parseTrace, replay, turnTokens } from "./data/trace.js";
import Controls from "./components/Controls.jsx";
import Timeline from "./components/Timeline.jsx";
import Minimap from "./components/Minimap.jsx";
import Inspector from "./components/Inspector.jsx";
import Terminal from "./components/Terminal.jsx";

const parsed = parseTrace(showcaseText);
const MAX = parsed.items.length - 1;
const DELTAS = turnTokens(parsed);
const SPEEDS = { "0.5×": 800, "1×": 400, "2×": 200, "4×": 100 };

// Hash carries the frame: #print/allow/12 (output/branch/index), so share
// links reopen the exact view. No hash opens the full run.
function readHash() {
  const [output, branch, index] = window.location.hash.slice(1).split("/");
  return {
    output: output === "classic" ? "classic" : "print",
    branch: branch === "deny" ? "deny" : "allow",
    index: Math.max(0, Math.min(MAX, Number(index ?? MAX) || 0)),
  };
}

export default function App() {
  const [pos, setPos] = useState(readHash);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1×");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(null); // timeline step pinned in the inspector
  const go = (index) => setPos((p) => ({ ...p, index: Math.max(0, Math.min(MAX, index)) }));

  useEffect(() => {
    const onHash = () => {
      setPos(readHash());
      setSel(null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // Replace (not push): scrubbing must not flood history.
  useEffect(() => {
    window.history.replaceState(null, "", `#${pos.output}/${pos.branch}/${pos.index}`);
  }, [pos]);

  useEffect(() => {
    if (!playing) return;
    if (pos.index >= MAX) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => go(pos.index + 1), SPEEDS[speed] ?? 400);
    return () => clearTimeout(t);
  }, [playing, pos.index, speed]);

  // Space plays, arrows scrub (ignored while typing in the filter box).
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

  const view = useMemo(() => replay(parsed, pos.index, { branch: pos.branch, output: pos.output }), [pos]);
  const { header } = parsed;

  return (
    <>
      <header className="top">
        <h1>nimi — showcase</h1>
        <p>
          <code>{header.prompt}</code> · {header.provider}/{header.model} · session {header.session}
        </p>
      </header>
      <Controls
        pos={pos}
        setPos={setPos}
        max={MAX}
        playing={playing}
        setPlaying={setPlaying}
        speed={speed}
        setSpeed={setSpeed}
        query={query}
        setQuery={setQuery}
      />
      <div className="layout">
        <Minimap parsed={parsed} view={view} index={pos.index} go={go} />
        <main>
          {view.truncated && (
            <div className="card">
              <p>
                <strong>Deny branch:</strong> the write was denied, so the model got an error result here. Later steps
                below belong to the recorded allow branch.
              </p>
            </div>
          )}
          <Timeline turns={view.turns} deltas={DELTAS} query={query} sel={sel} onSelect={setSel} />
          <Terminal blocks={view.blocks} output={pos.output} />
        </main>
        <Inspector view={view} parsed={parsed} sel={sel} />
      </div>
    </>
  );
}
