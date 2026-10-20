import { useEffect } from "react";

// The metadata of a page, in one place.
//
// The title, the description, and the social card all come from the same
// record, so they can never disagree with each other.
const PAGES = {
  editor: {
    title: "EasyTeX — MathScript editor",
    description:
      "Write mathematics as functions, not backslashes. The EasyTeX expression editor checks the source as you type and previews it as native MathML.",
    path: "/"
  },
  document: {
    title: "EasyTeX — Document writer",
    description:
      "Write a complete MathScript document — sections, numbered equations, figures, tables, references — and export it as LaTeX or a laid-out page.",
    path: "/document"
  },
  docs: {
    title: "EasyTeX & MathScript reference",
    description:
      "The complete MathScript reference: every function, constant, Greek name, named symbol, operator, document component, and field, with a LaTeX compatibility table.",
    path: "/docs"
  }
};

function setMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const [key, name] = selector.replace(/meta\[|\]/g, "").split("=");
    element.setAttribute(key, name);
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

export function usePageMetadata(route) {
  useEffect(() => {
    const page = PAGES[route] ?? PAGES.editor;
    document.title = page.title;

    const description = document.head.querySelector('meta[name="description"]');
    description?.setAttribute("content", page.description);
    setMeta('meta[property="og:title"]', "content", page.title);
    setMeta('meta[property="og:description"]', "content", page.description);
    setMeta('meta[property="og:url"]', "content", `https://easytex.vercel.app${page.path}`);
    setMeta('meta[name="twitter:title"]', "content", page.title);
    setMeta('meta[name="twitter:description"]', "content", page.description);

    const canonical = document.head.querySelector('link[rel="canonical"]');
    canonical?.setAttribute("href", `https://easytex.vercel.app${page.path}`);
  }, [route]);
}
