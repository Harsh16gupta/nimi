# AGENTS.md

Project-specific guidance for AI coding agents.

<!-- ASTRYX:START -->
Astryx v0.7.11 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

## Web frontend (demo/)

The web product lives in `demo/` and is a Vite + React SPA using Astryx as its design system.

- Entry: `demo/src/main.jsx`
- Router: hash-based, in `demo/src/App.jsx`
- Pages: `demo/src/pages/LandingPage.jsx`, `PlaygroundPage.jsx`, `ExamplesPage.jsx`
- Theme: custom Nimi theme extending `@astryxdesign/theme-neutral`, built with `npx @astryxdesign/cli theme build demo/src/theme/nimiTheme.js`. The built artifacts are in `demo/src/theme/` and imported by `demo/src/astryx-themes.js`.
- Global styles: `demo/src/styles/nimi.css` uses Astryx tokens for layout and product-specific surfaces (graph, timeline, inspector).
- Product-specific components:
  - `Canvas` — interactive SVG architecture / streaming graph.
  - `Inspector` — progressive disclosure: Summary (default) + Payload, Source, Context, Events, Stdout (advanced).
  - `Timeline` — turn-based playback scrubber.
  - `Toolbar` — transport controls, mode, permission.
  - `Shell` — top navigation.
  - `HeroPreview` — static landing-page graph preview.
- Data layer preserved from the previous version: `demo/src/data/trace.js`, `flow.js`, `architecture.js`.

Build the demo with `cd demo && npm run build`. The root `npm run check` does not cover `demo/` files (they are JSX, not TSX).
