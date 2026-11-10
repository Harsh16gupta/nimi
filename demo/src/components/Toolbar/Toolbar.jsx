// Playground toolbar: transport controls, execution mode, write permission.
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
  header,
}) {
  function shortModel(model) {
    if (!model) return "muse-spark";
    return model.replace(/-\d.*$/, "");
  }

  return (
    <div className="nimi-toolbar" role="toolbar" aria-label="Execution controls">
      <div className="nimi-toolbar-group">
        <Text type="label" color="secondary" className="nimi-mono">
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

      <div className="nimi-toolbar-group">
        <SegmentedControl
          label="Execution mode"
          value={pos.output}
          onChange={onOutputChange}
          size="sm"
        >
          <SegmentedControlItem value="print" label="Print" />
          <SegmentedControlItem value="tui" label="TUI" />
          <SegmentedControlItem value="classic" label="Classic" />
        </SegmentedControl>
        <div className="nimi-toolbar-divider" />
        <SegmentedControl
          label="Write permission"
          value={pos.branch}
          onChange={onBranchChange}
          size="sm"
        >
          <SegmentedControlItem value="allow" label="Allow" />
          <SegmentedControlItem value="deny" label="Deny" />
        </SegmentedControl>
      </div>

      <div className="nimi-toolbar-spacer" />

      <div className="nimi-toolbar-group">
        <Text type="code" color="secondary" title={`${header.provider} / ${header.model}`}>
          {header.provider} / {shortModel(header.model)}
        </Text>
        <Text type="label" color="secondary" className="nimi-mono">
          ←/→ step · space play
        </Text>
      </div>
    </div>
  );
}
