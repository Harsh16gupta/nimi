import { useEffect, useMemo, useState } from "react";
import showcaseText from "../samples/showcase.jsonl?raw";
import { parseTrace, replay, turnTokens } from "./data/trace.js";
import Controls from "./components/Controls.jsx";
import FlowCanvas from "./components/FlowCanvas.jsx";
import Inspector from "./components/Inspector.jsx";

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
  const [sel, setSel] = useState(null); // flow node pinned in the inspector
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
      <header className="topbar">
        <span className="lights" aria-hidden="true"><i /><i /><i /></span>
        <strong>nimi — showcase</strong>
        <span className="task">{header.prompt}</span>
        <span className="chip">{header.provider} / {header.model}</span>
      </header>
      <main className="canvas-wrap">
        <FlowCanvas view={view} header={header} deltas={DELTAS} selKey={sel?.key} onSelect={setSel} query={query} />
      </main>
      {sel && (
        <Inspector view={view} parsed={parsed} sel={sel} output={pos.output} onClose={() => setSel(null)} />
      )}
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
    </>
  );
}
