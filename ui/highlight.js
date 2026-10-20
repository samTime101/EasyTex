// Syntax highlighting for the MathScript editors.
//
// The scanner is deliberately tolerant: it never throws on incomplete input,
// so it can run on every keystroke while a call is still half-typed. The
// painter draws a decorative <pre> layer underneath a textarea whose text is
// transparent; the layer copies the textarea's box, font, and wrapping, and
// follows its scroll position.
//
// highlightSource() and scanSource() are DOM-free and unit-tested;
// attachHighlighter() is the only part that touches the document.

import {
  FUNCTION_DOCS,
  CONSTANT_DOCS,
  COMPONENT_DOCS,
  FIELD_DOCS
} from "../src/docs/index.js";
import { TEXTAREA_STYLE_PROPS } from "./textarea-geometry.js";

const FUNCTION_NAMES = new Set(FUNCTION_DOCS.map((doc) => doc.name));
const CONSTANT_NAMES = new Set(CONSTANT_DOCS.map((doc) => doc.name));
const COMPONENT_NAMES = new Set([...COMPONENT_DOCS.map((doc) => doc.name), "Document"]);
const FIELD_NAMES = new Set(FIELD_DOCS.map((doc) => doc.name));
const BOOLEAN_NAMES = new Set(["true", "false"]);

const OPERATOR_CHARS = new Set(["+", "-", "*", "/", "%", "^", "=", "<", ">", "!"]);
const TWO_CHAR_OPERATORS = new Set(["!=", "<=", ">="]);
const PUNCT_CHARS = new Set(["(", ")", "[", "]", "{", "}", ":", ",", "."]);

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isLetter(ch) {
  return typeof ch === "string" && ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"));
}

function isIdentifierPart(ch) {
  return isLetter(ch) || isDigit(ch) || ch === "_";
}

function isSpace(ch) {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Split a source string into tolerant tokens. Token kinds mirror the lexer:
// comment, string, number, identifier, operator, punct, space, other.
export function scanSource(source) {
  const tokens = [];
  const text = String(source);
  let index = 0;

  function push(type, end) {
    tokens.push({ type, text: text.slice(index, end), start: index, end });
    index = end;
  }

  while (index < text.length) {
    const ch = text[index];
    const next = text[index + 1] ?? "";

    if (ch === "/" && next === "/") {
      const end = text.indexOf("\n", index);
      push("comment", end === -1 ? text.length : end);
      continue;
    }

    if (ch === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      push("comment", end === -1 ? text.length : end + 2);
      continue;
    }

    if (ch === '"') {
      let cursor = index + 1;
      while (cursor < text.length) {
        const current = text[cursor];
        if (current === "\\") {
          cursor += 2;
          continue;
        }
        if (current === '"' || current === "\n") break;
        cursor += 1;
      }
      if (text[cursor] === '"') cursor += 1;
      push("string", Math.min(cursor, text.length));
      continue;
    }

    if (isDigit(ch)) {
      let cursor = index;
      while (isDigit(text[cursor] ?? "")) cursor += 1;
      if (text[cursor] === "." && isDigit(text[cursor + 1] ?? "")) {
        cursor += 1;
        while (isDigit(text[cursor] ?? "")) cursor += 1;
      }
      if (text[cursor] === "e" || text[cursor] === "E") {
        const sign = text[cursor + 1] ?? "";
        const afterSign = text[cursor + 2] ?? "";
        const hasExponent = isDigit(sign) || ((sign === "+" || sign === "-") && isDigit(afterSign));
        if (hasExponent) {
          cursor += 1;
          if (text[cursor] === "+" || text[cursor] === "-") cursor += 1;
          while (isDigit(text[cursor] ?? "")) cursor += 1;
        }
      }
      push("number", cursor);
      continue;
    }

    if (isLetter(ch)) {
      let cursor = index + 1;
      while (cursor < text.length && isIdentifierPart(text[cursor])) cursor += 1;
      push("identifier", cursor);
      continue;
    }

    const two = text.slice(index, index + 2);
    if (TWO_CHAR_OPERATORS.has(two)) {
      push("operator", index + 2);
      continue;
    }

    if (OPERATOR_CHARS.has(ch)) {
      push("operator", index + 1);
      continue;
    }

    if (PUNCT_CHARS.has(ch)) {
      push("punct", index + 1);
      continue;
    }

    if (isSpace(ch)) {
      let cursor = index + 1;
      while (cursor < text.length && isSpace(text[cursor])) cursor += 1;
      push("space", cursor);
      continue;
    }

    push("other", index + 1);
  }

  return tokens;
}

// True when the identifier is used as an object key or named argument, that
// is, the next significant token is ':' or '='.
function isFieldUse(tokens, index) {
  for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token.type === "space") continue;
    return token.text === ":" || token.text === "=";
  }
  return false;
}

// True when the identifier names a method, that is, the next significant
// token is a dot.
function isMethodUse(tokens, index) {
  for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token.type === "space") continue;
    return token.type === "punct" && token.text === ".";
  }
  return false;
}

function classFor(tokens, index, options = {}) {
  const token = tokens[index];
  switch (token.type) {
    case "comment":
      return "comment";
    case "string":
      return "string";
    case "number":
      return "number";
    case "operator":
      return "operator";
    case "punct":
      return "punct";
    case "identifier":
      break;
    default:
      return null;
  }

  const name = token.text;
  if (BOOLEAN_NAMES.has(name)) return "boolean";
  if (options.fields === true && FIELD_NAMES.has(name) && isFieldUse(tokens, index)) return "field";
  if (options.components === true && isMethodUse(tokens, index) && COMPONENT_NAMES.has(name)) {
    return "component";
  }
  if (FUNCTION_NAMES.has(name)) return "function";
  if (CONSTANT_NAMES.has(name)) return "constant";
  if (options.components === true && COMPONENT_NAMES.has(name)) return "component";
  return null;
}

// Render a source string as HTML with <span class="tok-…"> wrappers. The
// output is escaped, so it is safe to assign to innerHTML.
export function highlightSource(source, options = {}) {
  const tokens = scanSource(source);
  let html = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const cls = classFor(tokens, index, options);
    const text = escapeHtml(token.text);
    html += cls ? `<span class="tok-${cls}">${text}</span>` : text;
  }
  return html;
}

// Paint a highlight layer underneath a textarea. The textarea keeps its own
// caret, selection, and scrollbars; only its text color becomes transparent
// (CSS class `has-highlight`), so the layer must copy the textarea's box.
export function attachHighlighter({ textarea, components = false, fields = false }) {
  const layer = document.createElement("pre");
  layer.className = "editor-highlight";
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("spellcheck", "false");
  textarea.parentElement.append(layer);
  textarea.classList.add("has-highlight");

  let frame = 0;

  function syncBox() {
    const style = getComputedStyle(textarea);
    layer.style.left = `${textarea.offsetLeft}px`;
    layer.style.top = `${textarea.offsetTop}px`;
    layer.style.width = `${textarea.offsetWidth}px`;
    layer.style.height = `${textarea.offsetHeight}px`;
    for (const prop of TEXTAREA_STYLE_PROPS) layer.style[prop] = style[prop];
  }

  function syncAll() {
    syncBox();
    layer.scrollTop = textarea.scrollTop;
    layer.scrollLeft = textarea.scrollLeft;
  }

  function paint() {
    frame = 0;
    layer.innerHTML = `${highlightSource(textarea.value, { components, fields })}\n`;
    syncAll();
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(paint);
  }

  textarea.addEventListener("input", schedule);
  textarea.addEventListener("scroll", syncAll);
  window.addEventListener("resize", syncAll);
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(syncAll).observe(textarea);
  }
  paint();

  return { schedule, refresh: paint };
}
