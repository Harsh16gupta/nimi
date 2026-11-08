// Bottom playback & discrete step-block scrubber bar (Cogent + Eraser.io style).
const SPEEDS = ["0.5x", "1x", "2x"];

export default function Controls({
  pos,
  setPos,
  max,
  playing,
  setPlaying,
  speed,
  setSpeed,
  stepInfo,
  truncatedAt,
}) {
  const go = (index) =>
    setPos((p) => ({ ...p, index: Math.max(0, Math.min(max, Number(index))) }));

  return (
    <div className="playback-bar" role="region" aria-label="Execution playback controls">
      <div className="transport-btns">
        <button
          type="button"
          className="t-btn"
          onClick={() => go(0)}
          title="Restart from step 1"
        >
          ↺
        </button>
        <button
          type="button"
          className="t-btn"
          onClick={() => go(pos.index - 1)}
          title="Previous step (←)"
        >
          ◀
        </button>
        <button
          type="button"
          className="t-btn t-play"
          onClick={setPlaying}
          title="Play / Pause (Space)"
        >
          {playing ? "❚❚ pause" : "▶ play"}
        </button>
        <button
          type="button"
          className="t-btn"
          onClick={() => go(pos.index + 1)}
          title="Next step (→)"
        >
          ▶
        </button>
      </div>

      <div className="speed-group" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`speed-btn${speed === s ? " active" : ""}`}
            onClick={() => setSpeed(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="step-blocks-track" role="slider" aria-valuemin={1} aria-valuemax={max + 1} aria-valuenow={pos.index + 1}>
        {Array.from({ length: max + 1 }).map((_, idx) => {
          const isCurrent = idx === pos.index;
          const isPast = idx < pos.index;
          const isTruncated = truncatedAt !== null && idx > truncatedAt;
          const isDenyGate = truncatedAt !== null && idx === truncatedAt;
          let cls = "step-block";
          if (isCurrent) cls += " current";
          else if (isPast) cls += " past";
          if (isTruncated) cls += " truncated";
          if (isDenyGate) cls += " denied-gate";

          return (
            <button
              key={idx}
              type="button"
              className={cls}
              onClick={() => go(idx)}
              title={`Step ${idx + 1} of ${max + 1}`}
              aria-label={`Jump to step ${idx + 1}`}
            />
          );
        })}
      </div>

      <span className="phase-readout">{stepInfo?.shortPhase ?? "finish"}</span>
    </div>
  );
}
