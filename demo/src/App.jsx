// Nimi Code web frontend.
// Three experiences: landing page, playground, and examples.
// Hash-based routing keeps the static deployment simple.
import { useEffect, useMemo, useState } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import PlaygroundPage from "./pages/PlaygroundPage.jsx";
import ExamplesPage from "./pages/ExamplesPage.jsx";
import Shell from "./components/Shell/Shell.jsx";
import showcaseText from "../samples/showcase.jsonl?raw";
import { parseTrace } from "./data/trace.js";

const parsed = parseTrace(showcaseText);

function readHashRoute() {
  const hash = window.location.hash.slice(1) || "/";
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query ?? "");
  return { path: path || "/", params };
}

export function useHashRoute() {
  const [route, setRoute] = useState(readHashRoute);

  useEffect(() => {
    const onHash = () => setRoute(readHashRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (to) => {
    window.location.hash = to;
  };

  return useMemo(() => ({ ...route, navigate }), [route]);
}

export default function App() {
  const { path } = useHashRoute();

  let page;
  if (path === "/examples") {
    page = <ExamplesPage />;
  } else if (path === "/playground" || path.startsWith("/playground/")) {
    page = <PlaygroundPage parsed={parsed} />;
  } else {
    page = <LandingPage />;
  }

  return (
    <div className="nimi-app">
      <Shell currentPath={path} />
      {page}
    </div>
  );
}
