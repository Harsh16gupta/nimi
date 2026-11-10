// Nimi Code web frontend.
// Two experiences: landing page and the sample-replay playground.
// Hash-based routing keeps the static deployment simple.
import { useEffect, useMemo, useState } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import PlaygroundPage from "./pages/PlaygroundPage.jsx";
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

// Legacy support: the old top-level Examples page is gone. Its scenarios live
// in the playground sample selector, so old #/examples links land on the
// equivalent playground replay. replaceState keeps Back working (no loop).
function LegacyExamplesRedirect({ params }) {
  useEffect(() => {
    const query = params.toString();
    const target = `#/playground${query ? `?${query}` : "?output=print&branch=allow&index=0"}`;
    window.history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [params]);
  return null;
}

export default function App() {
  const { path, params } = useHashRoute();

  if (path === "/examples" || path.startsWith("/examples/")) {
    return (
      <div className="nimi-app">
        <Shell currentPath="/playground" />
        <LegacyExamplesRedirect params={params} />
      </div>
    );
  }

  let page;
  if (path === "/playground" || path.startsWith("/playground/")) {
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
