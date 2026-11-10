# Nimi UI redesign plan

> Implementation handoff for the web demo in `demo/`. This is a product and visual redesign brief, not permission to rebuild Nimi's agent, trace format, or backend.

## 1. The product to design

Nimi is a lightweight, open-source **terminal coding-agent harness**. A user points it at a codebase, gives it a task, and Nimi coordinates a model with local tools for reading/searching files, writing/editing, shell work, and Git. Read-only tools can run without a prompt; potentially mutating tools are permission-gated. Nimi supports multiple providers, terminal modes, sessions, and JSONL traces. The web demo is a browser-based **trace viewer and explainer**: it replays a bundled example, maps activity onto an architecture/dataflow view, and lets a visitor inspect events, context, source, output, and the permission decision.

The site must sell the real promise, not imply that the browser is a hosted coding agent:

- **Small and understandable:** a focused CLI harness, not a large agent platform.
- **Local and user-controlled:** the coding task runs through the CLI in the user's project; the demo is a preloaded replay.
- **Visible actions:** show what the model requested, which tools ran, what returned, and where permission gates apply.
- **Open and adaptable:** open-source code and provider choice; no claim that Nimi is free of provider/API costs.
- **Easy to try:** one install command and an immediately usable playground replay.

Preferred short positioning: **“A lightweight coding-agent harness. Every step, inspectable.”** Supporting copy should explain that Nimi runs in the terminal and that the playground replays a sample trace. Avoid vague claims such as “the trace studio for coding agents” as the sole explanation, and do not call the playground a live run unless it truly executes a run.

## 2. Scope and information architecture: exactly two product pages

### Page A — Home (`#/`)

One coherent, vertically scrolling marketing page. It should answer, in order: What is Nimi? How do I try it? What does the playground show? Why is the harness lightweight/control-oriented? Where are the source and docs?

Recommended section order:

1. Shared top navigation.
2. Hero: one concise product promise, short explanation, primary **Copy install command** action, secondary **Open playground** action, and a readable install command.
3. A large, polished preview of the actual playground with a clear caption such as “Replay a sample run — no API key needed for this demo.” The preview should link into the playground.
4. Three compact product principles: “Runs in your terminal,” “Permission-gated tools,” “Traceable JSONL sessions.” Keep claims aligned with the README and implementation.
5. A short four-step explanation: Prompt → Model streams → Tool/permission decision → Trace can be inspected. Use a restrained horizontal stepper on wide screens and a vertical list on narrow screens.
6. A small close/CTA area with playground, GitHub, npm, and relevant documentation links. Do not repeat every feature as a card grid.

Keep it to these few sections. Do not add a pricing page, testimonials, signup, account UI, dashboard, blog, or a second examples page.

### Page B — Playground (`#/playground`)

The interactive centerpiece. Preserve the existing replay controls, graph lenses, trace inspector, timeline, sample trace, and URL-addressable playback state. Make the first view understandable to a developer who has never seen a trace viewer. State visibly that this is a **sample replay** and that the permission switch changes the replay branch; it does not grant or deny access to a live machine.

The current `#/examples` page should cease to be a third top-level destination. Preserve the examples as a compact **Sample run** selector in the playground (include the current normal, denied, Classic, and TUI demonstrations only where each is genuinely distinct). Keep old example links usable by redirecting them into the playground/sample selector or into the most relevant sample. Do not delete or rewrite the underlying sample trace merely to get rid of the page.

## 3. Visual direction

Aim for a quiet, credible developer tool: precise, useful, and calm. Use the visual restraint of polished developer products (for example, Linear's hierarchy and spacing, Raycast's focused controls, and Vercel's direct install/onboarding copy) as **pattern references**, not as a pixel-for-pixel clone. Nimi's own identity and trace visual remain the differentiator.

### Palette, type, and shape

- Make the existing Nimi dark theme the primary design direction, but avoid pure-black slabs. Use the existing theme tokens for body, surface, muted/elevated panel, text, border, accent, success, warning, and error. Maintain enough contrast between page, panels, and selected states to establish hierarchy without outlining every element.
- Keep one primary accent (existing blue). Use green only for allowed/success states, amber for permission/warning states, and red for actual errors. Do not assign a different bright color to every subsystem in the primary UI; graph colors may remain distinct but muted.
- Use the existing Figtree/system sans stack for interface and headings and the existing monospace token only for commands, file paths, trace fields, model IDs, and code.
- Use a consistent spacing rhythm and restrained corner radii from Astryx tokens. Avoid pill-shaped everything, giant rounded cards, repeated borders, and heavy drop shadows.
- Use the provided Nimi logo assets from `demo/public/`. Preserve the supplied mark/wordmark; do not recreate it with a text “N”, add a new symbol, recolor it in CSS, or crop it incorrectly. Check which supplied PNG has transparency and suitable proportions in the actual app background before choosing a header asset. Keep the current favicon asset unless it is demonstrably the wrong supplied variant.

### Background treatment

The current page uses multiple large gradients, a regular dot grid, and six large floating icon tiles around the hero. Replace this with a deliberate, restrained treatment:

- Home background: mostly a single calm theme surface. Add at most one low-contrast, token-based radial wash behind the hero and a very faint dot/grid treatment confined to the hero or preview frame. Fade it out before the next section. No page-wide grid, high-contrast mesh, glow, animated blobs, floating icon tiles, or decorative elements that compete with the logo/copy.
- Section separation: use generous whitespace and occasional subtle surface shift or hairline border; do not alternate dramatic full-width color bands.
- Playground background: neutral workbench surface. Keep a subtle dot pattern only inside the graph canvas if it improves spatial orientation; reduce its contrast. The inspector, toolbar, and timeline should read as stable surfaces against it.
- Respect `prefers-reduced-motion`; background decoration must be static and must never be required to understand the interface.

## 4. Detailed screen specifications

### Shared shell

- Keep one shared shell in `Shell.jsx`, with the supplied logo at left and only two primary destinations: **Home** and **Playground**. Mark the current route accessibly. Use **GitHub** and **npm** as quiet external links, not fake status/star-count controls.
- Remove the current misleading “Download” link to the playground. The actual install command belongs in Home's hero and must be copyable. Link to the actual GitHub repository and npm package already present in project metadata.
- Keep the header compact and consistent across both routes. The playground needs more usable vertical space, so use a compact header there; do not introduce a second large navigation bar.
- On small screens, collapse secondary links accessibly rather than letting the nav wrap or overflow.

### Home hero and content

- Use a left-aligned or carefully centered composition with a constrained reading width. Use one H1, ideally two lines at desktop and natural wrapping on mobile. Example direction (copy can be refined without inventing product capabilities): **“A lightweight coding agent you can actually inspect.”**
- Supporting copy: explain that Nimi is a terminal harness, works with a model/provider the user configures, uses tools in the user's repo, and records a replayable trace. Mention plainly that the browser playground is a bundled sample replay.
- Primary CTA: copy `npm i -g nimi-code`; show the same command in a selectable code-style command row. Show a clear copied/success state and a fallback if clipboard access is unavailable. Verify the package command against `readme.md` before changing it.
- Secondary CTA: open the playground. Do not make a GitHub “star” the primary action.
- The preview should use the existing `HeroPreview`/architecture data as a genuine product preview, but simplify its presentation: give it a realistic frame, useful top label, uncluttered canvas, and a visible link/button to open the interactive replay. Avoid shrinking the whole dense 1585×510 graph until its labels are illegible. Prefer a curated subset or a focused crop only if it remains truthful and the existing graph is still available in the playground.
- Feature explanation should be concise and specific: local terminal harness; explicit permission handling for mutating tools; replayable trace/session inspection. Do not advertise unimplemented cloud sync, team collaboration, live browser execution, or integrations.
- Keep examples discoverable through the playground selector rather than a separate card gallery.

### Playground workbench

At a wide desktop viewport, the page should use the available height and avoid an outer page scrollbar. Use the following hierarchy:

1. **Run header:** sample name and “Sample replay” indicator at left; provider/model and prompt as secondary metadata; a “Choose sample” control if multiple samples remain.
2. **Compact control row:** playback controls (restart, previous, play/pause, next), current step / total, mode selector, and permission branch selector. Group related controls and use text labels or accessible tooltips. On narrow widths, wrap into two deliberate rows or move secondary controls into a menu; never squeeze controls into unreadable fragments.
3. **Main workbench:** graph canvas as the primary region (roughly 2/3 width) and inspector on the right (roughly 1/3, with a practical min/max width). The graph is the main visual explanation, not a background wallpaper. Give each region a small title/description and clear boundary.
4. **Timeline/playback footer:** persistent bottom strip with turn group labels, selectable event ticks, current step, speed, and keyboard hints. It must not cover graph content. At tablet/mobile widths, stack it below the graph and allow normal document scrolling.

Canvas specifics:

- Preserve **Dataflow** and **Streaming** lenses and Fit/zoom, but place canvas controls in a compact, consistently aligned toolbar. Put advanced controls such as subsystem highlighting/zones behind a small “View” menu or a secondary row; do not leave a scatter of floating buttons over the graph.
- Make the current node/edge visually clear with one restrained accent treatment. Keep inactive paths legible but quiet. Remove diffuse glow and excessive colored halos. Make the legend compact and allow it to collapse on small screens.
- Keep pan/zoom pointer behavior. Add visible focus/selection states and keyboard alternatives where feasible. SVG nodes that are clickable must be keyboard reachable and expose an accessible name/selected state; do not leave mouse-only `<g>` interactions.
- Ensure SVG sizing and text stay usable on narrow viewports. Provide a sensible default fit/reset and do not rely on horizontal page overflow as the only way to inspect the graph.

Inspector specifics:

- Default to **Summary/Overview** and explain the selected event in plain language first. Show phase, current action, file reference, permission outcome, and a compact run metadata summary. Keep implementation details beneath that summary.
- Progressive disclosure: keep the high-value details immediately findable and move raw/verbose views behind secondary tabs or disclosures. A suggested grouping is **Overview**, **Events**, **Context**, and **Source**; put raw payload and stdout under an “Advanced” disclosure if the current Astryx tab APIs make that practical. Do not remove access to data that is already supported.
- Tool inputs/results should be readable, wrapped/truncated safely, and copyable only if an existing component supports it. Use semantic statuses and text, not color alone. Denial should explain “blocked by the permission gate” and the replay-only nature of the switch.
- Prevent the six existing tabs from compressing or overflowing the 380px sidebar. At small widths use a tab scroller, menu, or stacked section navigation with accessible labels.

Timeline/control behavior to retain:

- Play/pause with Space; previous/next with Left/Right; selectable timeline events; speed control; URL query synchronization for output, branch, and index. Do not break browser back/forward or direct links.
- Preserve current start/end bounds and denied-branch stopping behavior. Add keyboard focus indication and accessible slider semantics to the event/timeline control. Do not put interactive buttons inside an element with conflicting slider semantics.
- The mode controls currently include Print, TUI, and Classic, while replay display logic treats TUI similarly to Print in parts of the implementation. Inspect and preserve actual behavior; do not claim three distinct renderings unless the underlying replay really produces them. If the TUI option is only a graph/architecture variation, label it accurately or make its limitation explicit rather than inventing output.
- The Allow/Deny control is a deterministic **replay branch simulation** based on the sample trace. Label it accordingly; it is not a live permission setting.

## 5. Existing implementation and boundaries

The web app is a React 19 + Vite SPA. Routes are hash-based in `demo/src/App.jsx`; entry/theme setup is in `demo/src/main.jsx` and `demo/src/astryx-themes.js`. Main UI files are:

- `demo/src/pages/LandingPage.jsx` and `demo/src/components/HeroPreview/HeroPreview.jsx`
- `demo/src/pages/PlaygroundPage.jsx`
- `demo/src/components/Shell/Shell.jsx`, `Toolbar/Toolbar.jsx`, `Canvas/Canvas.jsx`, `Inspector/Inspector.jsx`, `Timeline/Timeline.jsx`
- `demo/src/styles/nimi.css`, `demo/src/theme/nimiTheme.js` and generated `demo/src/theme/nimi.js`/`nimi.css`
- `demo/src/data/trace.js`, `flow.js`, `architecture.js`, plus `demo/samples/showcase.jsonl`

Preserve `trace.js`, `flow.js`, `architecture.js`, and the JSONL sample as the behavior/data layer unless a UI wiring fix is strictly needed. Do not change agent behavior, provider code, permissions, trace schema, CLI functionality, package metadata, or add a backend. Do not fabricate sample output, telemetry, performance metrics, model badges, GitHub star counts, or live-run functionality. Keep current routes/deep links working while consolidating navigation.

There are already uncommitted changes in `demo/index.html`, `demo/src/components/Shell/Shell.jsx`, `demo/src/pages/LandingPage.jsx`, and `demo/src/styles/nimi.css`, and untracked files under `demo/public/` (including the logo assets). Treat those as user work: inspect and build on them; never reset, replace wholesale, or delete them. This document is the only change requested in this planning task.

## 6. UI library and styling constraint (important)

The active component system in `demo/` is **Astryx** (`@astryxdesign/core` and `@astryxdesign/theme-neutral`), and the app already imports its reset, base CSS, components, and custom Nimi theme. The repository also contains `@stylexjs/stylex`, Meta's open-source styling system. StyleX is not a ready-made component library, and the current demo has no configured StyleX compiler/plugin; `AGENTS.md` explicitly says not to use StyleX utilities directly without that compiler. Therefore, for this bounded redesign:

- Use existing Astryx components for buttons, headings, tabs, controls, code, lists, navigation, and other available UI primitives. Before using an unfamiliar component or changing the page frame, follow the Astryx workflow in `AGENTS.md` and inspect its documented props/layout guidance.
- Keep product-specific styles in the existing `demo/src/styles/nimi.css`, using the Nimi/Astryx theme tokens. Put palette changes in `demo/src/theme/nimiTheme.js` and regenerate the built theme using the repository's documented command only if needed.
- Do **not** add a second component system, Tailwind, raw StyleX calls, or a StyleX compiler as an incidental part of this visual pass. Do not remove the installed StyleX dependency. If the project owner specifically requires StyleX to become the styling implementation, stop and get explicit approval for a separate build-tool integration decision first; do not silently invent that setup.
- Follow the specific project rules in `AGENTS.md`: no raw `<div>` layout wrappers; prefer Astryx layout components, no hardcoded hex/px in app CSS, tokens instead of palette overrides, and `npx astryx doctor --built <built-dir>` before delivering a build. Existing specialized SVG graph code is an exception to be preserved, not expanded into a general raw-CSS approach.

This resolves the apparent “Meta UI library” ambiguity truthfully: the Meta package in the repo is StyleX, while Astryx is the UI component library the current app is built on.

## 7. Suggested implementation order for the next model

1. Read this brief and `AGENTS.md`; inspect the current working tree before editing. Do not touch CLI/agent/data behavior.
2. Consolidate routing/navigation to Home + Playground while maintaining old example URLs as compatible links. Add a sample selector using the existing sample/replay data, not a new data source.
3. Redesign shared shell and Home hierarchy/copy. Remove decorative floating tiles and misleading navigation; implement the restrained background and real logo usage.
4. Rework the Playground frame and control hierarchy without changing replay semantics. Make desktop canvas/inspector/timeline composition work first, then tablet and mobile layouts.
5. Reduce inspector visual density through information hierarchy and progressive disclosure; retain existing raw details.
6. Refine theme tokens/background/graph treatment only as required. Avoid adding dependencies and avoid broad rewrites of trace/graph algorithms.
7. Verify: Home and Playground routes; legacy example links; direct query-string playback; allow/deny branch; play/pause, arrows and timeline; all inspector data; sample selection; clipboard success/failure; responsive overflow; focus/contrast/reduced-motion; logo/favicon loading.

## 8. Definition of done

- The only primary destinations are Home and Playground; the examples remain accessible as playground samples, and old links do not lead to a broken page.
- A first-time visitor can explain within a few seconds that Nimi is a lightweight terminal coding-agent harness and that the browser playground replays a sample trace.
- Home has one clear H1, a copyable correct install command, a playground CTA, a legible product preview, concise truthful capability explanation, and links to the real source/package.
- Playground looks like a deliberate professional workbench: obvious sample identity, understandable controls, dominant readable graph, useful inspector, and usable timeline.
- The UI contains no fake stars/counts, fake download behavior, unsupported product claims, decorative floating-icon clutter, unreadable graph screenshot, or third top-level page.
- Main responsive sizes do not cause horizontal overflow or lose controls. Keyboard focus, reduced motion, and non-color status cues are present.
- Existing Nimi logo assets and current in-progress work are preserved. Replay behavior, trace data, query state, keyboard shortcuts, and data details remain intact.
- The demo builds (`cd demo && npm run build`) and passes the required Astryx built-output check (`npx astryx doctor --built demo/dist`, from the repository root). Fix actual regressions rather than hiding or weakening checks.

---

## Copy/paste implementation prompt

You are implementing the Nimi web UI redesign. First read `docs/UI-REDESIGN-PLAN.md` and `AGENTS.md`, then inspect the existing files and `git status`. Implement the plan in `demo/` only. Treat existing modifications in `demo/index.html`, `demo/src/components/Shell/Shell.jsx`, `demo/src/pages/LandingPage.jsx`, `demo/src/styles/nimi.css`, and untracked `demo/public/` logo assets as user work: preserve and build on them; never reset, discard, or overwrite wholesale.

The product is a lightweight, open-source terminal coding-agent harness. The browser playground is a replay/explainer for a bundled JSONL sample, not a hosted live agent. Deliver exactly two primary pages: a polished Home page and the existing interactive Playground. Keep the existing sample scenarios accessible through a playground sample selector; make legacy `#/examples` links redirect compatibly instead of retaining an Examples top-level page. Do not add auth, accounts, cloud execution, telemetry, a backend, new product features, fabricated metrics, fake star counts, or new dependencies.

Use Astryx components and the existing Nimi theme/tokens. `@stylexjs/stylex` is installed but has no configured compiler in this app; `AGENTS.md` forbids direct StyleX usage without one. Do not set up StyleX, Tailwind, or another component library as part of this redesign. Follow all other `AGENTS.md` rules, including use of tokens and the required Astryx built-output check. Preserve the supplied logo; do not recreate the mark.

On Home, create a quiet developer-product landing page: one clear H1 explaining the lightweight coding-agent harness, brief truthful supporting copy, a primary copy-install-command CTA using the actual README command, a secondary Playground CTA, a polished preview using the actual product UI/data, three concise differentiators (terminal/local workflow, permission-gated tools, inspectable traces), a short four-step workflow, and real GitHub/npm/docs links. Use a restrained dark-first background: at most a faint hero-only radial wash or subtle canvas grid. Remove the six floating hero tiles, noisy full-page decoration, repeated card grids, and misleading “Download” action. Use the existing logo assets from `demo/public/` appropriately.

On Playground, retain actual replay semantics, graph Dataflow/Streaming views, fit/zoom, playback, speed, mode, permission branch, inspector details, timeline, keyboard shortcuts, and URL state. Label the run as a sample replay and explain that Allow/Deny selects a replay branch, not a live permission. Organize the UI as: compact run header/sample selector; compact transport and mode/permission controls; large graph with inspector sidebar on desktop; persistent timeline footer. On small screens, stack/scroll intentionally, keep every control reachable, and prevent horizontal overflow. Make the inspector summary-first with raw data progressively disclosed, without deleting supported details. Make graph nodes accessible and keyboard-reachable; reduce glow, color noise, and floating overlay controls. Verify the Print/TUI/Classic choices reflect real behavior and do not invent distinctions.

Keep `demo/src/data/trace.js`, `flow.js`, `architecture.js`, and `demo/samples/showcase.jsonl` unchanged unless a minimal UI-only wiring correction is necessary. Do not edit CLI, agent, provider, permissions, trace format, package metadata, or root app. Test Home, Playground, legacy links, sample selection, query deep links, allow/deny, timeline and keyboard controls, inspector details, clipboard fallback, responsive layouts, focus states, contrast, and reduced motion. Then run `cd demo && npm run build` and from repository root run `npx astryx doctor --built demo/dist`. Report files changed and checks run. Do not claim checks passed unless they actually did.
