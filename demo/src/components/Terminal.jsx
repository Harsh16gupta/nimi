// Terminal replay pane for the Inspector "stdout" tab.
function lines(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.kind === "text") out.push(b.text);
    else if (b.kind === "tool") out.push(`\n[tool] ${b.name} ${JSON.stringify(b.input)}`);
    else if (b.kind === "note" && b.text) out.push(`\n${b.text}`);
    else if (b.kind === "result") out.push(`[result] ${b.name}${b.isError ? " (error)" : ""}:\n${b.text}`);
  }
  return out.join("\n");
}

export default function Terminal({ blocks, output }) {
  return (
    <>
      <div className="data-header">
        <span>
          <strong className="data-tag">STDOUT</strong>{" "}
          {output.toUpperCase()} MODE REPLAY
        </span>
      </div>
      <pre className="code-viewer">{blocks.length > 0 ? lines(blocks) : "(no output yet — press ▶ play)"}</pre>
    </>
  );
}
