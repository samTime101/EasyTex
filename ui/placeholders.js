// The placeholders of a call that is being written.
//
// A suggestion inserts the call with the argument names as placeholders:
//
//   integral(variable, start, end, expression)
//
// Tab moves from one placeholder to the next, so the call can be written
// without reaching for the mouse, and without hovering for the names.
//
// Every function is DOM-free and unit-tested.

import { docsFor } from "../src/docs/index.js";
import { scanSource } from "./highlight.js";

// The placeholders of the call around the caret.
export function placeholderPositions(source, caret) {
  const tokens = scanSource(source);

  // The innermost call that is still open.
  const stack = [];
  for (const token of tokens) {
    if (token.start >= caret) break;
    if (token.type !== "punct") continue;
    if (token.text === "(") stack.push(token);
    else if (token.text === ")" || token.text === "]" || token.text === "}") stack.pop();
  }
  const open = stack[stack.length - 1];
  if (!open) return [];

  // The name of the call: the identifier before the bracket.
  let callee = null;
  for (const token of tokens) {
    if (token.start >= open.start) break;
    if (token.type === "identifier") callee = token.text;
  }
  const names = callee ? (docsFor(callee)?.args ?? []).map((argument) => argument.name) : [];
  if (names.length === 0) return [];

  // The arguments of the call, split at the commas of its own level.
  const segments = [];
  let depth = 0;
  let from = open.end;
  for (const token of tokens) {
    if (token.start < open.end) continue;
    if (token.type !== "punct") continue;
    if (token.text === "(" || token.text === "[" || token.text === "{") {
      depth += 1;
      continue;
    }
    if (token.text === ")" || token.text === "]" || token.text === "}") {
      if (depth === 0) {
        segments.push({ from, to: token.start });
        break;
      }
      depth -= 1;
      continue;
    }
    if (token.text === "," && depth === 0) {
      segments.push({ from, to: token.start });
      from = token.end;
    }
  }

  // An argument that is still the name of the parameter is a placeholder.
  const placeholders = [];
  for (const segment of segments) {
    const text = source.slice(segment.from, segment.to);
    const trimmed = text.trim();
    if (!names.includes(trimmed)) continue;
    const offset = text.indexOf(trimmed);
    placeholders.push({
      name: trimmed,
      start: segment.from + offset,
      end: segment.from + offset + trimmed.length
    });
  }
  return placeholders;
}

// The end of the call around the caret: the position after its bracket. It
// is where the caret goes when the last placeholder has been written.
export function callEnd(source, caret) {
  const tokens = scanSource(source);
  const stack = [];
  for (const token of tokens) {
    if (token.start >= caret) break;
    if (token.type !== "punct") continue;
    if (token.text === "(") stack.push(token);
    else if (token.text === ")" || token.text === "]" || token.text === "}") stack.pop();
  }
  const open = stack[stack.length - 1];
  if (!open) return null;
  let depth = 0;
  for (const token of tokens) {
    if (token.start <= open.start) continue;
    if (token.type !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") {
      if (depth === 0) return token.end;
      depth -= 1;
    }
  }
  return null;
}

// The placeholder after the caret. A placeholder the caret is inside is
// left behind: Tab moves on to the next one.
export function nextPlaceholder(source, caret) {
  const placeholders = placeholderPositions(source, caret);
  const current = placeholders.find(
    (placeholder) => caret >= placeholder.start && caret <= placeholder.end
  );
  if (current) {
    return placeholders[placeholders.indexOf(current) + 1] ?? null;
  }
  return placeholders.find((placeholder) => placeholder.start > caret) ?? null;
}
