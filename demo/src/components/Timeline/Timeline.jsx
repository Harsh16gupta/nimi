// Inline scrubber: turn tag plus a hairline track with fill, per-step
// ticks (cobalt divider where turns change), and click-to-seek.
import { useMemo } from "react";

export default function Timeline({ pos, go, max, view }) {
  const { turnOf, dividers } = useMemo(() => {
    const map = {};
    const divs = new Set();
    let prev = null;
    view.turns.forEach((t) => t.steps.forEach((s) => {
      map[s.itemIndex] = t.n;
      if (prev !== null && t.n !== prev) divs.add(s.itemIndex);
      prev = t.n;
    }));
    return { turnOf: map, dividers: divs };
  }, [view]);

  const pct = max > 0 ? Math.round(((pos.index + 1) / (max + 1)) * 100) : 0;

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    go(Math.round(ratio * max));
  };

  const ticks = [];
  for (let k = 0; k <= max; k++) ticks.push(k);

  return (
    <div className="bp-scrub">
      <span className="bp-turn-tag">Turn {turnOf[pos.index] ?? 1}</span>
      <div className="bp-track" onClick={seek} role="slider" aria-label="Replay scrubber" aria-valuemin={1} aria-valuemax={max + 1} aria-valuenow={pos.index + 1} tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowRight") go(pos.index + 1); else if (e.key === "ArrowLeft") go(pos.index - 1); }}>
        <div className="bp-track-line">
          <div className="bp-track-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="bp-ticks" aria-hidden>
          {ticks.map((k) => (
            <span key={k} className={`bp-tick${dividers.has(k) ? " div" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
