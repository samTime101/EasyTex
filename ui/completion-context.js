// Context-aware completion for the document writer.
//
// A document is a program of statements:
//
//   document = Document(type="article", title="…")
//   main = document.section("Introduction")
//   main.paragraph("…")
//
// The completion answers three questions: which methods may be called on the
// container the caret is in, which named arguments a method takes, and which
// values an argument allows. The names in scope come from the bindings of the
// statements before the caret.
//
// Every function is DOM-free and unit-tested.

import {
  COMPONENTS,
  CONTAINER_OF_METHOD,
  methodsFor,
  parseProgram
} from "../src/engine.js";
import { fieldDocsFor } from "../src/docs/index.js";
import { fieldSignature, fieldValueInfo } from "../src/docs/field-contexts.js";
import { scanSource } from "./highlight.js";

// A member access: "main." or "main.si".
const MEMBER = /([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z0-9_]*)$/;
// A call on a bound name: "main.equation(".
const METHOD_CALL = /([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([^()]*)$/;
// The document constructor: "Document(".
const DOCUMENT_CALL = /(?:^|[^A-Za-z0-9_.])Document\(([^()]*)$/;
// A named argument being typed: "label=" or "label=eq".
const ARGUMENT_NAME = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z0-9_]*)$/;

// The names bound before the caret, and the kind of block each one stands for.
export function bindingsBefore(source, caret) {
  const { statements } = parseProgram(source.slice(0, caret));
  const bindings = new Map();
  for (const statement of statements) {
    if (statement.kind !== "Binding") continue;
    if (statement.call?.kind === "DocumentCall") {
      bindings.set(statement.name, { kind: "document" });
      continue;
    }
    const method = statement.call?.method;
    if (!method) continue;
    const kind = CONTAINER_OF_METHOD[method];
    if (kind) bindings.set(statement.name, { kind });
  }
  return bindings;
}

// The token the caret sits in, if any.
//
// A string that ends exactly at the caret still counts: the user has just
// typed the closing quote, and the value list must open for them.
function tokenAt(tokens, caret) {
  let fallback = null;
  for (const token of tokens) {
    if (token.start > caret) break;
    if (token.type === "string" && token.start <= caret && caret <= token.end) return token;
    if (token.start <= caret && caret < token.end) return token;
    if (token.end === caret) fallback = token;
  }
  return fallback;
}

function methodCandidates(kind, prefix) {
  return methodsFor(kind)
    .filter((method) => method.name.startsWith(prefix))
    .map((method) => ({
      name: method.name,
      kind: "method",
      signature: method.signature,
      summary: method.summary
    }));
}

function argumentCandidates(method, prefix, used) {
  return (method.named ?? [])
    .filter((argument) => argument.name.startsWith(prefix) && !used.has(argument.name))
    .map((argument) => ({
      name: argument.name,
      kind: "field",
      signature: argument.type,
      summary: argument.description
    }));
}

function optionCandidates(field, quote) {
  const info = fieldValueInfo(field, null);
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

// The named arguments already given in a call.
function usedArguments(argumentText) {
  const used = new Set();
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
  let match = pattern.exec(argumentText);
  while (match) {
    used.add(match[1]);
    match = pattern.exec(argumentText);
  }
  return used;
}

// The named arguments of a call, and the prefix being typed.
function argumentContext(methodName, argumentText, lineStart, argumentOffset) {
  const method = COMPONENTS[methodName];
  if (!method) return null;
  const after = argumentText.slice(argumentText.lastIndexOf(",") + 1);
  const prefixMatch = /^\s*([A-Za-z0-9_]*)$/.exec(after);
  if (!prefixMatch) return null;
  const prefix = prefixMatch[1];
  const prefixIndex = argumentText.length - after.length + after.indexOf(prefix);
  const offset = lineStart + argumentOffset + prefixIndex;
  const given = argumentText.slice(0, argumentText.length - after.length);
  return {
    type: "field",
    prefix,
    tokenStart: offset,
    tokenEnd: offset + prefix.length,
    candidates: argumentCandidates(method, prefix, usedArguments(given))
  };
}

// The call the caret is in: the innermost call that is still open, or the
// call that the closing bracket right before the caret closes. The second case
// matters because the user often finishes the call before reaching for the
// value: page(size="") with the caret after the bracket is still an argument
// being edited.
function callAt(tokens, caret) {
  const stack = [];
  let lastClosed = null;
  let previous = null;

  for (const token of tokens) {
    if (token.start >= caret) break;
    if (token.type === "space" || token.type === "comment") continue;
    previous = token;
    if (token.type !== "punct") continue;
    if (token.text === "(" || token.text === "[" || token.text === "{") {
      stack.push(token);
    } else if (token.text === ")" || token.text === "]" || token.text === "}") {
      const open = stack.pop();
      if (open && open.text === "(") lastClosed = { open, close: token };
    }
  }

  const top = stack[stack.length - 1];
  if (top?.text === "(") return { open: top, close: null };
  // The caret may sit directly after the bracket that closes the call.
  if (
    previous?.type === "punct" &&
    previous.text === ")" &&
    previous.end === caret &&
    lastClosed?.close === previous
  ) {
    return lastClosed;
  }
  return null;
}

// The name of the method a call belongs to.
function methodOfCall(tokens, call) {
  let previous = null;
  for (const token of tokens) {
    if (token.start >= call.open.start) break;
    if (token.type === "space" || token.type === "comment") continue;
    previous = token;
  }
  return previous?.type === "identifier" ? previous.text : null;
}

// The argument the caret is in: the text after the last comma of the call.
function argumentOfCall(source, tokens, call) {
  const start = call.open.end;
  const end = call.close ? call.close.start : source.length;
  let depth = 0;
  let comma = -1;
  for (const token of tokens) {
    if (token.start < start) continue;
    if (token.start >= end) break;
    if (token.type !== "punct") continue;
    if (token.text === "(" || token.text === "[" || token.text === "{") depth += 1;
    else if (token.text === ")" || token.text === "]" || token.text === "}") depth -= 1;
    else if (token.text === "," && depth === 0) comma = token.start;
  }
  const from = comma === -1 ? start : comma + 1;
  return { text: source.slice(from, end), from, to: end };
}

// The values a named argument allows, as in main.page(size="A4.
function valueContext(source, tokens, caret) {
  const token = tokenAt(tokens, caret);
  const inString = token?.type === "string";
  const call = callAt(tokens, caret);
  if (!call) return inString ? { type: "blocked" } : null;

  const argument = argumentOfCall(source, tokens, call);
  const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/.exec(argument.text);
  if (!match) return inString ? { type: "blocked" } : null;

  const method = methodOfCall(tokens, call);
  const declared = method ? COMPONENTS[method]?.named ?? [] : [];
  if (!declared.some((entry) => entry.name === match[1])) {
    return inString ? { type: "blocked" } : null;
  }

  const field = fieldDocsFor(match[1]);
  if (!field) return inString ? { type: "blocked" } : null;
  const quote = field.type !== "number" && field.type !== "boolean";
  const candidates = optionCandidates(field, quote);
  if (candidates.length === 0) return inString ? { type: "blocked" } : null;

  // The value of the argument: the string it holds, if it holds one.
  let value = null;
  for (const item of tokens) {
    if (item.start < argument.from) continue;
    if (item.start >= argument.to) break;
    if (item.type === "string") value = item;
  }
  if (!value) {
    return {
      type: "value",
      prefix: "",
      tokenStart: caret,
      tokenEnd: caret,
      candidates
    };
  }

  const closed = source[value.end - 1] === '"';
  const contentEnd = closed ? value.end - 1 : value.end;
  const prefix = source.slice(value.start + 1, Math.min(caret, contentEnd));
  return {
    type: "value",
    prefix,
    tokenStart: value.start,
    tokenEnd: value.end,
    candidates
  };
}

// What may come at the caret?
export function completionContextAt(source, caret) {
  const tokens = scanSource(source);
  const token = tokenAt(tokens, caret);
  if (token?.type === "comment") return { type: "blocked" };

  const value = valueContext(source, tokens, caret);
  if (value) return value;

  const before = source.slice(0, caret);
  const lineStart = before.lastIndexOf("\n") + 1;
  const line = before.slice(lineStart);
  const bindings = bindingsBefore(source, caret);

  const call = METHOD_CALL.exec(line);
  if (call) {
    const target = bindings.get(call[1]);
    if (!target) return null;
    const method = COMPONENTS[call[2]];
    if (!method || !method.containers.includes(target.kind)) return null;
    const offset = call.index + call[1].length + 1 + call[2].length + 1;
    return argumentContext(call[2], call[3], lineStart, offset);
  }

  const documentCall = DOCUMENT_CALL.exec(line);
  if (documentCall) {
    const offset = documentCall.index + documentCall[0].length - documentCall[1].length;
    return argumentContext("Document", documentCall[1], lineStart, offset);
  }

  const member = MEMBER.exec(line);
  if (member) {
    const target = bindings.get(member[1]);
    if (!target) return null;
    const prefix = member[2];
    const offset = lineStart + line.length - prefix.length;
    return {
      type: "method",
      prefix,
      tokenStart: offset,
      tokenEnd: offset + prefix.length,
      candidates: methodCandidates(target.kind, prefix)
    };
  }

  return null;
}
