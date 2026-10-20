import { useCallback, useEffect, useState } from "react";

// A very small router. The app has three pages and no need for a routing
// library: the path decides which page renders, and links are ordinary
// anchors so they work without JavaScript as well.
export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (to === window.location.pathname) return;
    window.history.pushState(null, "", to);
    setPath(to);
  }, []);

  return [path, navigate];
}

export function routeFor(path) {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/document" || clean === "/document.html") return "document";
  if (clean === "/docs" || clean === "/docs.html") return "docs";
  return "editor";
}
