import { Box, Text } from "ink";
import type { ReactNode } from "react";
import Spinner from "ink-spinner";

export type Row =
  | { kind: "boot"; id: number }
  | { kind: "user"; id: number; text: string }
  | { kind: "text"; id: number; text: string }
  | {
      kind: "tool";
      id: number;
      toolCallId: string;
      label: string;
      status: "running" | "ok" | "error";
      summary: string;
    };

export function ToolRow({ row }: { row: Extract<Row, { kind: "tool" }> }) {
  if (row.status === "running") {
    return (
      <Box>
        <Text dimColor>{"↳ "}</Text>
        <Spinner type="dots" />
        <Text dimColor> {row.label}</Text>
      </Box>
    );
  }
  const mark = row.status === "ok" ? "✓" : "✕";
  const color = row.status === "ok" ? "green" : "red";
  return (
    <Box>
      <Text dimColor>{"↳ "}</Text>
      <Text color={color}>{mark}</Text>
      <Text dimColor>
        {" "}
        {row.label} {row.summary}
      </Text>
    </Box>
  );
}

export function renderRow(row: Row): ReactNode {
  if (row.kind === "user") {
    return (
      <Box key={row.id} marginTop={1}>
        <Text bold>› </Text>
        <Text>{row.text}</Text>
      </Box>
    );
  }
  if (row.kind === "text") {
    return (
      <Box key={row.id} marginTop={1}>
        <Text wrap="wrap">{row.text}</Text>
      </Box>
    );
  }
  if (row.kind === "tool") {
    return (
      <Box key={row.id} marginTop={0}>
        <ToolRow row={row} />
      </Box>
    );
  }
  return null;
}
