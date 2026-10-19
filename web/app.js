import { compile } from "../src/index.js";
import { initTheme } from "./theme.js";

const EXAMPLES = [
  { label: "Sum of squares", source: "sum(i, 1, n, i^2)" },
  { label: "Nested sum and product", source: "sum(i, 1, n, product(j, 1, i, j))" },
  { label: "Quadratic formula", source: "x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)" },
  {
    label: "Gaussian density",
    source: "frac(1, sqrt(2*pi*sigma^2)) * exp(frac(-(x - mu)^2, 2*sigma^2))"
  },
  { label: "Definite integral", source: "integral(x, 0, 1, x^2)" },
  { label: "Limit", source: "limit(x, 0, sin(x)/x)" },
  { label: "Derivative", source: "derivative(x, x^2 + 1)" },
  { label: "Partial derivative", source: "partial(x, x^2 + y^2)" },
  { label: "Matrix", source: "matrix([[1, 2], [3, 4]])" },
  { label: "Column vector", source: "vector([x, y, z])" },
  { label: "Root and absolute value", source: "root(abs(x - 3), 3)" },
  { label: "Error: implicit multiplication", source: "2x" }
];

const DEFAULT_SOURCE = "sum(i, 1, n, i^2)";

const editor = document.getElementById("editor");
const diagnosticsEl = document.getElementById("diagnostics");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const codeOutputEl = document.getElementById("code-output");
const emptyStateEl = document.getElementById("empty-state");
const examplesEl = document.getElementById("examples");
const complexEl = document.getElementById("complex-mode");
const themeToggle = document.getElementById("theme-toggle");
const copyButton = document.getElementById("copy");
const downloadButton = document.getElementById("download");
const timingEl = document.getElementById("timing");
const nodeCountEl = document.getElementById("node-count");
const tabs = [...document.querySelectorAll(".tab")];

let activeTab = "preview";
let lastResult = null;
let renderTimer = null;
let toastTimer = null;

const EMPTY_HTML = `
  <span class="empty-mark" aria-hidden="true">&#8730;</span>
  <p>Start typing a MathScript expression.</p>
  <p class="muted">Try <code>sum(i, 1, n, i^2)</code> or choose an example above.</p>
`;

function loadSource() {
  try {
    return localStorage.getItem("easytex.source") || DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

function saveSource(source) {
  try {
    localStorage.setItem("easytex.source", source);
  } catch {
    // Storage may be unavailable; editing still works.
  }
}

function countNodes(node) {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((sum, item) => sum + countNodes(item), 0);
  let count = 1;
  for (const [key, value] of Object.entries(node)) {
    if (key === "span" || key === "callee" || key === "binding" || key === "type" || key === "reported") continue;
    if (value && typeof value === "object") count += countNodes(value);
  }
  return count;
}

function astForDisplay(ast) {
  return JSON.stringify(
    ast,
    (key, value) => (key === "span" || key === "reported" ? undefined : value),
    2
  );
}

function renderNow() {
  if (!editor.value.trim()) {
    lastResult = null;
    statusEl.textContent = "Empty";
    statusEl.classList.remove("error");
    diagnosticsEl.replaceChildren();
    timingEl.textContent = "";
    nodeCountEl.textContent = "";
    showEmpty();
    saveSource(editor.value);
    return;
  }

  const started = performance.now();
  lastResult = compile(editor.value, { complex: complexEl.checked });
  const elapsed = performance.now() - started;
  const errors = lastResult.diagnostics;
  const hasErrors = errors.length > 0 || !lastResult.ast;

  statusEl.textContent = hasErrors
    ? `${errors.length} ${errors.length === 1 ? "issue" : "issues"}`
    : "Valid";
  statusEl.classList.toggle("error", hasErrors);

  renderDiagnostics(errors);
  timingEl.textContent = `${elapsed.toFixed(1)} ms`;
  nodeCountEl.textContent = lastResult.ast ? `${countNodes(lastResult.ast)} AST nodes` : "";

  if (hasErrors) {
    showErrors(errors);
  } else {
    showSuccess();
  }

  updateOutput();
  saveSource(editor.value);
}

function renderDiagnostics(errors) {
  diagnosticsEl.replaceChildren();
  for (const error of errors) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "diagnostic";
    button.title = "Select this range in the editor";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = error.category;

    const message = document.createElement("span");
    message.className = "message";
    message.textContent = error.message;

    const where = document.createElement("span");
    where.className = "where";
    where.textContent = `${error.span?.start?.line ?? 1}:${error.span?.start?.column ?? 1}`;

    button.append(tag, message, where);
    button.addEventListener("click", () => selectDiagnostic(error));
    diagnosticsEl.append(button);
  }
}

function selectDiagnostic(error) {
  const start = error.span?.start?.offset ?? 0;
  const end = error.span?.end?.offset ?? start;
  editor.focus();
  editor.setSelectionRange(start, Math.max(start, end));
  const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 24;
  const line = (error.span?.start?.line ?? 1) - 1;
  editor.scrollTop = Math.max(0, line * lineHeight - editor.clientHeight / 2);
}

function showEmpty() {
  previewEl.innerHTML = "";
  previewEl.classList.add("hidden");
  codeOutputEl.classList.add("hidden");
  emptyStateEl.classList.remove("hidden");
  emptyStateEl.innerHTML = EMPTY_HTML;
}

function showErrors(errors) {
  previewEl.innerHTML = "";
  previewEl.classList.add("hidden");
  codeOutputEl.classList.add("hidden");
  emptyStateEl.classList.remove("hidden");
  const first = errors[0];
  emptyStateEl.innerHTML = `
    <span class="empty-mark error-mark" aria-hidden="true">!</span>
    <p class="error-title">The expression is not valid yet.</p>
    <p class="muted">${escapeHtml(first?.message ?? "Unknown error")}</p>
    <p class="muted">Click a diagnostic below the editor to jump to it.</p>
  `;
}

function showSuccess() {
  emptyStateEl.classList.add("hidden");
  previewEl.classList.remove("hidden");
  previewEl.innerHTML = lastResult.mathml ?? "";
}

function updateOutput() {
  for (const tab of tabs) {
    const selected = tab.dataset.tab === activeTab;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }

  if (!lastResult || !lastResult.ast || lastResult.diagnostics.length > 0) {
    return;
  }

  if (activeTab === "preview") {
    previewEl.classList.remove("hidden");
    codeOutputEl.classList.add("hidden");
    emptyStateEl.classList.add("hidden");
  } else {
    previewEl.classList.add("hidden");
    emptyStateEl.classList.add("hidden");
    codeOutputEl.classList.remove("hidden");
    if (activeTab === "latex") codeOutputEl.textContent = lastResult.latex ?? "";
    if (activeTab === "mathml") codeOutputEl.textContent = lastResult.mathml ?? "";
    if (activeTab === "ast") codeOutputEl.textContent = astForDisplay(lastResult.ast);
  }
}

function currentText() {
  if (!lastResult) return "";
  if (activeTab === "latex") return lastResult.latex ?? "";
  if (activeTab === "mathml") return lastResult.mathml ?? "";
  if (activeTab === "ast") return astForDisplay(lastResult.ast);
  return lastResult.latex ?? "";
}

function downloadTex() {
  if (!lastResult?.latex) return;
  const body = `\\documentclass{article}
\\usepackage{amsmath,amssymb}
\\begin{document}
\\[
${lastResult.latex}
\\]
\\end{document}
`;
  const blob = new Blob([body], { type: "text/x-tex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "easytex.tex";
  link.click();
  URL.revokeObjectURL(url);
  toast("Downloaded easytex.tex");
}

async function copyCurrent() {
  const text = currentText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast(activeTab === "preview" ? "LaTeX copied" : `${activeTab} copied`);
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

function populateExamples() {
  for (const example of EXAMPLES) {
    const option = document.createElement("option");
    option.value = example.source;
    option.textContent = example.label;
    examplesEl.append(option);
  }
}

editor.value = loadSource();
populateExamples();
initTheme(themeToggle);
renderNow();

editor.addEventListener("input", scheduleRender);
editor.addEventListener("scroll", () => {
  // Kept for future syntax highlighting; the plain textarea needs no sync.
});
editor.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    renderNow();
    return;
  }
  if (event.key === "Tab" && !event.shiftKey) {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("  ", start, end, "end");
    scheduleRender();
  }
});

complexEl.addEventListener("change", renderNow);

examplesEl.addEventListener("change", () => {
  if (!examplesEl.value) return;
  editor.value = examplesEl.value;
  examplesEl.value = "";
  renderNow();
  editor.focus();
});

copyButton.addEventListener("click", copyCurrent);
downloadButton.addEventListener("click", downloadTex);

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    updateOutput();
  });
}
