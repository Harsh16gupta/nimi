// Playground control row: transport, output lens, and replay permission branch.
// The branch control only switches the replay fold — it never touches a live
// machine. That limitation is stated in visible text, not just a tooltip.
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Icon } from "@astryxdesign/core/Icon";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";

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
    <div className="nimi-toolbar" role="toolbar" aria-label="Replay controls">
      <div className="nimi-toolbar-group" role="group" aria-label="Playback transport">
        <Text type="label" color="secondary" className="nimi-mono" aria-live="off">
          {pos.index + 1} / {max + 1}
        </Text>
        <IconButton
          label="Restart from step 1"
          icon={<Icon icon="chevronsLeft" />}
          variant="ghost"
          size="sm"
          onClick={() => onGo(0)}
          tooltip="Restart"
        />
        <IconButton
          label="Previous step"
          icon={<Icon icon="chevronLeft" />}
          variant="ghost"
          size="sm"
          onClick={() => onGo(pos.index - 1)}
          tooltip="Previous step (←)"
        />
        <Button
          label={playing ? "❚❚ Pause" : "▶ Play"}
          size="sm"
          variant="primary"
          onClick={onTogglePlay}
          tooltip="Play / pause (Space)"
        />
        <IconButton
          label="Next step"
          icon={<Icon icon="chevronRight" />}
          variant="ghost"
          size="sm"
          onClick={() => onGo(pos.index + 1)}
          tooltip="Next step (→)"
        />
      </div>

      <div className="nimi-toolbar-spacer" />

      <div className="nimi-toolbar-group nimi-toolbar-labeled">
        <Text type="label" color="secondary" className="nimi-toolbar-caption">
          Lens
        </Text>
        <SegmentedControl
          label="Output lens"
          value={pos.output}
          onChange={onOutputChange}
          size="sm"
        >
          <SegmentedControlItem value="print" label="Print" />
          <SegmentedControlItem value="tui" label="TUI" />
          <SegmentedControlItem value="classic" label="Classic" />
        </SegmentedControl>
      </div>

      <div className="nimi-toolbar-divider" />

      <div className="nimi-toolbar-group nimi-toolbar-labeled">
        <Text type="label" color="secondary" className="nimi-toolbar-caption">
          Replay branch
        </Text>
        <SegmentedControl
          label="Replay permission branch (simulated)"
          value={pos.branch}
          onChange={onBranchChange}
          size="sm"
        >
          <SegmentedControlItem value="allow" label="Allow" />
          <SegmentedControlItem value="deny" label="Deny" />
        </SegmentedControl>
      </div>

      <div className="nimi-toolbar-spacer" />

      <Text type="label" color="secondary" className="nimi-toolbar-note">
        Classic shortens previews · TUI marks the Ink node in the graph
      </Text>
    </div>
  );
}
