import { Suspense, lazy, useEffect, useState } from "react";
import { EditorPage } from "./pages/EditorPage.jsx";
import { WriterPage } from "./pages/WriterPage.jsx";
import { usePath, routeFor } from "./lib/router.js";
import { usePageMetadata } from "./hooks/usePageMetadata.js";

// The reference page carries the whole LaTeX catalog, so it is loaded only
// when it is asked for.
const DocsPage = lazy(() => import("./pages/DocsPage.jsx").then((module) => ({ default: module.DocsPage })));

export default function App() {
  const [path] = usePath();
  const route = routeFor(path);
  usePageMetadata(route);

  // The document writer fills the window: the header and the footer stay
  // put, and the workspace takes the rest. On a narrow screen the stylesheet
  // turns the body back into an ordinary block, so the page scrolls as usual.
  useEffect(() => {
    document.body.classList.toggle("writer-body", route === "document");
    return () => document.body.classList.remove("writer-body");
  }, [route]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {route === "document" ? (
        <WriterPage />
      ) : route === "docs" ? (
        <Suspense fallback={<p className="page-loading">Loading the reference…</p>}>
          <DocsPage />
        </Suspense>
      ) : (
        <EditorPage />
      )}
    </>
  );
}
