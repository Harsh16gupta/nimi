// Landing page: explains Nimi Code and routes into the sample replay.
// One H1, one copyable install command, one playground CTA, a framed product
// preview, three differentiators, a four-step workflow, and a compact footer.
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import HeroPreview from "../components/HeroPreview/HeroPreview.jsx";

const INSTALL_CMD = "npm install -g nimi-code";
const GITHUB_URL = "https://github.com/Harsh16gupta/nimi";
const NPM_URL = "https://www.npmjs.com/package/nimi-code";

export default function LandingPage() {
  return (
    <main className="nimi-landing">
      <Hero />
      <Preview />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Hero() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copyInstall = async () => {
    setCopyFailed(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(INSTALL_CMD);
      } else {
        throw new Error("no clipboard API");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback for contexts without async clipboard access.
      try {
        const area = document.createElement("textarea");
        area.value = INSTALL_CMD;
        area.setAttribute("readonly", "");
        area.style.position = "absolute";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (!ok) throw new Error("execCommand failed");
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopyFailed(true);
      }
    }
  };

  return (
    <section className="nimi-hero" aria-labelledby="nimi-hero-title">
      <div className="nimi-hero-bg" aria-hidden />
      <div className="nimi-hero-grid" aria-hidden />
      <div className="nimi-hero-content" pt-50>
        <span className="nimi-eyebrow">
          <Icon icon="check" size="xsm" />
          Open-source coding agent
        </span>
        <h1 className="nimi-headline" id="nimi-hero-title">
          A lightweight coding agent you can actually inspect.
        </h1>
        <p className="nimi-lead">
          Nimi is a minimal terminal harness: point it at your repo, give it a task, and it
          coordinates a model you configure with read, write, shell, and git tools. Every run is
          recorded as a JSONL trace you can replay. The browser playground below replays one bundled
          sample — no API key needed for the demo.
        </p>
        <div className="nimi-hero-actions">
          <Button
            label={copied ? "Copied!" : "Copy install command"}
            variant="primary"
            size="lg"
            endContent={<Icon icon="copy" size="sm" />}
            onClick={copyInstall}
          />
          <Button
            label="Open Playground"
            variant="secondary"
            size="lg"
            endContent={<Icon icon="arrowUp" size="sm" />}
            onClick={() => {
              window.location.hash = "#/playground";
            }}
          />
        </div>
        <p className="nimi-install-row">
          <code className="nimi-install-cmd">{INSTALL_CMD}</code>
          <button type="button" className="nimi-install-copy" onClick={copyInstall} title="Copy install command">
            <Icon icon="copy" size="xsm" />
            <span className="nimi-visually-hidden">Copy install command</span>
          </button>
        </p>
        {copyFailed && (
          <p className="nimi-install-fallback" role="status">
            Copy unavailable in this browser — select the command above manually.
          </p>
        )}
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section className="nimi-section nimi-preview-section" aria-labelledby="nimi-preview-title">
      <div className="nimi-section-header">
        <Heading level={2} className="nimi-section-title" id="nimi-preview-title">
          Watch a run unfold
        </Heading>
        <p className="nimi-section-lead">
          Replay a sample run — no API key needed for this demo. Scrub the trace, inspect tool
          calls, and see where the permission gate applies.
        </p>
      </div>
      <figure className="nimi-preview-frame">
        <figcaption className="nimi-preview-bar">
          <span className="nimi-preview-title">
            Sample replay · find all TODOs → NOTES.md
          </span>
          <a href="#/playground" className="nimi-preview-open">
            Open interactive replay <span aria-hidden>→</span>
          </a>
        </figcaption>
        <div className="nimi-hero-preview">
          <HeroPreview viewBox="600 190 960 300" legend={false} />
        </div>
        <figcaption className="nimi-preview-caption">
          Focused crop of the architecture graph — the full interactive map lives in the playground.
        </figcaption>
      </figure>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="nimi-cta-section" aria-labelledby="nimi-cta-title">
      <Heading level={2} className="nimi-section-title" id="nimi-cta-title" style={{ maxWidth: 560 }}>
        Try the replay, then run it yourself.
      </Heading>
      <p className="nimi-section-lead">
        The playground needs nothing but a browser. The CLI needs Node 22 and one provider key.
      </p>
      <div className="nimi-hero-actions">
        <Button
          label="Open Playground"
          variant="primary"
          size="lg"
          endContent={<Icon icon="arrowUp" size="sm" />}
          onClick={() => {
            window.location.hash = "#/playground";
          }}
        />
        <Button
          label="View source"
          variant="secondary"
          size="lg"
          endContent={<Icon icon="externalLink" size="sm" />}
          onClick={() => {
            window.open(GITHUB_URL, "_blank", "noreferrer");
          }}
        />
      </div>
      <p className="nimi-cta-links">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span aria-hidden>·</span>
        <a href={NPM_URL} target="_blank" rel="noreferrer">
          npm
        </a>
        <span aria-hidden>·</span>
        <code className="nimi-mono-inline">{INSTALL_CMD}</code>
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="nimi-footer">
      <img src="./nimi-logo-transparent.png" alt="Nimi" className="nimi-footer-logo" />
      <p className="nimi-footer-copy">© 2026 Nimi Code · ISC licensed</p>
      <nav className="nimi-footer-links" aria-label="Footer">
        <a href="#/">Home</a>
        <a href="#/playground">Playground</a>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={NPM_URL} target="_blank" rel="noreferrer">
          npm
        </a>
      </nav>
      <p className="nimi-footer-note">
        Demo playground replays a bundled sample trace; it is not a live agent run.
      </p>
    </footer>
  );
}
