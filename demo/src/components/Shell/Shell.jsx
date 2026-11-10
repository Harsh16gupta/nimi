// Product navigation shell.
// Visible on every page; collapses to a minimal bar on small screens.
import { TopNav } from "@astryxdesign/core/TopNav";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";

export default function Shell({ currentPath }) {
  const isPlayground = currentPath === "/playground" || currentPath.startsWith("/playground/");
  const isExamples = currentPath === "/examples";
  const isLanding = currentPath === "/";

  return (
    <TopNav
      label="Nimi Code"
      heading={
        <a href="#/" className="nimi-brand" aria-label="Nimi Code home">
          <span className="nimi-brand-mark">N</span>
          nimi
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
          <a
            href="#/examples"
            className={`nimi-nav-link${isExamples ? " is-active" : ""}`}
            aria-current={isExamples ? "page" : undefined}
          >
            Examples
          </a>
        </>
      }
      endContent={
        <Button
          label={isPlayground ? "Explore Examples" : "Open Playground"}
          variant="primary"
          size="sm"
          endContent={<Icon icon="arrowUp" size="sm" />}
          onClick={() => {
            window.location.hash = isPlayground ? "#/examples" : "#/playground";
          }}
        />
      }
    />
  );
}
