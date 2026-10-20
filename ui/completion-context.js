// Context-aware completion for the document writer.
//
// The MathScript parser intentionally stops at the first incomplete entry, so
// it cannot answer "what belongs here?" while a line is being typed. This
// module scans the tolerant token stream instead: it tracks object and call
// frames, then reports the fields for the current object or the enumerated
// values for the current field. All functions are DOM-free and unit-tested.

import { NAMED_ARGUMENTS } from "../src/engine.js";
import { fieldDocsFor } from "../src/docs/index.js";
import {
  contextFieldDocs,
  fieldSignature,
  fieldValueInfo
} from "../src/docs/field-contexts.js";
import { scanSource } from "./highlight.js";

function isSignificant(token) {
  return token.type !== "space" && token.type !== "comment";
}

function stringIsClosed(text) {
  if (text.length < 2 || !text.startsWith('"') || !text.endsWith('"')) return false;
  let backslashes = 0;
  for (let index = text.length - 2; index >= 0 && text[index] === "\\"; index -= 1) backslashes += 1;
  return backslashes % 2 === 0;
}

function callAccepts(callName, fieldName) {
  return (
    typeof callName === "string" &&
    Object.hasOwn(NAMED_ARGUMENTS, callName) &&
    NAMED_ARGUMENTS[callName].has(fieldName)
  );
}

function stringAt(tokens, caret) {
  for (const token of tokens) {
    if (token.type !== "string") continue;
    if (token.start >= caret) continue;
    const closed = stringIsClosed(token.text);
    if (closed ? caret < token.end : caret <= token.end) {
      return { token, closed };
    }
  }
  return null;
}

function commentAt(tokens, caret) {
  return tokens.some(
    (token) => token.type === "comment" && token.start < caret && caret <= token.end
  );
}

// An empty string that ends right at the caret, as in size: "" with the caret
// after the closing quote. The values of the field are still worth offering:
// the string is empty, and accepting a value replaces it.
function emptyStringEndingAt(tokens, caret) {
  for (const token of tokens) {
    if (token.type !== "string" || token.end !== caret) continue;
    return token.text.length === 2 ? token : null;
  }
  return null;
}

function significantBefore(tokens, limit) {
  const result = [];
  for (const token of tokens) {
    if (token.start >= limit) break;
    if (isSignificant(token)) result.push(token);
  }
  return result;
}

function objectContextAt(previous, beforePrevious, stack) {
  const top = stack[stack.length - 1];
  if (
    top?.char === "[" &&
    top.listKind === "bibliography" &&
    (previous?.text === "[" || previous?.text === ",")
  ) {
    return "reference";
  }
  if (previous?.text === "(" && beforePrevious?.type === "identifier") {
    if (beforePrevious.text === "document" || beforePrevious.text === "page") {
      return beforePrevious.text;
    }
  }
  if (
    (previous?.text === ":" || previous?.text === "=") &&
    beforePrevious?.type === "identifier" &&
    beforePrevious.text === "margins"
  ) {
    return "margins";
  }
  return null;
}

function buildFrames(tokens, limit) {
  const stack = [];
  const recent = [];

  for (const token of tokens) {
    if (token.start >= limit) break;
    if (!isSignificant(token)) continue;

    if (token.type === "punct") {
      if (token.text === "(") {
        stack.push({
          char: "(",
          open: token,
          name: recent[recent.length - 1]?.type === "identifier" ? recent[recent.length - 1].text : null
        });
      } else if (token.text === "[") {
        const previous = recent[recent.length - 1];
        const beforePrevious = recent[recent.length - 2];
        const listKind =
          (previous?.text === "(" &&
            beforePrevious?.type === "identifier" &&
            beforePrevious.text === "bibliography") ||
          ((previous?.text === ":" || previous?.text === "=") &&
            beforePrevious?.type === "identifier" &&
            beforePrevious.text === "bibliography")
            ? "bibliography"
            : "list";
        stack.push({ char: "[", open: token, listKind });
      } else if (token.text === "{") {
        const context = objectContextAt(
          recent[recent.length - 1],
          recent[recent.length - 2],
          stack
        );
        stack.push({ char: "{", open: token, context });
      } else if (token.text === ")" || token.text === "]" || token.text === "}") {
        const expected = token.text === ")" ? "(" : token.text === "]" ? "[" : "{";
        if (stack[stack.length - 1]?.char === expected) stack.pop();
      }
    }

    recent.push(token);
    if (recent.length > 4) recent.shift();
  }

  return stack;
}

function topLevelTokens(tokens, frame, limit) {
  const result = [];
  let depth = 0;

  for (const token of tokens) {
    if (token.start < frame.open.end) continue;
    if (token.start >= limit) break;
    if (!isSignificant(token)) continue;

    if (token.type === "punct" && (token.text === ")" || token.text === "]" || token.text === "}")) {
      if (depth > 0) depth -= 1;
      continue;
    }
    if (token.type === "punct" && (token.text === "(" || token.text === "[" || token.text === "{")) {
      depth += 1;
      continue;
    }
    if (depth === 0) result.push(token);
  }

  return result;
}

function splitEntries(tokens) {
  const entries = [[]];
  for (const token of tokens) {
    if (token.type === "punct" && token.text === ",") {
      entries.push([]);
    } else {
      entries[entries.length - 1].push(token);
    }
  }
  return entries;
}

function fieldNameInEntry(entry) {
  const first = entry[0];
  if (first?.type !== "identifier") return null;
  return first;
}

function separatorIndex(entry) {
  return entry.findIndex(
    (token) =>
      (token.type === "punct" && token.text === ":") ||
      (token.type === "operator" && token.text === "=")
  );
}

function usedFields(entries) {
  const used = new Set();
  for (const entry of entries) {
    const name = fieldNameInEntry(entry);
    if (name && separatorIndex(entry) !== -1) used.add(name.text);
  }
  return used;
}

function referenceType(entries) {
  for (const entry of entries) {
    const name = fieldNameInEntry(entry);
    if (name?.text !== "type") continue;
    const separator = separatorIndex(entry);
    if (separator === -1) continue;
    const value = entry.slice(separator + 1).find((token) => token.type === "string");
    if (!value) continue;
    const closed = stringIsClosed(value.text);
    return value.text.slice(1, closed ? -1 : undefined);
  }
  return null;
}

function optionCandidates(field, context, quote) {
  const info = fieldValueInfo(field, context);
  const values = info.defaultValue
    ? [info.defaultValue, ...info.values.filter((value) => value !== info.defaultValue)]
    : [...info.values];
  return values.map((value) => ({
    name: value,
    kind: "value",
    signature: info.label ?? "Values",
    summary: value === info.defaultValue ? `${field.summary} Default.` : field.summary,
    value,
    quote,
    isDefault: value === info.defaultValue
  }));
}

function fieldCandidates(context, entries) {
  const used = usedFields(entries);
  const type = context === "reference" ? referenceType(entries) : null;
  return contextFieldDocs(context, type)
    .filter((field) => !used.has(field.name))
    .map((field) => ({
      ...field,
      kind: "field",
      signature: fieldSignature(field, context)
    }));
}

function valueContext(source, tokens, caret) {
  const inside = stringAt(tokens, caret);
  const trailing = inside ? null : emptyStringEndingAt(tokens, caret);
  const string = inside ? inside : trailing ? { token: trailing, closed: true } : null;
  const limit = string ? string.token.start : caret;
  const frames = buildFrames(tokens, limit);

  if (string) {
    const recent = significantBefore(tokens, limit);
    const previous = recent[recent.length - 1];
    const beforePrevious = recent[recent.length - 2];
    if (
      !previous ||
      (previous.text !== ":" && previous.text !== "=") ||
      beforePrevious?.type !== "identifier"
    ) {
      return { type: "blocked" };
    }

    const name = beforePrevious.text;
    const field = fieldDocsFor(name);
    if (!field) return { type: "blocked" };

    const objectFrame = [...frames].reverse().find((frame) => frame.char === "{");
    const callFrame = [...frames].reverse().find((frame) => frame.char === "(");
    const objectEntries = objectFrame
      ? splitEntries(topLevelTokens(tokens, objectFrame, limit))
      : [];
    const inObject = objectFrame
      ? contextFieldDocs(objectFrame.context, referenceType(objectEntries)).some(
          (candidate) => candidate.name === name
        )
      : false;
    const inCall = callAccepts(callFrame?.name, name);
    if (!inObject && !inCall) return { type: "blocked" };

    const context = objectFrame?.context ?? null;
    const quote = field.type !== "number" && field.type !== "boolean";
    const candidates = optionCandidates(field, context, quote);
    if (candidates.length === 0) return { type: "blocked" };

    return {
      type: "value",
      prefix: source.slice(string.token.start + 1, Math.min(caret, string.token.end - 1)),
      tokenStart: string.token.start,
      tokenEnd: string.token.end,
      candidates
    };
  }

  const frame = frames[frames.length - 1];
  if (!frame) return null;

  const entries = splitEntries(topLevelTokens(tokens, frame, caret));
  const entry = entries[entries.length - 1] ?? [];
  const name = fieldNameInEntry(entry);
  const separator = separatorIndex(entry);
  if (!name || separator === -1) return null;

  const valueTokens = entry.slice(separator + 1);
  if (valueTokens.length > 0) return null;

  const field = fieldDocsFor(name.text);
  if (!field) return null;

  const objectFrame = frame.char === "{" && frame.context ? frame : null;
  const callFrame = frame.char === "(" ? frame : null;
  const objectEntries = objectFrame
    ? splitEntries(topLevelTokens(tokens, objectFrame, caret))
    : [];
  const inObject = objectFrame
    ? contextFieldDocs(objectFrame.context, referenceType(objectEntries)).some(
        (candidate) => candidate.name === name.text
      )
    : false;
  const inCall = callAccepts(callFrame?.name, name.text);
  if (!inObject && !inCall) return null;

  if (field.type !== "number" && field.type !== "boolean") return null;
  const context = objectFrame?.context ?? null;
  const candidates = optionCandidates(field, context, false);
  if (candidates.length === 0) return null;

  return {
    type: "value",
    prefix: "",
    tokenStart: caret,
    tokenEnd: caret,
    candidates
  };
}

export function completionContextAt(source, caret) {
  const tokens = scanSource(source);
  if (commentAt(tokens, caret)) return { type: "blocked" };

  const value = valueContext(source, tokens, caret);
  if (value) return value;

  const string = stringAt(tokens, caret);
  if (string) return { type: "blocked" };

  const frames = buildFrames(tokens, caret);
  const frame = frames[frames.length - 1];
  if (!frame || frame.char !== "{" || !frame.context) return null;

  const entries = splitEntries(topLevelTokens(tokens, frame, caret));
  const entry = entries[entries.length - 1] ?? [];
  if (entry.length === 0) {
    return {
      type: "field",
      context: frame.context,
      prefix: "",
      tokenStart: caret,
      tokenEnd: caret,
      candidates: fieldCandidates(frame.context, entries)
    };
  }

  const name = fieldNameInEntry(entry);
  if (!name || separatorIndex(entry) !== -1) return null;

  let end = name.end;
  if (caret > end && source.slice(end, caret).trim() === "") end = caret;

  return {
    type: "field",
    context: frame.context,
    prefix: source.slice(name.start, caret).trim(),
    tokenStart: name.start,
    tokenEnd: end,
    candidates: fieldCandidates(frame.context, entries)
  };
}
