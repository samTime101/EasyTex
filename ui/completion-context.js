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

// The values a named argument allows, as in main.page(size="A4.
function valueContext(source, tokens, caret) {
  const token = tokenAt(tokens, caret);
  if (!token || token.type !== "string") return null;
  const text = token.text;
  const closed = text.length > 1 && text.endsWith('"');
  const inner = closed ? text.slice(1, -1) : text.slice(1);
  const prefix = source.slice(token.start + 1, Math.min(caret, token.end - (closed ? 1 : 0)));

  const before = source.slice(0, token.start);
  const name = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/.exec(before);
  if (!name) return { type: "blocked" };

  const field = fieldDocsFor(name[1]);
  if (!field) return { type: "blocked" };
  const quote = field.type !== "number" && field.type !== "boolean";
  const candidates = optionCandidates(field, quote);
  if (candidates.length === 0) return { type: "blocked" };

  return {
    type: "value",
    prefix,
    tokenStart: token.start,
    tokenEnd: token.end,
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
