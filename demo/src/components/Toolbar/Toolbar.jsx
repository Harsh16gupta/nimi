// Playback transport: step counter, first/prev/play/next/last, and a
// cycling speed button. Branch and lens live in the header row beside the
// scrubber; the branch only switches the replay fold, never a live machine.
const SPEEDS = ["0.5x", "1x", "2x"];

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function Toolbar({ pos, max, playing, onTogglePlay, onGo, speed, setSpeed }) {
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
  };

  return (
    <div className="bp-transport" role="toolbar" aria-label="Replay controls">
      <span className="bp-step-pill" aria-live="off">
        {pad(pos.index + 1)} / {pad(max + 1)}
      </span>
      <button type="button" className="bp-tbtn" title="First step" onClick={() => onGo(0)}>
        «
      </button>
      <button type="button" className="bp-tbtn" title="Previous step (←)" onClick={() => onGo(pos.index - 1)}>
        ‹
      </button>
      <button type="button" className="bp-tbtn bp-play" onClick={onTogglePlay} title="Play / pause (Space)">
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
      <button type="button" className="bp-tbtn" title="Next step (→)" onClick={() => onGo(pos.index + 1)}>
        ›
      </button>
      <button type="button" className="bp-tbtn" title="Last step" onClick={() => onGo(max)}>
        »
      </button>
      <button type="button" className="bp-tbtn bp-speed" title="Playback speed" onClick={cycleSpeed}>
        {speed}
      </button>
    </div>
  );
}
