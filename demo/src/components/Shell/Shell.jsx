// Shared product navigation shell.
// Klein-blue header from the idea.html design pattern: NIMI brand (our logo),
// Home / Playground tabs, quiet external links, install CTA. Only real links.
const GITHUB_URL = "https://github.com/Harsh16gupta/nimi";
const NPM_URL = "https://www.npmjs.com/package/nimi-code";
const INSTALL_CMD = "npm install -g nimi-code";

async function copyInstall() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(INSTALL_CMD);
      return;
    }
    throw new Error("no clipboard API");
  } catch {
    const area = document.createElement("textarea");
    area.value = INSTALL_CMD;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(area);
    }
  }
}

export default function Shell({ currentPath }) {
  const isPlayground = currentPath === "/playground" || currentPath.startsWith("/playground/");
  const isLanding = !isPlayground;

  return (
    <header className="nimi-topbar">
      <div className="nimi-topbar-inner">
      <div className="nimi-topbar-left">
        <a href="#/" className="nimi-topbar-brand" aria-label="Nimi home">
          <span className="nimi-topbar-word">NIMI</span>
          <span className="nimi-topbar-version">v1.2.0</span>
        </a>
        <nav className="nimi-topbar-tabs" aria-label="Primary">
          <a href="#/" className={`nimi-topbar-tab${isLanding ? " is-active" : ""}`} aria-current={isLanding ? "page" : undefined}>
            <span className="nimi-topbar-dot" aria-hidden />
            HOME
          </a>
          <a
            href="#/playground"
            className={`nimi-topbar-tab${isPlayground ? " is-active" : ""}`}
            aria-current={isPlayground ? "page" : undefined}
          >
            <span className="nimi-topbar-dot" aria-hidden />
            PLAYGROUND
          </a>
        </nav>
      </div>
      <div className="nimi-topbar-right">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="nimi-topbar-link nimi-nav-external">
          GITHUB ↗
        </a>
        <a href={NPM_URL} target="_blank" rel="noreferrer" className="nimi-topbar-link nimi-nav-external">
          NPM ↗
        </a>
        <button type="button" className="nimi-topbar-install" onClick={copyInstall} title={`Copy ${INSTALL_CMD}`}>
          INSTALL NIMI
        </button>
      </div>
      </div>
    </header>
  );
}
