import { compile, compileDocument, SHEET_CSS } from "../src/engine.js";
import {
  SYNTAX_NOTES,
  PRECEDENCE_EXAMPLES,
  GREEK_DOCS,
  SYMBOL_DOCS,
  LATEX_DOCS,
  groupFunctionsByCategory,
  groupConstantsByCategory,
  groupOperatorsByCategory,
  groupLatexBySection,
  groupComponentsByCategory,
  groupFieldsByScope
} from "../src/docs/index.js";
import {
  BIBLIOGRAPHY_TYPES,
  DOCUMENT_NOTES,
  TEMPLATES,
  TEMPLATE_NAMES,
  PAGE_SIZES
} from "../src/engine.js";
import { initTheme } from "./theme.js";
import { highlightSource } from "./highlight.js";

const content = document.getElementById("docs-content");
const nav = document.getElementById("docs-nav");
const searchInput = document.getElementById("docs-search");
const themeToggle = document.getElementById("theme-toggle");

initTheme(themeToggle);

// The document preview on this page is the same sheet as the writer and the
// standalone HTML export.
const sheetStyle = document.createElement("style");
sheetStyle.textContent = SHEET_CSS;
document.head.append(sheetStyle);

const DOCUMENT_SAMPLE = `document({
  type: "article",
  title: "Summing Squares",
  author: "Ada Lovelace",
  abstract: "A one-page note on sum(i, 1, n, i^2).",
  content: [
    section("The closed form", [
      text("The sum of the first ", n, " squares is ", inline(sum(i, 1, n, i^2)), "."),
      equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series"),
      text("See ", ref("eq:series"), " for the closed form.")
    ])
  ]
})`;

let toastTimer = null;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Code on the reference page is highlighted with the same scanner the editors
// use, so a sample reads the same everywhere. The highlighter escapes its
// input, so the result is safe to assign to innerHTML.
function code(tag, className, source, options = {}) {
  const node = el(tag, className);
  node.innerHTML = highlightSource(source, options);
  return node;
}

function toast(message) {
  let element = document.querySelector(".toast");
  if (!element) {
    element = el("div", "toast");
    document.body.append(element);
  }
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 1600);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    toast(message);
  }
}

function renderExample(example) {
  const wrapper = el("div", "example");

  const head = el("div", "example-head");
  head.append(el("span", "example-note", example.note ?? "Example"));

  const actions = el("div", "example-actions");

  const copyButton = el("button", "mini-button", "Copy");
  copyButton.type = "button";
  copyButton.addEventListener("click", () => copyText(example.source, "Example copied"));
  actions.append(copyButton);

  const tryLink = el("a", "mini-button", "Try it");
  tryLink.href = `/web/index.html#src=${encodeURIComponent(example.source)}`;
  actions.append(tryLink);

  head.append(actions);

  const body = el("div", "example-body");
  const source = code("pre", "example-source", example.source);
  const preview = el("div", "example-preview");

  const result = compile(example.source);
  if (result.diagnostics.length > 0 || !result.mathml) {
    preview.append(el("span", "example-error", result.diagnostics[0]?.message ?? "Render error"));
  } else {
    preview.innerHTML = result.mathml;
  }

  body.append(source, preview);
  wrapper.append(head, body);
  return wrapper;
}

function argsTable(captionText, args) {
  const table = el("table", "args-table");
  table.append(el("caption", null, captionText));
  const body = el("tbody");
  for (const arg of args) {
    const row = el("tr");
    const nameCell = el("td");
    nameCell.append(el("code", null, arg.name));
    row.append(nameCell, el("td", "arg-type", arg.type), el("td", null, arg.description));
    body.append(row);
  }
  table.append(body);
  return table;
}

function functionCard(doc) {
  const card = el("article", "function-card");
  card.id = `fn-${doc.name}`;

  const head = el("div", "function-card-head");
  head.append(el("h3", null, doc.name));
  head.append(el("code", "signature", doc.signature));
  head.append(el("span", `badge kind-${doc.kind ?? "function"}`, doc.kind ?? "function"));
  head.append(el("span", "badge", `returns ${doc.returns ?? "scalar"}`));
  card.append(head);

  card.append(el("p", "function-summary", doc.summary));
  if (doc.description) card.append(el("p", "function-description", doc.description));

  if (doc.args?.length) card.append(argsTable("Arguments", doc.args));

  if (doc.examples?.length) {
    const list = el("div", "example-list");
    for (const example of doc.examples) list.append(renderExample(example));
    card.append(list);
  }

  card.dataset.haystack = [doc.name, doc.signature, doc.summary, doc.category]
    .join(" ")
    .toLowerCase();
  return card;
}

function section(id, title, count) {
  const node = el("section", "docs-section");
  node.id = id;
  node.dataset.cardSection = "true";
  const heading = el("h2");
  heading.append(document.createTextNode(title));
  if (typeof count === "number") {
    const badge = el("span", "section-count", `${count} ${count === 1 ? "entry" : "entries"}`);
    heading.append(badge);
  }
  node.append(heading);
  return node;
}

function addNavSection(groupLabel, items) {
  if (items.length === 0) return;
  nav.append(el("div", "nav-group", groupLabel));
  for (const item of items) {
    const link = el("a", null, item.label);
    link.href = `#${item.id}`;
    nav.append(link);
  }
}

function renderHero() {
  addNavSection("Start here", [{ label: "EasyTeX & MathScript", id: "about-easytex" }]);

  const hero = el("section", "docs-hero");
  hero.id = "about-easytex";
  hero.append(el("p", "docs-eyebrow", "EasyTeX · MathScript 0.1-draft"));
  hero.append(el("h2", null, "EasyTeX & MathScript"));
  hero.append(
    el(
      "p",
      null,
      "EasyTeX is the application. MathScript is the function-based language it reads. This reference documents both, from the syntax rules and built-ins to every document component and metadata field."
    )
  );

  const definitions = el("div", "about-grid");
  const application = el("article", "about-card");
  application.append(el("p", "about-card-label", "The application"));
  application.append(el("h3", null, "EasyTeX"));
  application.append(
    el(
      "p",
      null,
      "A local, zero-dependency editor and document writer for mathematics. It validates MathScript, renders native MathML, exports LaTeX or standalone HTML, and prints to PDF. Nothing is sent to a server, and MathScript source is parsed as data — never executed."
    )
  );

  const language = el("article", "about-card");
  language.append(el("p", "about-card-label", "The language"));
  language.append(el("h3", null, "MathScript"));
  const languageCopy = el("p", null, "A function-based mathematical notation: write ");
  languageCopy.append(el("code", null, "frac(a, b)"));
  languageCopy.append(document.createTextNode(" or "));
  languageCopy.append(el("code", null, "sum(i, 1, n, i^2)"));
  languageCopy.append(
    document.createTextNode(
      " instead of backslash commands. “=” means equality, free applications such as f(x) are valid, and there is no implicit multiplication. It is not LaTeX."
    )
  );
  language.append(languageCopy);
  definitions.append(application, language);
  hero.append(definitions);

  const source = "x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)";
  const example = el("div", "docs-hero-example");
  const exampleHead = el("div", "docs-hero-example-head");
  exampleHead.append(el("span", null, "MathScript in"));
  exampleHead.append(el("span", null, "Typeset out"));
  example.append(exampleHead);
  example.append(code("code", "docs-hero-code", source));
  const preview = el("div", "docs-hero-preview");
  const result = compile(source);
  if (result.mathml) preview.innerHTML = result.mathml;
  example.append(preview);
  hero.append(example);
  content.append(hero);
}

function renderFunctions() {
  const groups = groupFunctionsByCategory();
  addNavSection(
    "Functions",
    groups.map((group) => ({
      label: group.category,
      id: `functions-${slugify(group.category)}`
    }))
  );

  for (const group of groups) {
    const node = section(`functions-${slugify(group.category)}`, group.category, group.items.length);
    for (const doc of group.items) node.append(functionCard(doc));
    content.append(node);
  }
}

function renderConstants() {
  const groups = groupConstantsByCategory();
  addNavSection(
    "Constants",
    groups.map((group) => ({ label: group.category, id: `constants-${slugify(group.category)}` }))
  );

  for (const group of groups) {
    const node = section(`constants-${slugify(group.category)}`, group.category, group.items.length);
    for (const doc of group.items) node.append(functionCard(doc));
    content.append(node);
  }
}

function renderGreek() {
  addNavSection("Greek letters", [{ label: "Greek letters", id: "greek-letters" }]);

  const node = section("greek-letters", "Greek letters", GREEK_DOCS.length);
  node.append(
    el(
      "p",
      "docs-lede",
      "Greek names are ordinary identifiers: write alpha, beta, sigma, and friends and they render as the matching Greek letter in the preview and in the LaTeX export. Variant forms such as varepsilon and varphi, and uppercase commands such as Gamma and Omega, use the same mechanism. They stay free variables, so they can be bound by sum(...), integral(...), and the other binder functions. LaTeX has no \\omicron command; the ordinary Latin o is the conventional input."
    )
  );

  const table = el("table", "operator-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["Name", "Symbol", "LaTeX", "Notes"]) headRow.append(el("th", null, label));
  head.append(headRow);
  table.append(head);

  const body = el("tbody");
  for (const doc of GREEK_DOCS) {
    const row = el("tr");
    row.dataset.haystack = `${doc.name} greek letter ${doc.symbol} ${doc.latex} ${doc.note}`.toLowerCase();
    row.append(el("td", "operator-example", doc.name));
    row.append(el("td", "greek-symbol", doc.symbol));
    row.append(el("td", "operator-example", doc.latex));
    row.append(el("td", null, doc.constant ? "Also the numeric constant \u03c0." : doc.note || "—"));
    body.append(row);
  }
  table.append(body);
  node.append(table);
  content.append(node);
}

function renderSymbols() {
  addNavSection("Symbols", [{ label: "Named symbols", id: "named-symbols" }]);

  const node = section("named-symbols", "Named symbols", SYMBOL_DOCS.length);
  node.append(
    el(
      "p",
      "docs-lede",
      "Ordinary mathematical symbols are ordinary identifiers too. Write aleph, hbar, emptyset, forall, or ell and the renderers display the matching glyph; the name stays a free variable and can be bound by a summation or integral. Operators, relations, arrows, and accents are separate constructs and are not part of this table."
    )
  );

  const table = el("table", "operator-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["Name", "Symbol", "LaTeX", "Notes"]) headRow.append(el("th", null, label));
  head.append(headRow);
  table.append(head);

  const body = el("tbody");
  for (const doc of SYMBOL_DOCS) {
    const row = el("tr");
    row.dataset.haystack = `${doc.name} named symbol ${doc.symbol} ${doc.latex} ${doc.note}`.toLowerCase();
    row.append(el("td", "operator-example", doc.name));
    row.append(el("td", "symbol-glyph", doc.symbol));
    row.append(el("td", "operator-example", doc.latex));
    row.append(el("td", null, doc.note || "—"));
    body.append(row);
  }
  table.append(body);
  node.append(table);
  content.append(node);
}

const LATEX_STATUS_LABELS = {
  native: "native",
  approximate: "approximate",
  none: "no equivalent"
};

const LATEX_STATUS_EXPLANATIONS = {
  native: "Exact MathScript construct.",
  approximate: "Same meaning, with a different spelling or rendering.",
  none: "No native construct in this version; the note explains the gap."
};

function latexStatusBadge(status) {
  return el("span", `badge latex-status-${status}`, LATEX_STATUS_LABELS[status] ?? status);
}

function latexTable(rows) {
  const table = el("table", "operator-table latex-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["LaTeX", "MathScript", "Status", "Notes"]) headRow.append(el("th", null, label));
  head.append(headRow);
  table.append(head);

  const body = el("tbody");
  for (const doc of rows) {
    const row = el("tr");
    row.dataset.haystack = [
      "latex mathscript",
      doc.category,
      doc.latex,
      doc.mathscript ?? "",
      doc.status,
      LATEX_STATUS_LABELS[doc.status] ?? "",
      doc.note
    ]
      .join(" ")
      .toLowerCase();
    row.append(el("td", "operator-example latex-command", doc.latex));
    const source = el("td", "latex-source");
    if (doc.mathscript) {
      source.append(code("code", "docs-inline-code", doc.mathscript));
    } else {
      source.append(el("span", "latex-none", "—"));
    }
    row.append(source);
    const status = el("td");
    status.append(latexStatusBadge(doc.status));
    row.append(status);
    row.append(el("td", "latex-note", doc.note || "—"));
    body.append(row);
  }
  table.append(body);
  return table;
}

function renderLatexReference() {
  const sections = groupLatexBySection();
  addNavSection("LaTeX compatibility", [
    { label: "Overview", id: "latex-reference" },
    ...sections.map((item) => ({ label: item.title, id: item.id }))
  ]);

  const intro = section("latex-reference", "LaTeX → MathScript", LATEX_DOCS.length);
  intro.dataset.haystack =
    "latex mathscript translation mapping compatibility commands ams standard math symbols";
  intro.append(
    el(
      "p",
      "docs-lede",
      "The Comprehensive LaTeX Symbol List is a 604-page font and package catalog, not a list of language constructs. This reference covers the standard LaTeX/AMS mathematical vocabulary: functions, structures, constants, Greek letters, operators, relations, arrows, delimiters, big operators, accents, ordinary symbols, and document constructs. A free predicate such as related(a, b) is often the closest MathScript expression for a relation with no native operator; a free function can name an operation but cannot reproduce an arbitrary glyph. Package-specific fonts, emoji, phonetics, and decorative text glyphs are outside MathScript's font-free model."
    )
  );

  const counts = { native: 0, approximate: 0, none: 0 };
  for (const doc of LATEX_DOCS) counts[doc.status] += 1;
  const summary = el("div", "latex-summary");
  for (const status of ["native", "approximate", "none"]) {
    const item = el("div", "latex-summary-item");
    item.append(latexStatusBadge(status));
    item.append(el("span", "latex-summary-count", String(counts[status])));
    item.append(el("span", "latex-summary-text", LATEX_STATUS_EXPLANATIONS[status]));
    summary.append(item);
  }
  intro.append(summary);
  intro.append(
    el(
      "p",
      "docs-caption",
      "Use the search box to filter by command, symbol name, category, or meaning. The table covers every function, constant, Greek name, operator, and named symbol in the language, plus the wider standard notation catalog; it deliberately marks gaps instead of pretending every LaTeX package glyph has an equivalent."
    )
  );
  content.append(intro);

  for (const sectionSpec of sections) {
    const node = section(sectionSpec.id, sectionSpec.title, sectionSpec.items.length);
    if (sectionSpec.groups.length > 1) {
      for (const group of sectionSpec.groups) {
        node.append(el("h3", "docs-subhead", group.category));
        node.append(latexTable(group.items));
      }
    } else {
      node.append(latexTable(sectionSpec.groups[0].items));
    }
    content.append(node);
  }
}

function renderOperators() {
  const groups = groupOperatorsByCategory();
  addNavSection(
    "Operators",
    groups.map((group) => ({ label: group.category, id: `operators-${slugify(group.category)}` }))
  );

  for (const group of groups) {
    const node = section(`operators-${slugify(group.category)}`, group.category, group.items.length);
    const table = el("table", "operator-table");
    const head = el("thead");
    const headRow = el("tr");
    for (const label of ["Operator", "Meaning", "Example"]) headRow.append(el("th", null, label));
    head.append(headRow);
    table.append(head);

    const body = el("tbody");
    for (const operator of group.items) {
      const row = el("tr");
      row.append(el("td", "operator-symbol", operator.symbol));
      row.append(el("td", null, operator.meaning));
      row.append(el("td", "operator-example", operator.example));
      body.append(row);
    }
    table.append(body);
    node.append(table);
    content.append(node);
  }
}

function renderSyntax() {
  addNavSection("Language", [
    { label: "Syntax rules", id: "syntax-rules" },
    { label: "Precedence examples", id: "precedence-examples" }
  ]);

  const syntax = section("syntax-rules", "Syntax rules", SYNTAX_NOTES.length);
  const grid = el("div", "syntax-grid");
  for (const note of SYNTAX_NOTES) {
    const card = el("div", "syntax-note");
    card.dataset.haystack = `${note.title} ${note.body} ${note.example}`.toLowerCase();
    card.append(el("h3", null, note.title));
    card.append(el("p", null, note.body));
    card.append(code("code", "docs-inline-code", note.example));
    grid.append(card);
  }
  syntax.append(grid);
  content.append(syntax);

  const precedence = section("precedence-examples", "Precedence examples", PRECEDENCE_EXAMPLES.length);
  const table = el("table", "precedence-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["Source", "Interpretation"]) headRow.append(el("th", null, label));
  head.append(headRow);
  table.append(head);
  const body = el("tbody");
  for (const item of PRECEDENCE_EXAMPLES) {
    const row = el("tr");
    const sourceCell = el("td", "operator-example");
    sourceCell.append(code("code", "docs-inline-code", item.source));
    row.append(sourceCell, el("td", null, item.meaning));
    body.append(row);
  }
  table.append(body);
  precedence.append(table);
  content.append(precedence);
}

function renderDocumentAuthoring() {
  addNavSection("Documents", [
    { label: "Authoring", id: "document-authoring" },
    { label: "Templates", id: "document-templates" },
    { label: "Page layout", id: "document-page" },
    { label: "Fields", id: "document-fields" }
  ]);

  const intro = section("document-authoring", "Document authoring");
  intro.append(
    el(
      "p",
      "docs-lede",
      "A document is a single document({ ... }) call: metadata in an object, content in a list of blocks. The type field chooses a template; an optional page(...) block sets geometry; section, text, equation, table, figure, theorem, and friends build the body. Mathematics inside text(...) and inline(...) is ordinary MathScript, checked by the same validator as the expression editor."
    )
  );

  const actions = el("div", "docs-doc-actions");
  const writerLink = el("a", "mini-button", "Open this document in the writer");
  writerLink.href = `/web/document.html#src=${encodeURIComponent(DOCUMENT_SAMPLE)}`;
  const copyButton = el("button", "mini-button", "Copy the source");
  copyButton.type = "button";
  copyButton.addEventListener("click", () => copyText(DOCUMENT_SAMPLE, "Document copied"));
  actions.append(writerLink, copyButton);
  intro.append(actions);

  const frame = el("div", "docs-sheet-frame");
  const result = compileDocument(DOCUMENT_SAMPLE);
  if (result.html) {
    frame.innerHTML = result.html;
  } else {
    frame.append(el("span", "example-error", result.diagnostics[0]?.message ?? "Render error"));
  }
  intro.append(frame);
  intro.append(
    el(
      "p",
      "docs-caption",
      "The sheet above is rendered by the same engine as the writer preview and the standalone HTML download; this card shows the top of the page."
    )
  );

  const notes = el("div", "syntax-grid");
  for (const note of DOCUMENT_NOTES) {
    const card = el("div", "syntax-note");
    card.append(el("h3", null, note.title));
    card.append(el("p", null, note.body));
    card.append(code("code", "docs-inline-code", note.example));
    notes.append(card);
  }
  intro.append(notes);

  intro.append(
    el(
      "p",
      "docs-lede",
      "Components are the block and inline vocabulary of a document. Positional arguments come first; the named arguments listed on each card (label, number, caption, width, and so on) are an extension proposed by this implementation. Every component below is implemented and exercised by the test suite."
    )
  );

  content.append(intro);
}

function renderDocumentTemplates() {
  const node = section("document-templates", "Templates", TEMPLATE_NAMES.length);
  node.append(
    el(
      "p",
      "docs-lede",
      "The type field selects a template. A template sets heading numbering, whether a table of contents and abstract are shown, and the LaTeX document class. Numbering, labels, and references keep their meaning across templates."
    )
  );

  const table = el("table", "operator-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["type", "Template", "Description", "Headings", "LaTeX class"]) {
    headRow.append(el("th", null, label));
  }
  head.append(headRow);
  table.append(head);

  const body = el("tbody");
  for (const name of TEMPLATE_NAMES) {
    const template = TEMPLATES[name];
    const row = el("tr");
    row.append(el("td", "operator-symbol", name));
    row.append(el("td", null, template.label));
    row.append(el("td", null, template.summary));
    row.append(el("td", "operator-example", template.numbered ? "numbered" : "unnumbered"));
    row.append(el("td", "operator-example", template.latexClass));
    body.append(row);
  }
  table.append(body);
  node.append(table);

  const notes = TEMPLATE_NAMES.map((name) => TEMPLATES[name]).filter((template) => template.note);
  if (notes.length > 0) {
    const list = el("div", "syntax-grid");
    for (const template of notes) {
      const card = el("div", "syntax-note");
      card.append(el("h3", null, `${template.label} export`));
      card.append(el("p", null, template.note));
      list.append(card);
    }
    node.append(list);
  }

  content.append(node);
}

function renderDocumentPage() {
  const node = section("document-page", "Page layout");
  node.append(
    el(
      "p",
      "docs-lede",
      "Page configuration is declarative and optional. Without a page(...) block a document uses A4, portrait, 25 mm margins, and one column. Lengths accept mm, cm, in, pt, and px; the writer applies the same geometry to the browser's print layout."
    )
  );

  const table = el("table", "operator-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["size", "Dimensions", "LaTeX option"]) headRow.append(el("th", null, label));
  head.append(headRow);
  table.append(head);

  const body = el("tbody");
  for (const [name, size] of Object.entries(PAGE_SIZES)) {
    const row = el("tr");
    row.append(el("td", "operator-symbol", name));
    row.append(el("td", null, `${size.width} × ${size.height} mm`));
    row.append(el("td", "operator-example", size.latex));
    body.append(row);
  }
  table.append(body);
  node.append(table);

  node.append(
    code(
      "pre",
      "example-source docs-code-block",
      'page({\n  size: "A4",\n  orientation: "portrait",\n  margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" },\n  columns: 2\n})',
      { fields: true }
    )
  );

  content.append(node);
}

function fieldsTable(fields) {
  const table = el("table", "args-table");
  const body = el("tbody");
  for (const field of fields) {
    const row = el("tr");
    row.dataset.haystack = [
      field.name,
      field.scope,
      field.type,
      field.summary,
      field.description,
      field.defaultValue,
      ...(field.values ?? []),
      ...(field.valueGroups ?? []).flatMap((group) => [
        group.label,
        group.defaultValue,
        ...group.values
      ])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const nameCell = el("td");
    nameCell.append(el("code", null, field.name));
    row.append(nameCell);
    row.append(el("td", "arg-type", field.type ?? ""));
    const description = el("td");
    description.append(document.createTextNode(field.summary));
    if (field.description) description.append(document.createTextNode(` ${field.description}`));
    const groups = field.valueGroups?.length
      ? field.valueGroups
      : field.values?.length
        ? [{ label: "Values", values: field.values }]
        : [];
    for (const group of groups) {
      const suffix = group.defaultValue ? ` (default ${group.defaultValue})` : "";
      description.append(
        document.createTextNode(` ${group.label}${suffix}: ${group.values.join(", ")}.`)
      );
    }
    if (field.defaultValue) {
      description.append(document.createTextNode(` Default: ${field.defaultValue}.`));
    }
    if (field.example) description.append(code("code", "field-example", field.example, { fields: true }));
    row.append(description);
    body.append(row);
  }
  table.append(body);
  return table;
}

function referenceTypesTable() {
  const table = el("table", "operator-table");
  const head = el("thead");
  const headRow = el("tr");
  for (const label of ["type", "Required fields", "Optional fields"]) headRow.append(el("th", null, label));
  head.append(headRow);
  table.append(head);

  const body = el("tbody");
  for (const [name, spec] of Object.entries(BIBLIOGRAPHY_TYPES)) {
    const row = el("tr");
    row.dataset.haystack = [name, spec.required.join(" "), spec.fields.join(" ")].join(" ").toLowerCase();
    row.append(el("td", "operator-example", name));
    row.append(el("td", "operator-example", spec.required.join(", ")));
    const optional = spec.fields.filter((field) => !spec.required.includes(field));
    row.append(el("td", "operator-example", optional.length > 0 ? optional.join(", ") : "—"));
    body.append(row);
  }
  table.append(body);
  return table;
}

function renderDocumentFields() {
  const groups = groupFieldsByScope();
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  const node = section("document-fields", "Metadata and option fields", total);
  node.append(
    el(
      "p",
      "docs-lede",
      "The names that appear inside objects and named arguments: document metadata, page(...) options, per-side margins, component named arguments, and bibliography entry fields. The writer offers the relevant fields inside each object, and typing \"\" in a field with allowed values or a default opens the value list with the default marked. Hovering a field name shows the same notes."
    )
  );

  for (const group of groups) {
    node.append(el("h3", "docs-subhead", group.label));
    node.append(fieldsTable(group.items));
  }

  node.append(el("h3", "docs-subhead", "Reference types"));
  node.append(
    el(
      "p",
      "docs-lede",
      'Every bibliography entry needs a unique key, an author, a title, and a year. type (default "misc") selects the reference type; the table shows the extra required field and the optional fields for each type.'
    )
  );
  node.append(referenceTypesTable());

  content.append(node);
}

function renderDocumentExample(example) {
  const wrapper = el("div", "example");

  const head = el("div", "example-head");
  head.append(el("span", "example-note", example.note ?? "Example"));

  const actions = el("div", "example-actions");

  const copyButton = el("button", "mini-button", "Copy");
  copyButton.type = "button";
  copyButton.addEventListener("click", () => copyText(example.source, "Example copied"));
  actions.append(copyButton);

  const tryLink = el("a", "mini-button", "Open in writer");
  tryLink.href = `/web/document.html#src=${encodeURIComponent(example.source)}`;
  actions.append(tryLink);

  head.append(actions);

  const body = el("div", "example-body document-example-body");
  body.append(code("pre", "example-source", example.source));
  wrapper.append(head, body);
  return wrapper;
}

function componentCard(doc) {
  const card = el("article", "function-card");
  card.id = `component-${doc.name}`;

  const head = el("div", "function-card-head");
  head.append(el("h3", null, doc.name));
  head.append(el("code", "signature", doc.signature));
  head.append(el("span", "badge kind-component", "component"));
  head.append(el("span", "badge badge-role", doc.role));
  card.append(head);

  card.append(el("p", "function-summary", doc.summary));
  if (doc.description) card.append(el("p", "function-description", doc.description));

  if (doc.args?.length) card.append(argsTable("Arguments", doc.args));
  if (doc.named?.length) card.append(argsTable("Named arguments", doc.named));

  if (doc.examples?.length) {
    const list = el("div", "example-list");
    for (const example of doc.examples) list.append(renderDocumentExample(example));
    card.append(list);
  }

  card.dataset.haystack = [
    doc.name,
    doc.signature,
    doc.summary,
    doc.category,
    doc.role,
    ...(doc.args ?? []).map((arg) => arg.name),
    ...(doc.named ?? []).map((arg) => arg.name)
  ]
    .join(" ")
    .toLowerCase();
  return card;
}

function renderComponents() {
  const groups = groupComponentsByCategory();
  addNavSection(
    "Document components",
    groups.map((group) => ({ label: group.category, id: `components-${slugify(group.category)}` }))
  );

  for (const group of groups) {
    const node = section(`components-${slugify(group.category)}`, group.category, group.items.length);
    for (const doc of group.items) node.append(componentCard(doc));
    content.append(node);
  }
}

function setupSearch() {
  const status = el("p", "docs-search-status");
  status.hidden = true;
  status.setAttribute("aria-live", "polite");

  const empty = el("div", "search-empty");
  empty.textContent =
    "No functions, constants, Greek letters, named symbols, LaTeX mappings, fields, components, or syntax notes match that search.";
  empty.hidden = true;
  const anchor = content.children[0];
  if (anchor) anchor.after(status, empty);
  else content.append(status, empty);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    for (const unit of content.querySelectorAll("[data-haystack]")) {
      const matches = query === "" || unit.dataset.haystack.includes(query);
      unit.hidden = !matches;
      if (matches) visible += 1;
    }
    for (const node of content.querySelectorAll("[data-card-section]")) {
      const anyVisible = [...node.querySelectorAll("[data-haystack]")].some((unit) => !unit.hidden);
      // Sections that hold only tables (syntax, templates, page layout) have no
      // searchable units; keep them visible until a query narrows the page.
      node.hidden = query !== "" && !anyVisible;
    }
    status.hidden = query === "" || visible === 0;
    status.textContent =
      visible > 0 ? `${visible} matching ${visible === 1 ? "entry" : "entries"}` : "";
    empty.hidden = visible > 0;
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || searchInput.value === "") return;
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
  });
}

function setupNavToggle() {
  const toggle = document.getElementById("docs-nav-toggle");
  if (!toggle) return;

  const panel = toggle.closest(".docs-nav");
  const setOpen = (open) => {
    panel.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a") && window.matchMedia("(max-width: 980px)").matches) {
      setOpen(false);
    }
  });
}

function setupNavHighlight() {
  const links = [...nav.querySelectorAll("a")];
  const sections = links
    .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);

  function update() {
    let current = sections[0];
    for (const candidate of sections) {
      if (candidate.getBoundingClientRect().top <= 130) current = candidate;
    }
    for (const link of links) {
      const active = current !== undefined && link.getAttribute("href") === `#${current.id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

renderHero();
renderFunctions();
renderConstants();
renderGreek();
renderSymbols();
renderOperators();
renderLatexReference();
renderSyntax();
renderDocumentAuthoring();
renderDocumentTemplates();
renderDocumentPage();
renderDocumentFields();
renderComponents();
setupSearch();
setupNavToggle();
setupNavHighlight();

// The page is rendered after load, so the browser's initial anchor scroll runs
// too early. Re-align the requested section once the content exists.
if (location.hash) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
}
