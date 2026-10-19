import { compile, compileDocument, SHEET_CSS } from "../src/index.js";
import {
  SYNTAX_NOTES,
  PRECEDENCE_EXAMPLES,
  groupFunctionsByCategory,
  groupConstantsByCategory,
  groupOperatorsByCategory,
  groupComponentsByCategory,
  groupFieldsByScope
} from "../src/docs/index.js";
import { DOCUMENT_NOTES, TEMPLATES, TEMPLATE_NAMES, PAGE_SIZES } from "../src/document/index.js";
import { initTheme } from "./theme.js";

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

const cards = [];
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
  tryLink.href = `./index.html#src=${encodeURIComponent(example.source)}`;
  actions.append(tryLink);

  head.append(actions);

  const body = el("div", "example-body");
  const source = el("pre", "example-source", example.source);
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
  cards.push(card);
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
  const hero = el("section", "docs-hero");
  hero.append(el("h2", null, "MathScript reference"));
  hero.append(
    el(
      "p",
      null,
      "Every function, its arguments, and a worked example, plus the experimental document layer: templates, page layout, and every block and inline component. MathScript is a function-based mathematical language: calls are name(arg1, arg2, …), ordinary arithmetic stays ordinary, and source is separate from rendering."
    )
  );

  const example = el("div", "docs-hero-example");
  example.append(el("code", null, "x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)"));
  const preview = el("div", "docs-hero-preview");
  const result = compile("x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)");
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
    card.append(el("h3", null, note.title));
    card.append(el("p", null, note.body));
    card.append(el("code", null, note.example));
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
    row.append(el("td", "operator-example", item.source));
    row.append(el("td", null, item.meaning));
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
  writerLink.href = `./document.html#src=${encodeURIComponent(DOCUMENT_SAMPLE)}`;
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
    card.append(el("code", null, note.example));
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
    el(
      "pre",
      "example-source docs-code-block",
      'page({\n  size: "A4",\n  orientation: "portrait",\n  margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" },\n  columns: 2\n})'
    )
  );

  content.append(node);
}

function fieldsTable(fields) {
  const table = el("table", "args-table");
  const body = el("tbody");
  for (const field of fields) {
    const row = el("tr");
    const nameCell = el("td");
    nameCell.append(el("code", null, field.name));
    row.append(nameCell);
    row.append(el("td", "arg-type", field.type ?? ""));
    const description = el("td");
    description.append(document.createTextNode(field.summary));
    if (field.description) description.append(document.createTextNode(` ${field.description}`));
    if (field.values?.length) {
      description.append(document.createTextNode(` Values: ${field.values.join(", ")}.`));
    }
    if (field.example) description.append(el("code", "field-example", field.example));
    row.append(description);
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
      "The names that appear inside objects and named arguments: document metadata, page(...) options, per-side margins, component named arguments, and bibliography entry fields. Hovering one of these names in the writer shows the same notes."
    )
  );

  for (const group of groups) {
    node.append(el("h3", "docs-subhead", group.label));
    node.append(fieldsTable(group.items));
  }

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
  tryLink.href = `./document.html#src=${encodeURIComponent(example.source)}`;
  actions.append(tryLink);

  head.append(actions);

  const body = el("div", "example-body document-example-body");
  body.append(el("pre", "example-source", example.source));
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
  cards.push(card);
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
  const empty = el("div", "search-empty");
  empty.textContent = "No functions, constants, or document components match that search.";
  empty.hidden = true;
  const anchor = content.children[0];
  if (anchor) anchor.after(empty);
  else content.append(empty);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const matches = query === "" || card.dataset.haystack.includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    }
    for (const node of content.querySelectorAll("[data-card-section]")) {
      const anyVisible = [...node.querySelectorAll(".function-card")].some((card) => !card.hidden);
      node.hidden = !anyVisible;
    }
    empty.hidden = visible > 0;
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
      link.classList.toggle(
        "active",
        current !== undefined && link.getAttribute("href") === `#${current.id}`
      );
    }
  }

  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

renderHero();
renderFunctions();
renderConstants();
renderOperators();
renderSyntax();
renderDocumentAuthoring();
renderDocumentTemplates();
renderDocumentPage();
renderDocumentFields();
renderComponents();
setupSearch();
setupNavHighlight();

// The page is rendered after load, so the browser's initial anchor scroll runs
// too early. Re-align the requested section once the content exists.
if (location.hash) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
}
