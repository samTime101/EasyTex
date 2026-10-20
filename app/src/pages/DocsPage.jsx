import { Fragment, useEffect, useMemo, useState } from "react";
import {
  groupComponentsByCategory,
  groupConstantsByCategory,
  groupFieldsByScope,
  groupFunctionsByCategory,
  groupLatexBySection,
  groupOperatorsByCategory
} from "../lib/engine.js";
import { Header } from "../components/Header.jsx";
import {
  ComponentsSection,
  ConstantsSection,
  DocumentAuthoringSection,
  FieldsSection,
  FunctionsSection,
  GreekSection,
  Hero,
  LatexSection,
  OperatorsSection,
  PageSection,
  slugify,
  SymbolsSection,
  SyntaxSection,
  TemplatesSection
} from "./docs/Sections.jsx";

function navGroups() {
  return [
    { label: "Start here", items: [{ label: "EasyTeX & MathScript", id: "about-easytex" }] },
    {
      label: "Functions",
      items: groupFunctionsByCategory().map((group) => ({
        label: group.category,
        id: `functions-${slugify(group.category)}`
      }))
    },
    {
      label: "Constants",
      items: groupConstantsByCategory().map((group) => ({
        label: group.category,
        id: `constants-${slugify(group.category)}`
      }))
    },
    { label: "Greek letters", items: [{ label: "Greek letters", id: "greek-letters" }] },
    { label: "Symbols", items: [{ label: "Named symbols", id: "named-symbols" }] },
    {
      label: "Operators",
      items: groupOperatorsByCategory().map((group) => ({
        label: group.category,
        id: `operators-${slugify(group.category)}`
      }))
    },
    {
      label: "LaTeX compatibility",
      items: [
        { label: "Overview", id: "latex-reference" },
        ...groupLatexBySection().map((item) => ({ label: item.title, id: item.id }))
      ]
    },
    {
      label: "Language",
      items: [
        { label: "Syntax rules", id: "syntax-rules" },
        { label: "Precedence examples", id: "precedence-examples" }
      ]
    },
    {
      label: "Documents",
      items: [
        { label: "Authoring", id: "document-authoring" },
        { label: "Templates", id: "document-templates" },
        { label: "Page layout", id: "document-page" },
        { label: "Fields", id: "document-fields" }
      ]
    },
    {
      label: "Document components",
      items: groupComponentsByCategory().map((group) => ({
        label: group.category,
        id: `components-${slugify(group.category)}`
      }))
    }
  ];
}

export function DocsPage() {
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState(null);
  const groups = useMemo(() => navGroups(), []);

  // The reference is long, so the navigation follows the section in view.
  useEffect(() => {
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    function update() {
      let current = ids[0];
      for (const id of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= 130) current = id;
      }
      setActive(current ?? null);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [groups]);

  return (
    <>
      <Header subtitle="Language &amp; application reference">
        <label className="docs-search">
          <span className="visually-hidden">Search the reference</span>
          <input
            id="docs-search"
            type="search"
            placeholder="Search functions, symbols, fields…"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                setQuery("");
              }
            }}
          />
        </label>
      </Header>

      <main className="docs-layout">
        <aside className={navOpen ? "docs-nav open" : "docs-nav"} aria-label="Reference sections">
          <button
            id="docs-nav-toggle"
            className="docs-nav-toggle"
            type="button"
            aria-expanded={navOpen}
            aria-controls="docs-nav"
            onClick={() => setNavOpen((open) => !open)}
          >
            <span>On this page</span>
            <span className="docs-nav-toggle-mark" aria-hidden="true">
              +
            </span>
          </button>
          <nav id="docs-nav">
            {groups.map((group) => (
              <Fragment key={group.label}>
                <div className="nav-group">{group.label}</div>
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={active === item.id ? "active" : ""}
                    aria-current={active === item.id ? "location" : undefined}
                    onClick={() => {
                      if (window.matchMedia("(max-width: 980px)").matches) setNavOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </Fragment>
            ))}
          </nav>
          <a className="docs-nav-spec" href="/SPECIFICATION.md">
            Full specification &rarr;
          </a>
        </aside>

        <article id="docs-content" className="docs-content">
          <Hero />
          <FunctionsSection query={query} />
          <ConstantsSection query={query} />
          <GreekSection query={query} />
          <SymbolsSection query={query} />
          <OperatorsSection query={query} />
          <LatexSection query={query} />
          <SyntaxSection query={query} />
          <DocumentAuthoringSection />
          <TemplatesSection />
          <PageSection />
          <FieldsSection />
          <ComponentsSection query={query} />
        </article>
      </main>

      <footer className="app-footer">
        <span>EasyTeX · MathScript 0.1-draft</span>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <a href="/SPECIFICATION.md">Specification</a>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <a href="/document">Document writer</a>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <a href="/">Editor</a>
      </footer>
    </>
  );
}
