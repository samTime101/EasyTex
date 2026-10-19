import { compile } from "../src/index.js";
import {
  SYNTAX_NOTES,
  PRECEDENCE_EXAMPLES,
  groupFunctionsByCategory,
  groupConstantsByCategory,
  groupOperatorsByCategory
} from "../src/docs/index.js";
import { initTheme } from "./theme.js";

const content = document.getElementById("docs-content");
const nav = document.getElementById("docs-nav");
const searchInput = document.getElementById("docs-search");
const themeToggle = document.getElementById("theme-toggle");

initTheme(themeToggle);

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

  if (doc.args?.length) {
    const table = el("table", "args-table");
    const caption = el("caption", null, "Arguments");
    table.append(caption);
    const body = el("tbody");
    for (const arg of doc.args) {
      const row = el("tr");
      const nameCell = el("td");
      nameCell.append(el("code", null, arg.name));
      row.append(nameCell, el("td", "arg-type", arg.type), el("td", null, arg.description));
      body.append(row);
    }
    table.append(body);
    card.append(table);
  }

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
      "Every function, its arguments, and a worked example. MathScript is a function-based mathematical language: calls are name(arg1, arg2, …), ordinary arithmetic stays ordinary, and source is separate from rendering."
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

function setupSearch() {
  const empty = el("div", "search-empty");
  empty.textContent = "No functions or constants match that search.";
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
setupSearch();
setupNavHighlight();
