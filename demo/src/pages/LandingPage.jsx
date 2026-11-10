// Landing page: explains Nimi Code and routes into the product.
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import HeroPreview from "../components/HeroPreview/HeroPreview.jsx";

export default function LandingPage() {
  return (
    <main className="nimi-landing">
      <Hero />
      <Preview />
      <HowItWorks />
      <Capabilities />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="nimi-hero">
      <div className="nimi-hero-bg" />
      <div className="nimi-hero-grid" />
      <div className="nimi-hero-content">
        <span className="nimi-eyebrow">
          <Icon icon="check" size="xsm" color="success" />
          Open-source coding agent
        </span>
        <h1 className="nimi-headline">
          See exactly what your
          <br />
          coding agent is doing
        </h1>
        <p className="nimi-lead">
          Nimi Code is a minimal terminal coding agent that reads, reasons, and acts on your files, shell,
          and git. The web playground visualizes every step of an execution so you can understand,
          debug, and trust the loop.
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
            label="Explore Examples"
            variant="secondary"
            size="lg"
            onClick={() => {
              window.location.hash = "#/examples";
            }}
          />
        </div>
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section className="nimi-section" style={{ paddingTop: 0 }}>
      <div className="nimi-hero-preview">
        <HeroPreview />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="nimi-section" style={{ background: "var(--color-background-muted)" }}>
      <div className="nimi-section-header">
        <Heading level={2} className="nimi-section-title">
          How it works
        </Heading>
        <p className="nimi-section-lead">
          Nimi runs a read-act loop: it streams a language model, decides what to do, calls tools, and
          repeats until the task is done.
        </p>
      </div>
      <div className="nimi-steps">
        <Step
          title="Prompt"
          body="Give Nimi a task in plain language. It parses flags, loads settings, and builds a system prompt with your tool catalog."
        />
        <Step
          title="Stream"
          body="The model streams back text and tool calls. Every token and decision is recorded into a replayable JSONL trace."
        />
        <Step
          title="Act"
          body="Nimi dispatches read-only tools automatically and asks before write, bash, or git mutations."
        />
        <Step
          title="Inspect"
          body="Open the trace in the playground to scrub through every turn, inspect context, source, and stdout."
        />
      </div>
    </section>
  );
}

function Step({ title, body }) {
  return (
    <div className="nimi-step">
      <p className="nimi-step-title">{title}</p>
      <p className="nimi-step-body">{body}</p>
    </div>
  );
}

function Capabilities() {
  return (
    <section className="nimi-section">
      <div className="nimi-section-header">
        <Heading level={2} className="nimi-section-title">
          Built for clarity
        </Heading>
        <p className="nimi-section-lead">
          The playground turns a dense execution trace into a readable, interactive map.
        </p>
      </div>
      <div className="nimi-features">
        <Feature
          icon="viewColumns"
          title="Interactive architecture graph"
          body="Pan and zoom through the actual codebase graph. See which function is active, what called it, and where data flows."
        />
        <Feature
          icon="clock"
          title="Turn-by-turn playback"
          body="Scrub forwards and backwards through the agent loop at your own speed, or press play and watch the run unfold."
        />
        <Feature
          icon="wrench"
          title="Tool call transparency"
          body="Every grep, read, write, and bash call is visible—along with its input, output, and permission decision."
        />
        <Feature
          icon="copy"
          title="Context inspection"
          body="Inspect the full message history, JSONL payload, source code, and stdout for any point in the run."
        />
        <Feature
          icon="warning"
          title="Permission simulation"
          body="Switch between Allow and Deny branches to see how the permission gate shapes the execution."
        />
        <Feature
          icon="arrowsUpDown"
          title="Multiple render modes"
          body="Switch between Print, Classic REPL, and TUI views to understand how the same run surfaces in each interface."
        />
      </div>
    </section>
  );
}

function Feature({ icon, title, body }) {
  return (
    <div className="nimi-feature">
      <span className="nimi-feature-icon">
        <Icon icon={icon} size="sm" />
      </span>
      <p className="nimi-feature-title">{title}</p>
      <p className="nimi-feature-body">{body}</p>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="nimi-cta-section" style={{ background: "var(--color-background-muted)" }}>
      <Heading level={2} className="nimi-section-title" style={{ maxWidth: 480 }}>
        Ready to trace your first run?
      </Heading>
      <p className="nimi-section-lead">
        Open the playground with a preloaded example, or run Nimi in your terminal and inspect your own
        traces.
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
          label="Explore Examples"
          variant="secondary"
          size="lg"
          onClick={() => {
            window.location.hash = "#/examples";
          }}
        />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="nimi-footer">
      <span className="nimi-brand-mark" style={{ width: 18, height: 18, fontSize: 10 }}>
        N
      </span>
      Nimi Code — minimal coding agent
    </footer>
  );
}
