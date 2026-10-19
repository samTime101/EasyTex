// Document Writer: compile MathScript documents, preview the rendered sheet,
// inspect the LaTeX and standalone HTML exports, and print or download them.

import { compileDocument, renderStandaloneHTML, parseLength, SHEET_CSS } from "../src/index.js";
import { initTheme } from "./theme.js";
import { createAutocomplete } from "./autocomplete.js";
import { createHoverDocs } from "./hover-docs.js";
import { DEFAULT_DOCUMENT_SOURCE, DOCUMENT_EXAMPLES } from "./document-examples.js";

const STORAGE_KEY = "easytex.document";
const WRITER_KINDS = ["component", "function", "constant"];
const HOVER_KINDS = [...WRITER_KINDS, "field"];
const DEFAULT_SUBTITLE = "Rendered document, LaTeX, and standalone HTML";

const editor = document.getElementById("editor");
const editorShell = document.querySelector(".editor-shell");
const diagnosticsEl = document.getElementById("diagnostics");
const statusEl = document.getElementById("status");
const examplesEl = document.getElementById("examples");
const themeToggle = document.getElementById("theme-toggle");
const templateLabelEl = document.getElementById("template-label");
const tabs = [...document.querySelectorAll(".tab")];
const docPreviewEl = document.getElementById("doc-preview");
const sheetEl = document.getElementById("sheet");
const staleNoticeEl = document.getElementById("stale-notice");
const codeOutputEl = document.getElementById("code-output");
const emptyStateEl = document.getElementById("empty-state");
const timingEl = document.getElementById("timing");
const statsEl = document.getElementById("doc-stats");
const pageInfoEl = document.getElementById("page-info");
const copyButton = document.getElementById("copy");
const printButton = document.getElementById("print");
const downloadButton = document.getElementById("download");
const downloadHtmlButton = document.getElementById("download-html");

const EMPTY_STATE_HTML = emptyStateEl.innerHTML;

const printStyle = document.createElement("style");
printStyle.id = "print-page";
document.head.append(printStyle);

// The rendered sheet carries its own stylesheet, shared with the HTML export.
const sheetStyle = document.createElement("style");
sheetStyle.id = "sheet-styles";
sheetStyle.textContent = SHEET_CSS;
document.head.append(sheetStyle);

let activeTab = "document";
let lastResult = null;
let lastDocument = null;
let lastHtml = null;
let lastLatex = null;
let lastStandalone = null;
let renderTimer = null;
let toastTimer = null;
let frame = null;

// --------------------------------------------------------------------- source

function hashSource() {
  if (!location.hash.startsWith("#src=")) return null;
  try {
    return decodeURIComponent(location.hash.slice(5));
  } catch {
    return null;
  }
}

function loadSource() {
  const fromHash = hashSource();
  if (fromHash && fromHash.trim()) {
    history.replaceState(null, "", location.pathname + location.search);
    return fromHash;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_DOCUMENT_SOURCE;
  } catch {
    return DEFAULT_DOCUMENT_SOURCE;
  }
}

function saveSource(source) {
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // Storage may be unavailable; editing still works.
  }
}

// --------------------------------------------------------------------- render

function severityLists(diagnostics) {
  const errors = [];
  const warnings = [];
  for (const entry of diagnostics) {
    if (entry.severity === "warning") warnings.push(entry);
    else errors.push(entry);
  }
  return { errors, warnings };
}

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function renderNow() {
  if (!editor.value.trim()) {
    lastResult = null;
    lastDocument = null;
    lastHtml = null;
    lastLatex = null;
    lastStandalone = null;
    statusEl.textContent = "Empty";
    statusEl.classList.remove("error");
    diagnosticsEl.replaceChildren();
    timingEl.textContent = "";
    statsEl.textContent = "";
    pageInfoEl.textContent = "";
    templateLabelEl.textContent = DEFAULT_SUBTITLE;
    sheetEl.replaceChildren();
    staleNoticeEl.classList.add("hidden");
    docPreviewEl.classList.remove("is-stale");
    emptyStateEl.innerHTML = EMPTY_STATE_HTML;
    updateOutput();
    autocomplete.reposition();
    saveSource("");
    return;
  }

  const started = performance.now();
  lastResult = compileDocument(editor.value, { complex: true });
  const elapsed = performance.now() - started;
  const { errors, warnings } = severityLists(lastResult.diagnostics);

  statusEl.textContent =
    errors.length > 0
      ? `${plural(errors.length, "error")}${warnings.length ? `, ${plural(warnings.length, "warning")}` : ""}`
      : warnings.length
        ? plural(warnings.length, "warning")
        : "Valid";
  statusEl.classList.toggle("error", errors.length > 0);

  renderDiagnostics(lastResult.diagnostics);
  timingEl.textContent = `${elapsed.toFixed(1)} ms`;

  if (lastResult.html && lastResult.document) {
    const doc = lastResult.document;
    lastDocument = doc;
    templateLabelEl.textContent = `${doc.template.label} · ${doc.page.size} ${doc.page.orientation}`;
    statsEl.textContent = statsText(doc);
    pageInfoEl.textContent = pageText(doc);
    sheetEl.innerHTML = lastResult.html;
    lastHtml = lastResult.html;
    lastLatex = lastResult.latex;
    lastStandalone = renderStandaloneHTML({
      title: doc.metadata.titleText || "MathScript document",
      html: lastResult.html,
      language: doc.metadata.language || "en"
    });
    applyPrintPage(doc);
    fitSheet();
    staleNoticeEl.classList.add("hidden");
    docPreviewEl.classList.remove("is-stale");
  } else {
    const stale = Boolean(lastHtml);
    docPreviewEl.classList.toggle("is-stale", stale);
    staleNoticeEl.classList.toggle("hidden", !stale);
    if (stale) {
      staleNoticeEl.textContent =
        errors.length > 0
          ? "Preview shows the last valid version — fix the diagnostics to update it."
          : "Preview shows the last valid version.";
    } else {
      lastDocument = null;
      lastLatex = null;
      lastStandalone = null;
      templateLabelEl.textContent = DEFAULT_SUBTITLE;
      statsEl.textContent = "";
      pageInfoEl.textContent = "";
    }
  }

  if (!lastHtml && (errors.length > 0 || warnings.length > 0)) {
    emptyStateEl.innerHTML = errorStateHtml(errors[0] ?? warnings[0]);
  } else if (!lastHtml) {
    emptyStateEl.innerHTML = EMPTY_STATE_HTML;
  }

  updateOutput();
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => autocomplete.reposition());
  saveSource(editor.value);
}

function statsText(doc) {
  const stats = doc.stats;
  const parts = [];
  if (stats.sections) parts.push(plural(stats.sections, "section"));
  if (stats.equations) parts.push(plural(stats.equations, "equation"));
  if (stats.figures) parts.push(plural(stats.figures, "figure"));
  if (stats.tables) parts.push(plural(stats.tables, "table"));
  if (stats.listings) parts.push(plural(stats.listings, "listing"));
  if (stats.theorems) parts.push(plural(stats.theorems, "result"));
  if (stats.citations) parts.push(plural(stats.citations, "citation"));
  if (doc.bibliography.length) parts.push(plural(doc.bibliography.length, "reference"));
  return parts.join(" · ");
}

function pageText(doc) {
  const margins = doc.page.margins;
  const same = margins.top === margins.right && margins.right === margins.bottom && margins.bottom === margins.left;
  const margin = same ? `${margins.top} margins` : `margins ${margins.top}/${margins.right}/${margins.bottom}/${margins.left}`;
  return doc.page.columns > 1 ? `${margin} · ${doc.page.columns} columns` : margin;
}

function errorStateHtml(entry) {
  const message = entry ? escapeHtml(entry.message) : "Unknown error";
  return `
    <span class="empty-mark error-mark" aria-hidden="true">!</span>
    <p class="error-title">The document is not valid yet.</p>
    <p class="muted">${message}</p>
    <p class="muted">Click a diagnostic below the editor to jump to it.</p>
  `;
}

function renderDiagnostics(diagnostics) {
  diagnosticsEl.replaceChildren();
  for (const entry of diagnostics) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = entry.severity === "warning" ? "diagnostic warning" : "diagnostic";
    button.title = "Select this range in the editor";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = entry.severity === "warning" ? `${entry.category} · warning` : entry.category;

    const message = document.createElement("span");
    message.className = "message";
    message.textContent = entry.message;

    const where = document.createElement("span");
    where.className = "where";
    where.textContent = `${entry.span?.start?.line ?? 1}:${entry.span?.start?.column ?? 1}`;

    button.append(tag, message, where);
    button.addEventListener("click", () => selectDiagnostic(entry));
    diagnosticsEl.append(button);
  }
}

function selectDiagnostic(entry) {
  editor.focus();
  if (!entry.span) return;
  const start = entry.span.start?.offset ?? 0;
  const end = entry.span.end?.offset ?? start;
  editor.setSelectionRange(start, Math.max(start, end));
  const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24;
  const line = (entry.span.start?.line ?? 1) - 1;
  editor.scrollTop = Math.max(0, line * lineHeight - editor.clientHeight / 2);
}

// --------------------------------------------------------------------- output

function updateOutput() {
  for (const tab of tabs) {
    const selected = tab.dataset.tab === activeTab;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }

  const hasSheet = Boolean(lastHtml);
  const wantsSheet = activeTab === "document";

  docPreviewEl.classList.toggle("hidden", !wantsSheet);
  emptyStateEl.classList.toggle("hidden", !wantsSheet || hasSheet);
  codeOutputEl.classList.toggle("hidden", wantsSheet);

  if (!wantsSheet) {
    if (activeTab === "latex") {
      codeOutputEl.textContent =
        lastLatex ?? "% The LaTeX export is unavailable while the document has errors.";
    } else {
      codeOutputEl.textContent =
        lastStandalone ?? "<!-- The HTML export is unavailable while the document has errors. -->";
    }
  }
}

function currentText() {
  if (activeTab === "latex") return lastLatex ?? "";
  return lastStandalone ?? "";
}

function applyPrintPage(doc) {
  const toMm = (value) => {
    const parsed = parseLength(value ?? "");
    return parsed.ok ? `${parsed.mm}mm` : "20mm";
  };
  const margins = doc.page.margins;
  printStyle.textContent = [
    "@page {",
    `  size: ${doc.page.widthMm}mm ${doc.page.heightMm}mm;`,
    `  margin: ${toMm(margins.top)} ${toMm(margins.right)} ${toMm(margins.bottom)} ${toMm(margins.left)};`,
    "}"
  ].join("\n");
}

// The preview shows the sheet at its real page width, scaled down to fit the
// column. Below roughly half size reflowing reads better than shrinking.
function fitSheet() {
  const sheet = sheetEl.firstElementChild;
  if (!sheet || !lastHtml) return;
  const available = docPreviewEl.clientWidth - 52;
  if (available <= 0) return;
  const declared = parseLength(getComputedStyle(sheet).getPropertyValue("--ms-page-width"));
  const pageWidth = declared.ok ? declared.px : sheet.offsetWidth;
  const zoom = available / pageWidth;
  sheet.style.zoom = zoom < 0.99 && zoom >= 0.45 ? zoom.toFixed(3) : "";
}

if (typeof ResizeObserver === "function") {
  new ResizeObserver(() => fitSheet()).observe(docPreviewEl);
}

function slug(text) {
  const slugged = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slugged || "easytex-document";
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTex() {
  if (!lastLatex) {
    toast("LaTeX export is unavailable while the document has errors");
    return;
  }
  const name = `${slug(lastDocument?.metadata.titleText)}.tex`;
  download(name, lastLatex, "text/x-tex;charset=utf-8");
  toast(`Downloaded ${name}`);
}

function downloadHtml() {
  if (!lastStandalone) {
    toast("HTML export is unavailable while the document has errors");
    return;
  }
  const name = `${slug(lastDocument?.metadata.titleText)}.html`;
  download(name, lastStandalone, "text/html;charset=utf-8");
  toast(`Downloaded ${name}`);
}

function printDocument() {
  if (!lastHtml) {
    toast("Nothing to print yet");
    return;
  }
  if (activeTab !== "document") {
    activeTab = "document";
    updateOutput();
  }
  window.print();
}

async function copyCurrent() {
  const text = currentText();
  if (!text) {
    toast("Nothing to copy yet");
    return;
  }
  const what = activeTab === "latex" ? "LaTeX" : "HTML";
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied`);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    toast("Copied");
  }
}

function toast(message) {
  let element = document.querySelector(".toast");
  if (!element) {
    element = document.createElement("div");
    element.className = "toast";
    document.body.append(element);
  }
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 1600);
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderNow, 160);
}

// Missing images degrade to a readable placeholder instead of a broken icon.
sheetEl.addEventListener(
  "error",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    const placeholder = document.createElement("span");
    placeholder.className = "ms-image-missing";
    placeholder.textContent = `image not found: ${target.getAttribute("src") ?? ""}`;
    target.replaceWith(placeholder);
  },
  true
);

// -------------------------------------------------------------------- startup

function populateExamples() {
  DOCUMENT_EXAMPLES.forEach((example, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = example.label;
    examplesEl.append(option);
  });
}

const autocomplete = createAutocomplete({
  textarea: editor,
  container: editorShell,
  kinds: WRITER_KINDS
});
const hoverDocs = createHoverDocs({
  textarea: editor,
  container: editorShell,
  isSuppressed: () => autocomplete.isOpen(),
  kinds: HOVER_KINDS
});

editor.value = loadSource();
populateExamples();
initTheme(themeToggle);
renderNow();

editor.addEventListener("input", () => {
  scheduleRender();
  autocomplete.handleInput();
});

document.addEventListener("selectionchange", () => {
  if (document.activeElement === editor) autocomplete.handleSelectionChange();
});

editor.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && (event.key === " " || event.code === "Space")) {
    event.preventDefault();
    autocomplete.openAll();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    renderNow();
    return;
  }
  if (autocomplete.handleKey(event)) return;
  if (event.key === "Tab" && !event.shiftKey) {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("  ", start, end, "end");
    scheduleRender();
  }
});

examplesEl.addEventListener("change", () => {
  const index = Number(examplesEl.value);
  const example = DOCUMENT_EXAMPLES[index];
  if (!example) return;
  editor.value = example.source;
  editor.scrollTop = 0;
  editor.setSelectionRange(0, 0);
  examplesEl.value = "";
  renderNow();
  editor.focus();
});

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    updateOutput();
  });
}

copyButton.addEventListener("click", copyCurrent);
printButton.addEventListener("click", printDocument);
downloadButton.addEventListener("click", downloadTex);
downloadHtmlButton.addEventListener("click", downloadHtml);

window.addEventListener("beforeprint", () => {
  if (lastDocument) applyPrintPage(lastDocument);
});

// A link may load a new document without a full page reload.
window.addEventListener("hashchange", () => {
  const source = hashSource();
  if (!source) return;
  history.replaceState(null, "", location.pathname + location.search);
  editor.value = source;
  editor.scrollTop = 0;
  editor.setSelectionRange(0, 0);
  renderNow();
  editor.focus();
});
