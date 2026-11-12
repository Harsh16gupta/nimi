// Landing page: faithful port of idea.html, cleaned to what exists.
// Same sections, same visual language (klein blue, serif headlines, mono
// labels, stippled 1-bit canvases, dark preview panels, monumental footer).
// Removed: Discord, docs/changelog links, fake install endpoints, fake sample
// options, "Nimi agent" wording — Nimi / Nimi Code / Nimi harness only.
import { useEffect, useRef, useState } from "react";
import "../styles/idea-landing.css";

const INSTALL_CMD = "npm install -g nimi-code";
const GITHUB_URL = "https://github.com/Harsh16gupta/nimi";
const NPM_URL = "https://www.npmjs.com/package/nimi-code";

function copyText(text) {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  return copyText(text);
}

export default function LandingPage() {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  return (
    <main className="ih-landing">
      <div className={`ih-toast${toast ? " is-visible" : ""}`} role="status" aria-live="polite">
        <span className="ih-toast-dot" aria-hidden />
        <span>{toast ?? "Copied to clipboard"}</span>
      </div>

      <Hero onCopy={showToast} />
      <Preview />
      <Features />
      <Faq />
      <FinalCta onCopy={showToast} />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero({ onCopy }) {
  const [tab, setTab] = useState("macos");
  const cmd = tab === "npx" ? "npx nimi-code@latest" : INSTALL_CMD;
  const canvasRef = useRef(null);
  const visualRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Precompute the stipple field once so animation is smooth, not static.
    const rand = (a) => (Math.random() - 0.5) * a;
    const rings = [150, 120, 80, 40].map((radius) => {
      const dots = [];
      const total = Math.floor(2 * Math.PI * radius * (radius > 100 ? 1.35 : 0.9));
      for (let i = 0; i < total; i++) {
        dots.push({ a: (i / total) * Math.PI * 2, r: radius + rand(2), jx: rand(1), jy: rand(1) });
      }
      return dots;
    });
    const ellipses = [
      { rx: 150, ry: 60, base: Math.PI / 4 },
      { rx: 150, ry: 60, base: -Math.PI / 4 },
      { rx: 150, ry: 30, base: 0 },
    ].map((e) => {
      const dots = [];
      const steps = 360;
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        dots.push({ t, ex: e.rx * Math.cos(t), ey: e.ry * Math.sin(t), jx: rand(1.5), jy: rand(1.5) });
      }
      return { ...e, dots };
    });

    const draw = (mx, my) => {
      // Cursor parallax + gyroscope tilt; eases back to rest off-cursor.
      const cx = W / 2 + mx * 16;
      const cy = H / 2 + my * 12;
      const spin = mx * 0.35;
      ctx.fillStyle = "#0300EB";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFFFFF";
      for (const dots of rings) {
        for (const d of dots) {
          const a = d.a + spin;
          ctx.fillRect(cx + Math.cos(a) * d.r + d.jx, cy + Math.sin(a) * d.r + d.jy, 1.2, 1.2);
        }
      }
      const tilts = [Math.PI / 4 + my * 0.55, -Math.PI / 4 + mx * 0.4, my * 0.3];
      ellipses.forEach((e, i) => {
        const tilt = e.base + (tilts[i] - e.base) * 0.9 + spin * 0.35;
        const cos = Math.cos(tilt);
        const sin = Math.sin(tilt);
        for (const d of e.dots) {
          ctx.fillRect(cx + d.ex * cos - d.ey * sin + d.jx, cy + d.ex * sin + d.ey * cos + d.jy, 1.2, 1.2);
        }
      });
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let x = 20; x < W - 20; x += 4) {
        if ((x * 7919) % 10 > 2) ctx.fillRect(x + mx * 8, cy, 1, 1);
        if ((x * 4799) % 10 > 2) ctx.fillRect(cx, x + my * 6, 1, 1);
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(0, 0);
      return undefined;
    }
    let raf = 0;
    const frame = () => {
      const m = mouse.current;
      m.x += (m.tx - m.x) * 0.07;
      m.y += (m.ty - m.y) * 0.07;
      draw(m.x, m.y);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onVisualMove = (e) => {
    const el = visualRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mouse.current.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    mouse.current.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const onVisualLeave = () => {
    mouse.current.tx = 0;
    mouse.current.ty = 0;
  };

  const doCopy = (text, msg) => {
    copyToClipboard(text).then((ok) => onCopy(ok ? msg : "Copy failed — select the command manually"));
  };

  return (
    <section className="ih-hero" aria-labelledby="ih-hero-title">
      <div className="ih-hero-grid">
        <div className="ih-hero-copy">
          <span className="ih-kicker">
            <span className="ih-kicker-dot" aria-hidden />
            00 // OPEN-SOURCE CODING HARNESS
          </span>
          <h1 className="ih-hero-title" id="ih-hero-title">
            A lightweight coding harness you can actually inspect.
          </h1>
          <p className="ih-hero-lead">
            Nimi Code is a minimal terminal harness: point it at your repo, give it a task, and it
            coordinates a model you configure with read, write, shell, and git tools. Every run is
            recorded as a JSONL trace you can replay. The browser playground below replays one
            bundled sample — no API key needed for the demo.
          </p>
          <div className="ih-hero-actions">
            <button
              type="button"
              className="ih-btn-solid"
              onClick={() => doCopy(INSTALL_CMD, `Copied "${INSTALL_CMD}" to clipboard!`)}
            >
              COPY INSTALL COMMAND
            </button>
            <a className="ih-btn-outline" href="#/playground">
              OPEN PLAYGROUND ↑
            </a>
          </div>
          <div className="ih-term" role="group" aria-label="Quickstart">
            <div className="ih-term-bar">
              <span className="ih-term-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="ih-term-name">quickstart.sh</span>
              <span className="ih-term-tabs" role="tablist" aria-label="Install method">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "macos"}
                  className={tab === "macos" ? "is-active" : ""}
                  onClick={() => setTab("macos")}
                >
                  MACOS / LINUX
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "npx"}
                  className={tab === "npx" ? "is-active" : ""}
                  onClick={() => setTab("npx")}
                >
                  NPX
                </button>
              </span>
            </div>
            <div className="ih-term-cmd">
              <span className="ih-term-prompt">$</span>
              <code>{cmd}</code>
              <button
                type="button"
                className="ih-term-copy"
                title="Copy command"
                onClick={() => doCopy(cmd, `Copied "${cmd}" to clipboard!`)}
              >
                COPY
              </button>
            </div>
          </div>
        </div>

        <div className="ih-hero-visual" ref={visualRef} onMouseMove={onVisualMove} onMouseLeave={onVisualLeave}>
          <div className="ih-fig">
            <canvas ref={canvasRef} width={380} height={380} aria-label="Stippled diagram of the deterministic harness loop" />
            <div className="ih-fig-cap">
              <span>FIG 0.1 — DETERMINISTIC HARNESS LOOP</span>
              <span>1-BIT DITHER</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- architecture preview */

function Preview() {
  return (
    <section className="ih-preview" aria-label="Sample replay preview">
      <div className="ih-preview-bar">
        <span className="ih-preview-bar-title">
          <span className="ih-blue-dot" aria-hidden />
          SAMPLE REPLAY · FIND ALL TODOS → NOTES.MD
        </span>
        <a href="#/playground" className="ih-preview-open">
          OPEN INTERACTIVE REPLAY →
        </a>
      </div>
      <div className="ih-preview-dark">
        <div className="ih-preview-cards">
          <div className="ih-pcard ih-pcard-loop">
            <p className="ih-pcard-kicker">01 / GENERATOR LOOP</p>
            <h3>runAgent()</h3>
            <p className="ih-pcard-file">src/agent.ts</p>
            <p className="ih-pcard-snippet">decide by blocks · agent.ts · toolCalls[]</p>
            <p className="ih-pcard-live">
              <span className="ih-ping" aria-hidden />
              ACTIVE REPLAY STEP #04
            </p>
          </div>
          <div className="ih-pcard ih-pcard-provider">
            <p className="ih-pcard-kicker">02 / PROVIDER STREAM</p>
            <h3>getProvider()</h3>
            <p className="ih-pcard-file">src/providers/openai-compat.ts</p>
            <p className="ih-pcard-snippet">OpenAI-compatible · chat.completions.create</p>
            <p className="ih-pcard-dim">StreamEvent text_delta · toolCall · done</p>
          </div>
          <div className="ih-pcard ih-pcard-gate">
            <p className="ih-pcard-kicker">03 / PERMISSION GATE</p>
            <h3>canUseTool()</h3>
            <p className="ih-pcard-file">src/permissions.ts</p>
            <p className="ih-pcard-snippet">tool.execute() fs · ripgrep · git spawn</p>
            <p className="ih-pcard-gate-state">GATE STATE: ALLOWED</p>
          </div>
        </div>
        <p className="ih-preview-caption">
          Focused crop of the architecture graph — the full interactive map lives in the playground.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- features */

const FEATURES = [
  {
    n: "#01 GENERATOR LOOP",
    title: "Deterministic Control Loop",
    body: "The run executes inside an explicit runAgent() generator context, avoiding unbounded recursion or unpredictable state mutations.",
    foot: "SRC/AGENT.TS · BLOCK DECISION ENGINE",
  },
  {
    n: "#02 PROVIDER STREAM",
    title: "OpenAI-Compatible Providers",
    body: "Plug in OpenAI-compatible endpoints, the Anthropic adapter, or local runners with unified streaming token & tool-call handling.",
    foot: "SRC/PROVIDERS/OPENAI-COMPAT.TS · UNIFIED STREAM",
  },
  {
    n: "#03 PERMISSION GATE",
    title: "Strict canUseTool() Policy",
    body: "Shell commands and filesystem writes are intercepted before execution. Allow or deny branches record cleanly to the trace.",
    foot: "SRC/PERMISSIONS.TS · ZERO ESCAPE GATES",
  },
  {
    n: "#04 JSONL REPLAY",
    title: "Transparent Trace Logs",
    body: "Every prompt chunk, model decision, tool request, and stdout line is appended to an immutable single JSONL trace stream.",
    foot: "--TRACE <PATH> · FULL AUDIT",
  },
  {
    n: "#05 MINIMAL HARNESS",
    title: "Zero Bloat Codebase",
    body: "A minimal, readable harness. Easy to read end to end, extend, embed, or wire into your own scripts.",
    foot: "NO HEAVY FRAMEWORKS",
  },
  {
    n: "#06 ZERO-KEY SANDBOX",
    title: "Browser Playground Demo",
    body: "Test and inspect trace stepping right inside your browser with the bundled trace — no API keys or installation needed.",
    foot: "IN-BROWSER TRACE STEPPER",
  },
];

function FeatureCard({ f, index }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const w = c.width;
    const h = c.height;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0300EB";
    const i = index + 1;
    const total = 120 + i * 20;
    for (let d = 0; d < total; d++) {
      let x;
      let y;
      if (i === 1) {
        const a = d * 0.15;
        const r = d * 0.18;
        x = w / 2 + Math.cos(a) * r;
        y = h / 2 + Math.sin(a) * r;
      } else if (i === 2) {
        x = (d * 3) % w;
        y = Math.sin(d * 0.2) * 15 + h / 2;
      } else if (i === 3) {
        x = (d * 7) % w;
        y = (d * 3) % h;
      } else {
        x = (d % 10) * 5 + 5;
        y = Math.floor(d / 10) * 5 + 5;
      }
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }, [index]);

  return (
    <article className="ih-feature">
      <div className="ih-feature-top">
        <span className="ih-feature-num">{f.n}</span>
        <canvas ref={ref} width={50} height={50} className="ih-feature-canvas" aria-hidden />
      </div>
      <h3>{f.title}</h3>
      <p>{f.body}</p>
      <p className="ih-feature-foot">{f.foot}</p>
    </article>
  );
}

function Features() {
  return (
    <section className="ih-features" aria-labelledby="ih-features-title">
      <div className="ih-features-head">
        <div>
          <p className="ih-section-kicker">SYSTEM ARCHITECTURE</p>
          <h2 id="ih-features-title">Features &amp; Engineering Guarantees</h2>
        </div>
        <p className="ih-features-note">
          Built for predictability: explicit control flow, gated tools, and replayable state.
        </p>
      </div>
      <div className="ih-features-grid">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.n} f={f} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ faq */

const FAQS = [
  {
    q: "How does Nimi Code record and replay JSONL traces?",
    a: "Every run appends its messages to .nimi/sessions/<id>.jsonl so --session can resume it later. Pass --trace <path> in print mode to additionally record the full event stream — system prompt, token deltas, tool requests, approvals, stdout — as JSONL lines. The playground reads that same event format to step through history.",
  },
  {
    q: "How does canUseTool() gate shell and filesystem access?",
    a: "Before any mutating tool runs, Nimi Code calls canUseTool() with the tool name and proposed arguments. Read-only tools skip the gate entirely; everything else prompts [y]es / [a]lways / [n]o unless --yolo is set. The decision is recorded in the trace either way.",
  },
  {
    q: "Which provider models can I use?",
    a: "Six built-ins: Anthropic (also via an OpenAI-compatible endpoint), OpenAI, Groq, DeepSeek, and Meta — run nimi --help for the list. Add a key with the /login flow in the TUI or export the provider's key (e.g. META_API_KEY); each provider has a default model such as muse-spark-1.3-contributor.",
  },
  {
    q: "What are the system requirements for local operation?",
    a: "Nimi Code requires Node.js v22.0.0 or higher. Install with npm install -g nimi-code and run nimi inside any repository directory.",
  },
];

function Faq() {
  const [open, setOpen] = useState(-1);
  return (
    <section className="ih-faq" aria-labelledby="ih-faq-title">
      <div className="ih-faq-head">
        <div>
          <p className="ih-section-kicker">QUESTIONS &amp; ANSWERS</p>
          <h2 id="ih-faq-title">Frequently Asked Questions</h2>
        </div>
      </div>
      <div className="ih-faq-list">
        {FAQS.map((f, i) => (
          <div key={f.q} className="ih-faq-item">
            <button
              type="button"
              className="ih-faq-q"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <span>{f.q}</span>
              <span className="ih-faq-icon" aria-hidden>
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && <p className="ih-faq-a">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ cta/footer */

function FinalCta({ onCopy }) {
  return (
    <section className="ih-cta" aria-labelledby="ih-cta-title">
      <h2 id="ih-cta-title">Try the replay, then run it yourself.</h2>
      <p>The playground needs nothing but a browser. The CLI needs Node 22 and one provider key.</p>
      <div className="ih-cta-actions">
        <a className="ih-btn-solid ih-btn-blue" href="#/playground">
          OPEN PLAYGROUND ↑
        </a>
        <a className="ih-btn-outline ih-btn-outline-blue" href={GITHUB_URL} target="_blank" rel="noreferrer">
          VIEW SOURCE ↗
        </a>
      </div>
      <p className="ih-cta-links">
        <button
          type="button"
          className="ih-cta-copy"
          onClick={() =>
            copyToClipboard(INSTALL_CMD).then((ok) =>
              onCopy(ok ? `Copied "${INSTALL_CMD}" to clipboard!` : "Copy failed — select the command manually"),
            )
          }
        >
          GitHub · npm · {INSTALL_CMD}
        </button>
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ih-footer">
      <span className="ih-watermark" aria-hidden>
        NIMI
      </span>
      <div className="ih-footer-grid">
        <div>
          <h4>HARNESS</h4>
          <ul>
            <li>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                Source code
              </a>
            </li>
            <li>
              <a href={NPM_URL} target="_blank" rel="noreferrer">
                npm package
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4>PLAYGROUND</h4>
          <ul>
            <li>
              <a href="#/playground">Sample replay</a>
            </li>
            <li>
              <a href="#/playground?output=print&branch=deny&index=0">Denied-branch replay</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>RESOURCES</h4>
          <ul>
            <li>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub Repository ↗
              </a>
            </li>
            <li>
              <a href={NPM_URL} target="_blank" rel="noreferrer">
                npm Package ↗
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4>LICENSE</h4>
          <p>
            Nimi Code is open-source software licensed under the ISC License. Free to use, modify,
            and distribute.
          </p>
        </div>
      </div>
      <div className="ih-footer-base">
        <span>© 2026 Nimi Code · ISC licensed</span>
        <span>Demo playground replays a bundled sample trace; it is not a live run.</span>
      </div>
    </footer>
  );
}
