// Play/step/speed/output/branch/search in one bar. All state lives in
// App (and the hash); this bar only calls back.
const SPEEDS = ["0.5×", "1×", "2×", "4×"];

export default function Controls({ pos, setPos, max, playing, setPlaying, speed, setSpeed, query, setQuery }) {
  const go = (index) => setPos((p) => ({ ...p, index: Math.max(0, Math.min(max, index)) }));
  const flip = (key, a, b) => setPos((p) => ({ ...p, [key]: p[key] === a ? b : a }));
  return (
    <div className="controls">
      <button onClick={() => go(0)} title="First step">|◀</button>
      <button onClick={() => go(pos.index - 1)} title="Back (←)">◀</button>
      <button onClick={() => setPlaying((p) => !p)} title="Play/pause (space)">{playing ? "❚❚" : "▶"}</button>
      <button onClick={() => go(pos.index + 1)} title="Forward (→)">▶</button>
      <button onClick={() => go(max)} title="Last step">▶|</button>
      <select value={speed} onChange={(e) => setSpeed(e.target.value)} title="Play speed">
        {SPEEDS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button onClick={() => flip("output", "print", "classic")} aria-pressed={pos.output === "classic"} title="Terminal style">
        {pos.output}
      </button>
      <button onClick={() => flip("branch", "allow", "deny")} aria-pressed={pos.branch === "deny"} title="What if the write was denied?">
        {pos.branch}
      </button>
      <input type="search" placeholder="filter steps…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <span className="pos">{pos.index}/{max}</span>
    </div>
  );
}
