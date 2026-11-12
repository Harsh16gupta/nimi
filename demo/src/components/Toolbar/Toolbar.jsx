// Playground control row: transport, output lens, and replay permission branch.
// Mirrors the idea.html transport bar: step counter pill, « ‹ play › »,
// Lens pill group, replay-branch pill group, keyboard hint. The branch control
// only switches the replay fold — it never touches a live machine.
export default function Toolbar({
  pos,
  max,
  playing,
  onTogglePlay,
  onGo,
  onOutputChange,
  onBranchChange,
}) {
  return (
    <div className="nimi-toolbar ih-transport" role="toolbar" aria-label="Replay controls">
      <div className="ih-transport-stepper" role="group" aria-label="Playback transport">
        <span className="ih-step-counter" aria-live="off">
          {pos.index + 1} / {max + 1}
        </span>
        <button type="button" className="ih-step-btn" title="First step" onClick={() => onGo(0)}>
          «
        </button>
        <button type="button" className="ih-step-btn" title="Previous step (←)" onClick={() => onGo(pos.index - 1)}>
          ‹
        </button>
        <button
          type="button"
          className="ih-play-btn"
          onClick={onTogglePlay}
          title="Play / pause (Space)"
        >
          <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <button type="button" className="ih-step-btn" title="Next step (→)" onClick={() => onGo(pos.index + 1)}>
          ›
        </button>
        <button type="button" className="ih-step-btn" title="Last step" onClick={() => onGo(max)}>
          »
        </button>
      </div>

      <div className="ih-transport-groups">
        <div className="ih-pill-group" role="group" aria-label="Output lens">
          <span className="ih-pill-label">Lens:</span>
          {["print", "tui", "classic"].map((m) => (
            <button
              key={m}
              type="button"
              className={`ih-pill-btn${pos.output === m ? " is-active" : ""}`}
              aria-pressed={pos.output === m}
              onClick={() => onOutputChange(m)}
            >
              {m === "print" ? "Print" : m === "tui" ? "TUI" : "Classic"}
            </button>
          ))}
        </div>

        <div className="ih-pill-group" role="group" aria-label="Replay permission branch (simulated)">
          <span className="ih-pill-label">Replay branch:</span>
          <button
            type="button"
            className={`ih-pill-btn ih-pill-allow${pos.branch === "allow" ? " is-active" : ""}`}
            aria-pressed={pos.branch === "allow"}
            onClick={() => onBranchChange("allow")}
          >
            Allow
          </button>
          <button
            type="button"
            className={`ih-pill-btn ih-pill-deny${pos.branch === "deny" ? " is-active" : ""}`}
            aria-pressed={pos.branch === "deny"}
            onClick={() => onBranchChange("deny")}
          >
            Deny
          </button>
        </div>

        <span className="ih-transport-hint">Space plays · ←/→ step</span>
      </div>
    </div>
  );
}
