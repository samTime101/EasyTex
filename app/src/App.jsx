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

  if (route === "document") return <WriterPage />;
  if (route === "docs") return <DocsPage />;
  return <EditorPage />;
}
