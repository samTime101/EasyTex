// What is under the pointer in the editor.
//
// The analysis is the same as in the static host: parse the source, and
// record the calls, the object fields, and the identifiers with their
// positions. The hover card then decides what to show.

import { parse, validate, NAMED_ARGUMENTS } from "./engine.js";

const WORD_CHAR = /[A-Za-z0-9_]/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;

export function analyzeSource(source) {
  const parsed = parse(source);
  if (parsed.diagnostics.length > 0 || !parsed.ast) return null;

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
  return { values, calls, fields };
}

function isWordChar(ch) {
  return ch !== undefined && WORD_CHAR.test(ch);
}

export function wordAt(value, offset) {
  let start = offset;
  let end = offset;
  while (start > 0 && isWordChar(value[start - 1])) start -= 1;
  while (end < value.length && isWordChar(value[end])) end += 1;
  const name = value.slice(start, end);
  return IDENTIFIER.test(name) ? { name, start, end } : null;
}

// Fallback for sources that do not parse: a field is a word directly followed
// by ":" or "=", outside any string literal.
export function looksLikeField(value, word) {
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

export function kindLabel(doc) {
  if (doc.kind === "constant") return "constant";
  if (doc.kind === "symbol") return "symbol";
  if (doc.kind === "component") {
    if (doc.role === "inline") return "inline";
    if (doc.role === "document") return "document";
    return "block";
  }
  return "function";
}
