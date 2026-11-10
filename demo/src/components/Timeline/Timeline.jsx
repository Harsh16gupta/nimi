// Playback timeline: turns, steps, speed, and run metadata.
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";

const SPEEDS = ["0.5x", "1x", "2x"];

export default function Timeline({ pos, go, max, speed, setSpeed, stepInfo, view }) {
  const done = max > 0 ? Math.round(((pos.index + 1) / (max + 1)) * 100) : 0;

  return (
    <div className="nimi-timeline">
      <div
        className="nimi-timeline-track"
        role="slider"
        aria-label="Execution timeline"
        aria-valuemin={1}
        aria-valuemax={max + 1}
        aria-valuenow={pos.index + 1}
      >
        {view.turns.map((turn) => (
          <div key={turn.n} className="nimi-timeline-turn">
            <span className="nimi-timeline-turn-label">Turn {turn.n}</span>
            <div className="nimi-timeline-blocks">
              {turn.steps.map((s) => {
                const idx = s.itemIndex ?? s.key;
                const isCurrent = idx === pos.index;
                const isPast = idx < pos.index;
                const isTruncated = pos.branch === "deny" && idx > 13;
                const isDenyGate = pos.branch === "deny" && idx === 13;
                let cls = "nimi-step-block";
                if (isCurrent) cls += " current";
                else if (isPast) cls += " past";
                if (isTruncated) cls += " truncated";
                if (isDenyGate) cls += " denied-gate";
                return (
                  <button
                    key={`${turn.n}-${s.key}`}
                    type="button"
                    className={cls}
                    onClick={() => go(idx)}
                    title={`Step ${idx + 1} of ${max + 1}`}
                    aria-label={`Jump to step ${idx + 1}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="nimi-timeline-meta">
        <SegmentedControl label="Playback speed" value={speed} onChange={setSpeed} size="sm">
          {SPEEDS.map((s) => (
            <SegmentedControlItem key={s} value={s} label={s} />
          ))}
        </SegmentedControl>
        <Text type="label" color="secondary" className="nimi-mono">
          {stepInfo?.shortPhase ?? "finish"} · {done}%
        </Text>
        <Text type="code" color="secondary" className="nimi-mono">
          {pos.index + 1}/{max + 1}
        </Text>
        {view?.truncated && (
          <Text type="label" color="warning" className="nimi-mono">
            truncated
          </Text>
        )}
      </div>
    </div>
  );
}
