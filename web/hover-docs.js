import { compile, parse, validate, NAMED_ARGUMENTS } from "../src/index.js";
import { docsFor, fieldDocsFor, FIELD_SCOPE_LABELS } from "../src/docs/index.js";
import { TextareaMirror } from "./textarea-geometry.js";
import { highlightSource } from "./highlight.js";

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
  const fields = [];

  function walk(node, component) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, component);
      return;
    }
    if (node.kind === "Call") {
      calls.push({ name: node.callee.name, span: node.callee.span });
      for (const arg of node.args) walk(arg, node.callee.name);
      return;
    }
    if (node.kind === "Object") {
      for (const entry of node.entries) {
        fields.push({ name: entry.key, span: entry.keySpan });
        walk(entry.value, component);
      }
      return;
    }
    if (
      node.kind === "Relation" &&
      node.operator === "=" &&
      node.left.kind === "Identifier" &&
      NAMED_ARGUMENTS[component]?.has(node.left.name)
    ) {
      fields.push({ name: node.left.name, span: node.left.span });
      walk(node.right, component);
      return;
    }
    if (node.kind === "Identifier") {
      values.push({ name: node.name, span: node.span, binding: node.binding });
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "span") continue;
      if (value && typeof value === "object") walk(value, component);
    }
  }

  walk(parsed.ast, null);
  cachedAnalysis = { values, calls, fields };
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
  const name = value.slice(start, end);
  return IDENTIFIER.test(name) ? { name, start, end } : null;
}

// Fallback for sources that do not parse: a field is a word directly followed
// by ":" or "=", outside any string literal.
function looksLikeField(value, word) {
  if (!/^\s*[:=]/.test(value.slice(word.end, word.end + 80))) return false;
  let quotes = 0;
  for (let index = value.lastIndexOf("\n", word.start - 1) + 1; index < word.start; index += 1) {
    if (value[index] === "\\") {
      index += 1;
      continue;
    }
    if (value[index] === '"') quotes += 1;
  }
  return quotes % 2 === 0;
}

function kindLabel(doc) {
  if (doc.kind === "constant") return "constant";
  if (doc.kind === "symbol") return "symbol";
  if (doc.kind === "component") {
    if (doc.role === "inline") return "inline";
    if (doc.role === "document") return "document";
    return "block";
  }
  return "function";
}

// A labelled, highlighted code block. The example uses the same scanner as
// the editors, so the sample in the card looks like the source in the editor.
function buildExampleBlock(source, { preview = false } = {}) {
  const block = document.createElement("div");
  block.className = "hover-example";

  const label = document.createElement("span");
  label.className = "hover-example-label";
  label.textContent = "Example";

  const code = document.createElement("code");
  code.className = "hover-code";
  code.innerHTML = highlightSource(source, { components: true, fields: true });

  block.append(label, code);

  if (preview) {
    const rendered = document.createElement("div");
    rendered.className = "hover-preview";
    const result = compile(source);
    if (result.mathml) rendered.innerHTML = result.mathml;
    block.append(rendered);
  }

  return block;
}

function buildContent(doc) {
  if (contentCache.has(doc.name)) return contentCache.get(doc.name);

  const wrapper = document.createElement("div");
  wrapper.className = "hover-card";

  const head = document.createElement("div");
  head.className = "hover-head";
  const title = document.createElement("span");
  title.className = "hover-title";
  const name = document.createElement("code");
  name.className = "hover-name";
  name.textContent = doc.name;
  title.append(name);
  const kind = document.createElement("span");
  kind.className = "hover-kind";
  kind.textContent = kindLabel(doc);
  head.append(title, kind);
  wrapper.append(head);

  const signature = document.createElement("code");
  signature.className = "hover-signature";
  signature.textContent = doc.signature;
  wrapper.append(signature);

  const summary = document.createElement("p");
  summary.className = "hover-summary";
  summary.textContent = doc.summary;
  wrapper.append(summary);

  if (doc.description) {
    const description = document.createElement("p");
    description.className = "hover-description";
    description.textContent = doc.description;
    wrapper.append(description);
  }

  if (doc.args?.length) {
    const list = document.createElement("ul");
    list.className = "hover-args";
    for (const arg of doc.args) {
      const item = document.createElement("li");
      const argName = document.createElement("code");
      argName.className = "hover-arg-name";
      argName.textContent = arg.name;
      const type = document.createElement("span");
      type.className = "hover-type";
      type.textContent = arg.type;
      const description = document.createElement("span");
      description.className = "hover-arg-description";
      description.textContent = arg.description;
      item.append(argName, type, description);
      list.append(item);
    }
    wrapper.append(list);
  }

  const example = doc.examples?.[0];
  if (example) {
    wrapper.append(buildExampleBlock(example.source, { preview: doc.kind !== "component" }));
  }

  contentCache.set(doc.name, wrapper);
  return wrapper;
}

function buildFieldContent(doc) {
  const cacheKey = `field:${doc.name}`;
  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);

  const wrapper = document.createElement("div");
  wrapper.className = "hover-card";

  const head = document.createElement("div");
  head.className = "hover-head";
  const title = document.createElement("span");
  title.className = "hover-title";
  const signature = document.createElement("code");
  signature.className = "hover-name";
  signature.textContent = doc.name;
  title.append(signature);
  if (doc.type) {
    const type = document.createElement("span");
    type.className = "hover-type";
    type.textContent = doc.type;
    title.append(type);
  }
  const kind = document.createElement("span");
  kind.className = "hover-kind";
  kind.textContent = FIELD_SCOPE_LABELS[doc.scope] ?? doc.scope ?? "field";
  head.append(title, kind);
  wrapper.append(head);

  const summary = document.createElement("p");
  summary.className = "hover-summary";
  summary.textContent = doc.summary;
  wrapper.append(summary);

  if (doc.description) {
    const description = document.createElement("p");
    description.className = "hover-description";
    description.textContent = doc.description;
    wrapper.append(description);
  }

  const valueGroups = doc.valueGroups?.length
    ? doc.valueGroups
    : doc.values?.length
      ? [{ label: "Values", values: doc.values }]
      : [];
  for (const group of valueGroups) {
    const values = document.createElement("p");
    values.className = "hover-values";
    const label = document.createElement("span");
    label.className = "hover-values-label";
    label.textContent = group.defaultValue
      ? `${group.label} · default ${group.defaultValue}`
      : group.label;
    values.append(label);
    for (const value of group.values) {
      const chip = document.createElement("code");
      chip.className = value === group.defaultValue ? "hover-chip is-default" : "hover-chip";
      chip.textContent = value;
      values.append(chip);
    }
    wrapper.append(values);
  }

  if (doc.defaultValue) {
    const values = document.createElement("p");
    values.className = "hover-values";
    const label = document.createElement("span");
    label.className = "hover-values-label";
    label.textContent = "Default";
    const chip = document.createElement("code");
    chip.className = "hover-chip is-default";
    chip.textContent = doc.defaultValue;
    values.append(label, chip);
    wrapper.append(values);
  }

  if (doc.example) {
    wrapper.append(buildExampleBlock(doc.example));
  }

  contentCache.set(cacheKey, wrapper);
  return wrapper;
}

export function createHoverDocs({ textarea, container, isSuppressed = () => false, kinds = ["function", "constant", "symbol"] }) {
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
    const callable = docsFor(word.name);
    const field = fieldDocsFor(word.name);
    if (!callable && !field) {
      hide();
      return;
    }

    const analysis = analyze(textarea.value);
    let kind = null;
    if (analysis) {
      const callHit = analysis.calls.some(
        (entry) => entry.name === word.name && contains(entry.span, offset)
      );
      const fieldHit = analysis.fields.some(
        (entry) => entry.name === word.name && contains(entry.span, offset)
      );
      const valueHit = analysis.values.find(
        (entry) => entry.name === word.name && contains(entry.span, offset)
      );
      if (callHit) kind = "callable";
      else if (fieldHit) kind = "field";
      else if (
        valueHit &&
        (valueHit.binding === "constant" ||
          (valueHit.binding === "free" && callable?.kind === "symbol"))
      ) {
        kind = "callable";
      }
    } else {
      const callish = textarea.value.slice(word.end, word.end + 80).trimStart().startsWith("(");
      if (field && !callish && looksLikeField(textarea.value, word)) {
        kind = "field";
      } else if (callable) {
        kind = "callable";
      }
    }
    if (!kind) {
      hide();
      return;
    }

    if (kind === "field") {
      if (kinds && !kinds.includes("field")) {
        hide();
        return;
      }
    } else if (kinds && !kinds.includes(callable.kind)) {
      hide();
      return;
    }

    const key = `${kind}:${word.name}`;
    if (lastWord !== key) {
      tooltip.replaceChildren(kind === "field" ? buildFieldContent(field) : buildContent(callable));
      lastWord = key;
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
