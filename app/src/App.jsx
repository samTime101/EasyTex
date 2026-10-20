import { useEffect } from "react";
import { usePath, routeFor } from "./lib/router.js";
import { EditorPage } from "./pages/EditorPage.jsx";
import { WriterPage } from "./pages/WriterPage.jsx";
import { DocsPage } from "./pages/DocsPage.jsx";

const TITLES = {
  editor: "EasyTeX — MathScript editor",
  document: "EasyTeX — Document writer",
  docs: "EasyTeX & MathScript reference"
};

export default function App() {
  const [path] = usePath();
  const route = routeFor(path);

  useEffect(() => {
    document.title = TITLES[route] ?? TITLES.editor;
  }, [route]);

  // The document writer fills the window: the header and the footer stay
  // put, and the workspace takes the rest. On a narrow screen the stylesheet
  // turns the body back into an ordinary block, so the page scrolls as usual.
  useEffect(() => {
    document.body.classList.toggle("writer-body", route === "document");
    return () => document.body.classList.remove("writer-body");
  }, [route]);

  if (route === "document") return <WriterPage />;
  if (route === "docs") return <DocsPage />;
  return <EditorPage />;
}
