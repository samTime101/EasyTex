export const CATEGORY = {
  LEXICAL: "lexical",
  SYNTAX: "syntax",
  NAME: "name",
  ARITY: "arity",
  STRUCTURE: "structure",
  TYPE: "type",
  DOMAIN: "domain",
  RESERVED: "reserved"
};

export function position(offset, line, column) {
  return { offset, line, column };
}

export function makeSpan(start, end = start) {
  return { start, end };
}

export function mergeSpans(a, b) {
  if (!a) return b;
  if (!b) return a;
  return { start: a.start.offset <= b.start.offset ? a.start : b.start, end: a.end.offset >= b.end.offset ? a.end : b.end };
}

export function diagnostic(category, message, span, severity = "error") {
  return { category, message, span, severity };
}

export function formatDiagnostic(diag, source = "", file = "input") {
  const line = diag.span?.start?.line ?? 1;
  const column = diag.span?.start?.column ?? 1;
  const lines = source.split(/\r\n|\r|\n/);
  const text = lines[line - 1] ?? "";
  const caret = text.length > 0 ? " ".repeat(Math.max(0, column - 1)) + "^" : "^";
  return [
    `error[${diag.category}]: ${diag.message}`,
    `  --> ${file}:${line}:${column}`,
    "   |",
    `${String(line).padStart(2)} | ${text}`,
    `   | ${caret}`
  ].join("\n");
}
