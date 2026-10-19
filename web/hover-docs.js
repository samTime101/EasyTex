import { compile, parse, validate } from "../src/index.js";
import { docsFor } from "../src/docs/index.js";
import { TextareaMirror } from "./textarea-geometry.js";

const WORD_CHAR = /[A-Za-z0-9_]/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;
const contentCache = new Map();

let cachedSource = null;
let cachedAnalysis = null;

function contains(span, offset) {
  return offset >= span.start.offset && offset < span.end.offset;
}

function analyze(source) {
  if (cachedSource === source) return cachedAnalysis;
  cachedSource = source;

  const parsed = parse(source);
  if (parsed.diagnostics.length > 0 || !parsed.ast) {
    cachedAnalysis = null;
    return cachedAnalysis;
  }
  validate(parsed.ast, { complex: true });

  const values = [];
  const calls = [];

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node.kind === "Call") {
      calls.push({ name: node.callee.name, span: node.callee.span });
      for (const arg of node.args) walk(arg);
      return;
    }
    if (node.kind === "Identifier") {
      values.push({ name: node.name, span: node.span, binding: node.binding });
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "span") continue;
      if (value && typeof value === "object") walk(value);
    }
  }

  walk(parsed.ast);
  cachedAnalysis = { values, calls };
  return cachedAnalysis;
}

function isWordChar(ch) {
  return ch !== undefined && WORD_CHAR.test(ch);
}

function wordAt(value, offset) {
  let start = offset;
  let end = offset;
  while (start > 0 && isWordChar(value[start - 1])) start -= 1;
  while (end < value.length && isWordChar(value[end])) end += 1;
  const word = value.slice(start, end);
  return IDENTIFIER.test(word) ? word : null;
}

function buildContent(doc) {
  if (contentCache.has(doc.name)) return contentCache.get(doc.name);

  const wrapper = document.createElement("div");

  const head = document.createElement("div");
  head.className = "hover-head";
  const signature = document.createElement("code");
  signature.className = "hover-signature";
  signature.textContent = doc.signature;
  const kind = document.createElement("span");
  kind.className = "hover-kind";
  kind.textContent = doc.kind === "constant" ? "constant" : "function";
  head.append(signature, kind);
  wrapper.append(head);

  const summary = document.createElement("p");
  summary.className = "hover-summary";
  summary.textContent = doc.summary;
  wrapper.append(summary);

  if (doc.args?.length) {
    const list = document.createElement("ul");
    list.className = "hover-args";
    for (const arg of doc.args) {
      const item = document.createElement("li");
      const name = document.createElement("code");
      name.textContent = arg.name;
      const type = document.createElement("span");
      type.className = "hover-type";
      type.textContent = arg.type;
      const description = document.createElement("span");
      description.textContent = ` \u2014 ${arg.description}`;
      item.append(name, type, description);
      list.append(item);
    }
    wrapper.append(list);
  }

  const example = doc.examples?.[0];
  if (example) {
    const block = document.createElement("div");
    block.className = "hover-example";
    const source = document.createElement("code");
    source.textContent = example.source;
    block.append(source);

    const preview = document.createElement("div");
    preview.className = "hover-preview";
    const result = compile(example.source);
    if (result.mathml) preview.innerHTML = result.mathml;
    block.append(preview);
    wrapper.append(block);
  }

  contentCache.set(doc.name, wrapper);
  return wrapper;
}

export function createHoverDocs({ textarea, container, isSuppressed = () => false }) {
  const mirror = new TextareaMirror(textarea);
  const tooltip = document.createElement("div");
  tooltip.className = "hover-docs hidden";
  tooltip.setAttribute("role", "tooltip");
  container.append(tooltip);

  let frame = null;
  let lastWord = null;

  function hide() {
    lastWord = null;
    tooltip.classList.add("hidden");
  }

  function position(clientX, clientY) {
    const bounds = container.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let left = clientX - bounds.left + 16;
    let top = clientY - bounds.top + 18;

    if (left + width > bounds.width - 8) {
      left = Math.max(8, bounds.width - width - 8);
    }
    if (top + height > bounds.height - 8) {
      top = Math.max(8, clientY - bounds.top - height - 14);
    }
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function update(event) {
    if (isSuppressed()) {
      hide();
      return;
    }
    const offset = mirror.offsetFromPoint(event.clientX, event.clientY);
    if (offset === null) {
      hide();
      return;
    }
    const word = wordAt(textarea.value, offset);
    if (!word) {
      hide();
      return;
    }
    const doc = docsFor(word);
    if (!doc) {
      hide();
      return;
    }

    const analysis = analyze(textarea.value);
    if (analysis) {
      const valueNode = analysis.values.find(
        (entry) => entry.name === word && contains(entry.span, offset)
      );
      const callNode = analysis.calls.find(
        (entry) => entry.name === word && contains(entry.span, offset)
      );
      const allowed = valueNode ? valueNode.binding === "constant" : Boolean(callNode);
      if (!allowed) {
        hide();
        return;
      }
    }

    if (lastWord !== word) {
      tooltip.replaceChildren(buildContent(doc));
      lastWord = word;
    }
    tooltip.classList.remove("hidden");
    position(event.clientX, event.clientY);
  }

  textarea.addEventListener("mousemove", (event) => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      update(event);
    });
  });

  textarea.addEventListener("mouseleave", hide);
  textarea.addEventListener("scroll", hide);
  textarea.addEventListener("blur", hide);
  textarea.addEventListener("input", hide);

  return { hide };
}
