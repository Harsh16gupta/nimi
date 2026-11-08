// Print/classic output replay, mirroring src/main.tsx and
// src/modes/classic.ts formatting from the same folded events.
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
    <section className="card">
      <div className="kv">terminal · {output} mode</div>
      <pre className="term">{blocks.length > 0 ? lines(blocks) : "(no output yet — press ▶)"}</pre>
    </section>
  );
}
