// Static SVG export of the Nimi architecture map for the README.
// Same node/edge/zone data as the website playground (demo/src/data/...),
// rendered without interaction or replay state. Two variants: dark (for
// GitHub dark mode) and light (for GitHub light mode).
import { ARCH_NODES, ARCH_EDGES, ARCH_ZONES } from "../demo/src/data/architecture.js";
import { writeFileSync, mkdirSync } from "node:fs";

const GROUP_COLORS = {
  entry: "#8B5CF6",
  config: "#3B82F6",
  loop: "#2563EB",
  provider: "#7C3AED",
  tools: "#16A34A",
  permissions: "#D97706",
  renderer: "#0EA5E9",
  session: "#059669",
};

const PALETTES = {
  dark: {
    node: "#17171A", nodeStroke: "#3F3F46",
    text: "#E2E8F0", sub: "#94A3B8",
    edge: "#52525B", zone: "#131316", zoneStroke: "#2A2A2E", zoneText: "#9CA0A8",
  },
  light: {
    node: "#FFFFFF", nodeStroke: "#CBD5E1",
    text: "#1E293B", sub: "#64748B",
    edge: "#94A3B8", zone: "#F8FAFC", zoneStroke: "#E2E8F0", zoneText: "#64748B",
  },
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Same edge routing as the website canvas.
function edgePath(a, b) {
  const fCx = a.x + a.w / 2, fCy = a.y + a.h / 2;
  const tCx = b.x + b.w / 2, tCy = b.y + b.h / 2;
  if (Math.abs(fCx - tCx) < 40) {
    const down = tCy > fCy;
    const x1 = fCx, y1 = down ? a.y + a.h : a.y;
    const x2 = tCx, y2 = down ? b.y : b.y + b.h;
    const my = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  }
  if (tCx < fCx - 30) {
    if (a.id === "toolExecute" && b.id === "runAgent") {
      const x1 = a.x, y1 = fCy, x2 = b.x + b.w, y2 = tCy + 10;
      return `M ${x1} ${y1} C ${x1 - 240} ${y1 - 40}, ${x2 + 110} ${y2 + 65}, ${x2} ${y2}`;
    }
    const x1 = a.x, y1 = fCy, x2 = b.x + b.w, y2 = tCy;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }
  const x1 = a.x + a.w, y1 = fCy, x2 = b.x, y2 = tCy;
  const dx = Math.max(36, (x2 - x1) * 0.52);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function render(variant) {
  const p = PALETTES[variant];
  const nodes = Object.fromEntries(ARCH_NODES.map((n) => [n.id, n]));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1585 510" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" role="img" aria-label="Nimi architecture map">\n`;
  s += `<defs><marker id="arr-${variant}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0.5 1 L6 3.5 L0.5 6" fill="none" stroke="${p.edge}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>\n`;
  for (const z of ARCH_ZONES) {
    s += `<g><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10" fill="${p.zone}" stroke="${p.zoneStroke}" stroke-width="1" stroke-dasharray="4 4"/><text x="${z.x + 10}" y="${z.y + 14}" font-size="9" letter-spacing="0.09em" fill="${p.zoneText}">${esc(z.label)}</text></g>\n`;
  }
  for (const e of ARCH_EDGES) {
    const a = nodes[e.from], b = nodes[e.to];
    if (!a || !b) continue;
    s += `<path d="${edgePath(a, b)}" fill="none" stroke="${p.edge}" stroke-width="1.15" marker-end="url(#arr-${variant})"/>\n`;
  }
  for (const n of ARCH_NODES) {
    const c = GROUP_COLORS[n.group] ?? p.edge;
    s += `<g transform="translate(${n.x}, ${n.y})"><rect width="${n.w}" height="${n.h}" rx="8" fill="${p.node}" stroke="${p.nodeStroke}" stroke-width="1"/><rect x="0.5" y="8" width="2.5" height="${n.h - 16}" rx="1.25" fill="${c}"/><text x="12" y="21" font-size="12.5" font-weight="600" fill="${p.text}">${esc(n.title)}</text><text x="12" y="36" font-size="10.5" fill="${p.sub}">${esc(n.sub)}</text></g>\n`;
  }
  return s + `</svg>\n`;
}

mkdirSync("docs/assets", { recursive: true });
writeFileSync("docs/assets/architecture-dark.svg", render("dark"));
writeFileSync("docs/assets/architecture-light.svg", render("light"));
console.log("wrote docs/assets/architecture-{dark,light}.svg");
