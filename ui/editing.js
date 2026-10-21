// Editing assistance shared by the expression editor and the document writer:
// auto-closing brackets and quotes, smart Enter indentation, Tab indentation,
// pair deletion, and source re-indentation.
//
// Every helper is DOM-free and unit-tested: it receives the current source and
// selection and returns the replacement range, text, and the selection after
// the edit. attachEditing() wires them to a textarea; it goes through
// document.execCommand("insertText") so the browser's undo stack stays intact,
// with setRangeText as a fallback.

import { scanSource } from "./highlight.js";

export const INDENT = "  ";

export const PAIRS = new Map([
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ['"', '"']
]);

const CLOSERS = new Set([")", "]", "}"]);
const WORD_CHAR = /[A-Za-z0-9_]/;

function isWordChar(ch) {
  return typeof ch === "string" && ch.length === 1 && WORD_CHAR.test(ch);
}

// A no-op edit that only moves the caret, used when typing a closer over the
// one an auto-closed pair already inserted.
function skipOver(at, to) {
  return { start: at, end: at, text: "", selectionStart: to, selectionEnd: to };
}

// What should happen when `char` is typed over source[start, end]?
// Returns { start, end, text, selectionStart, selectionEnd } or null when the
// character should be inserted normally.
export function autoCloseEdit(source, start, end, char) {
  const closer = PAIRS.get(char);

  if (closer === undefined) {
    if (CLOSERS.has(char) && start === end && source[start] === char) {
      return skipOver(start, start + 1);
    }
    return null;
  }

  if (end > start) {
    // Wrap the selection: (x) for brackets, "x" for quotes.
    return {
      start,
      end,
      text: char + source.slice(start, end) + closer,
      selectionStart: start + 1,
      selectionEnd: end + 1
    };
  }

  if (char === '"') {
    if (source[start] === '"') return skipOver(start, start + 1);
    if (isWordChar(source[start - 1])) {
      // A quote typed after a word closes the string instead of opening a pair.
      return { start, end, text: '"', selectionStart: start + 1, selectionEnd: start + 1 };
    }
    if (source[start - 1] === "\\") {
      // An escaped quote inside a string is never paired.
      return { start, end, text: '"', selectionStart: start + 1, selectionEnd: start + 1 };
    }
  }

  return {
    start,
    end,
    text: char + closer,
    selectionStart: start + 1,
    selectionEnd: start + 1
  };
}

// Enter: keep the current line's indentation, add one level after an opening
// bracket, and expand `{|}` into an indented block.
export function smartEnterEdit(source, start, end) {
  const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const indent = /^[ \t]*/.exec(source.slice(lineStart, start))[0];
  const previous = start > 0 ? source[start - 1] : "";
  const next = source[end] ?? "";
  const closer = previous === '"' ? undefined : PAIRS.get(previous);

  let text = `\n${indent}`;
  if (closer !== undefined && start === end) {
    const deeper = `${indent}${INDENT}`;
    if (next === closer) {
      text = `\n${deeper}\n${indent}`;
      return {
        start,
        end,
        text,
        selectionStart: start + 1 + deeper.length,
        selectionEnd: start + 1 + deeper.length
      };
    }
    text = `\n${deeper}`;
  }

  return { start, end, text, selectionStart: start + text.length, selectionEnd: start + text.length };
}

// Backspace between an opener and its matching closer removes both.
export function deletePairEdit(source, start, end) {
  if (start !== end || start === 0) return null;
  const opener = source[start - 1];
  const closer = source[start];
  if (PAIRS.get(opener) === closer) {
    return { start: start - 1, end: start + 1, text: "", selectionStart: start - 1, selectionEnd: start - 1 };
  }
  return null;
}

// Tab indents every line touched by the selection; Shift+Tab unindents.
export function indentEdit(source, start, end, options = {}) {
  const unindent = options.unindent === true;
  const unit = options.indent ?? INDENT;
  const first = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let last = source.indexOf("\n", end);
  if (last === -1) last = source.length;
  if (end > start && end > first && source[end - 1] === "\n") last = end - 1;

  const lines = source.slice(first, last).split("\n");
  const removed = lines.map((line) => {
    if (!unindent) return 0;
    const match = /^(\t| {1,2})/.exec(line);
    return match ? match[0].length : 0;
  });
  const nextLines = lines.map((line, index) => {
    if (line.trim() === "") return "";
    if (unindent) return line.slice(removed[index]);
    return unit + line;
  });

  function mapOffset(offset) {
    let cursor = first;
    let shift = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const lineEnd = cursor + lines[index].length;
      if (offset <= lineEnd) {
        const local = Math.max(0, offset - cursor);
        const nextLocal = unindent
          ? Math.max(0, local - removed[index])
          : local === 0
            ? 0
            : Math.max(0, Math.min(nextLines[index].length, local + nextLines[index].length - lines[index].length));
        return cursor + shift + nextLocal;
      }
      shift += nextLines[index].length - lines[index].length;
      cursor = lineEnd + 1;
    }
    return offset + shift;
  }

  return {
    start: first,
    end: last,
    text: nextLines.join("\n"),
    selectionStart: mapOffset(start),
    selectionEnd: mapOffset(end)
  };
}

// Re-indent every line, strip trailing whitespace, and keep blank lines empty.
//
// Indentation follows the project's canonical style: a line is indented one
// level per open bracket, except that several brackets opened on the same line
// share one level (document({ … )) and a line that starts with a closing
// bracket aligns with the line that opened it.
export function formatSource(source, options = {}) {
  const unit = options.indent ?? INDENT;
  const lines = source.split("\n");
  const firstChar = lines.map(() => null);
  const brackets = lines.map(() => []);

  let line = 0;
  for (const token of scanSource(source)) {
    const parts = token.text.split("\n");
    for (let index = 0; index < parts.length; index += 1) {
      if (index > 0) line += 1;
      const part = parts[index];
      if (part === "" || token.type === "space") continue;
      // Comments are content, but a comment line must never be mistaken for a
      // line that starts with a closing bracket.
      if (token.type !== "comment" && firstChar[line] === null) firstChar[line] = part[0];
      if (token.type === "punct") {
        for (const ch of part) {
          if (ch === "(" || ch === "[" || ch === "{" || ch === ")" || ch === "]" || ch === "}") {
            brackets[line].push(ch);
          }
        }
      }
    }
  }

  const stack = [];
  const levels = lines.map((raw, index) => {
    const content = stack.length === 0 ? 0 : stack[stack.length - 1] + 1;
    const level =
      firstChar[index] !== null && CLOSERS.has(firstChar[index]) && stack.length > 0
        ? stack[stack.length - 1]
        : content;
    for (const ch of brackets[index]) {
      if (ch === "(" || ch === "[" || ch === "{") stack.push(level);
      else if (stack.length > 0) stack.pop();
    }
    return level;
  });

  return lines
    .map((raw, index) => {
      const text = raw.trim();
      return text === "" ? "" : unit.repeat(levels[index]) + text;
    })
    .join("\n");
}

function lineBounds(source, index) {
  let start = 0;
  for (let line = 0; line < index; line += 1) {
    const nextBreak = source.indexOf("\n", start);
    if (nextBreak === -1) return null;
    start = nextBreak + 1;
  }
  const nextBreak = source.indexOf("\n", start);
  const end = nextBreak === -1 ? source.length : nextBreak;
  const indent = /^[ \t]*/.exec(source.slice(start, end))[0].length;
  return { start, end, indent };
}

// Format and map the selection through the formatting. Formatting never adds
// or removes lines, so both offsets keep their line and shift by the change in
// the line's indentation.
export function formatEdit(source, start, end, options = {}) {
  const next = formatSource(source, options);
  if (next === source) {
    return { source: next, selectionStart: start, selectionEnd: end };
  }

  function mapOffset(offset) {
    const clamped = Math.max(0, Math.min(offset, source.length));
    const before = source.slice(0, clamped);
    const line = (before.match(/\n/g) ?? []).length;
    const column = clamped - (before.lastIndexOf("\n") + 1);
    const oldLine = lineBounds(source, line);
    const newLine = lineBounds(next, line);
    if (!oldLine || !newLine) return next.length;
    const shift = newLine.indent - oldLine.indent;
    return Math.min(Math.max(newLine.start, newLine.start + column + shift), newLine.end);
  }

  return { source: next, selectionStart: mapOffset(start), selectionEnd: mapOffset(end) };
}

// --------------------------------------------------------------- textarea glue

function insertText(textarea, text) {
  const doc = textarea.ownerDocument ?? document;
  try {
    return doc.execCommand("insertText", false, text) === true;
  } catch {
    return false;
  }
}

function deleteSelection(textarea) {
  const doc = textarea.ownerDocument ?? document;
  try {
    return doc.execCommand("delete", false) === true;
  } catch {
    return false;
  }
}

// Write an edit into a textarea.
//
// The text goes in with the browser's own command, so the undo stack of the
// textarea stays intact: the reader can take back an inserted pair of
// brackets as easily as a typed letter. The command needs the focus, so the
// textarea takes it; when the command is not available, the text is written
// directly and the change is announced with an input event.
export function applyTextEdit(textarea, edit) {
  if (!edit || !textarea) return false;
  // A zero-width empty edit is a caret move (typing over an existing closer).
  // A non-empty range with empty text is a deletion (Backspace on an empty pair).
  if (edit.text === "" && edit.start === edit.end) {
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    return true;
  }
  textarea.focus();
  textarea.setSelectionRange(edit.start, edit.end);
  const applied = edit.text === "" ? deleteSelection(textarea) : insertText(textarea, edit.text);
  if (applied) {
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    return true;
  }
  textarea.setRangeText(edit.text, edit.start, edit.end, "end");
  textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
  const view = textarea.ownerDocument?.defaultView ?? globalThis;
  textarea.dispatchEvent(new view.Event("input", { bubbles: true }));
  return true;
}

function applyEdit(textarea, edit) {
  if (!edit) return false;
  return applyTextEdit(textarea, edit);
}

// Re-indent the whole textarea. Returns true when the source changed.
export function formatTextarea(textarea) {
  const length = textarea.value.length;
  const result = formatEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd);
  if (result.source === textarea.value) return false;

  textarea.setSelectionRange(0, length);
  if (!insertText(textarea, result.source)) {
    textarea.setRangeText(result.source, 0, length, "end");
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return true;
}

// Attach the key handling. The listener runs after the page's own keydown
// listeners, so an open autocomplete that consumed Enter/Tab (by calling
// preventDefault) wins.
export function attachEditing({ textarea, indent = INDENT }) {
  function onKeyDown(event) {
    if (event.defaultPrevented || event.isComposing) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const key = event.key;

    if (key === "Enter") {
      event.preventDefault();
      applyEdit(textarea, smartEnterEdit(textarea.value, start, end));
      return;
    }
    if (key === "Tab") {
      event.preventDefault();
      applyEdit(textarea, indentEdit(textarea.value, start, end, { unindent: event.shiftKey, indent }));
      return;
    }
    if (key === "Backspace") {
      const edit = deletePairEdit(textarea.value, start, end);
      if (edit) {
        event.preventDefault();
        applyEdit(textarea, edit);
      }
      return;
    }
    if (key.length !== 1) return;

    const edit = autoCloseEdit(textarea.value, start, end, key);
    if (edit) {
      event.preventDefault();
      applyEdit(textarea, edit);
    }
  }

  textarea.addEventListener("keydown", onKeyDown);
  return {
    destroy: () => textarea.removeEventListener("keydown", onKeyDown)
  };
}
