// Shared product navigation shell.
// Two primary destinations (Home, Playground) plus quiet external links.
// Secondary links collapse into the footer on small screens via CSS.
import { Icon } from "@astryxdesign/core/Icon";
import { TopNav } from "@astryxdesign/core/TopNav";

const GITHUB_URL = "https://github.com/Harsh16gupta/nimi";
const NPM_URL = "https://www.npmjs.com/package/nimi-code";

export default function Shell({ currentPath }) {
  const isPlayground = currentPath === "/playground" || currentPath.startsWith("/playground/");
  const isLanding = currentPath === "/";

  return (
    <TopNav
      label="Nimi Code"
      heading={
        <a href="#/" className="nimi-brand" aria-label="Nimi Code home">
          <img src="./nimi-logo-transparent.png" alt="Nimi" className="nimi-brand-logo" />
        </a>
      }
      startContent={
        <>
          <a
            href="#/"
            className={`nimi-nav-link${isLanding ? " is-active" : ""}`}
            aria-current={isLanding ? "page" : undefined}
          >
            Home
          </a>
          <a
            href="#/playground"
            className={`nimi-nav-link${isPlayground ? " is-active" : ""}`}
            aria-current={isPlayground ? "page" : undefined}
          >
            Playground
          </a>
        </>
      }
      endContent={
        <span className="nimi-header-actions">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="nimi-nav-link nimi-nav-external"
          >
            GitHub <Icon icon="externalLink" size="xsm" />
          </a>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="nimi-nav-link nimi-nav-external"
          >
            npm <Icon icon="externalLink" size="xsm" />
          </a>
        </span>
      }
    />
  );
}
