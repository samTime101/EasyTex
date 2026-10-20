import test from "node:test";
import assert from "node:assert/strict";
import { completionInsertion } from "../ui/completion-insertion.js";

// ------------------------------------------------------------------- fields

test("a named argument is inserted with its equals sign", () => {
  const insertion = completionInsertion(
    { kind: "field", name: "label" },
    { source: "main.equation(x = 1, lab", tokenStart: 21, tokenEnd: 24 }
  );
  assert.equal(insertion.inserted, "label=");
  assert.equal(insertion.caretOffset, "label=".length);
});

test("a named argument keeps an existing separator instead of doubling it", () => {
  const equals = completionInsertion(
    { kind: "field", name: "label" },
    { source: "main.equation(x = 1, label=", tokenStart: 21, tokenEnd: 26 }
  );
  assert.equal(equals.inserted, "label");
  assert.equal(equals.caretOffset, "label".length);
});

test("a method suggestion inserts a call and leaves the caret inside it", () => {
  const insertion = completionInsertion(
    { kind: "method", name: "paragraph" },
    { source: "main.", tokenStart: 5, tokenEnd: 5 }
  );
  assert.equal(insertion.inserted, "paragraph(");
  assert.equal(insertion.caretOffset, "paragraph(".length);
});

// ------------------------------------------------------------------- values

test("a quoted value is inserted inside double quotes", () => {
  const insertion = completionInsertion(
    { kind: "value", name: "A4", value: "A4", quote: true },
    { source: 'page({ size: "" })', tokenStart: 13, tokenEnd: 15 }
  );
  assert.equal(insertion.inserted, '"A4"');
  assert.equal(insertion.caretOffset, 4);
});

test("an unquoted value is inserted as written", () => {
  const insertion = completionInsertion(
    { kind: "value", name: "1", value: "1", quote: false },
    { source: "page({ columns:  })", tokenStart: 15, tokenEnd: 15 }
  );
  assert.equal(insertion.inserted, "1");
  assert.equal(insertion.caretOffset, 1);
});

// ------------------------------------------------------------- expressions

test("a function suggestion is inserted expanded, with the names of its parameters", () => {
  const insertion = completionInsertion(
    {
      kind: "function",
      name: "sum",
      args: [
        { name: "variable" },
        { name: "start" },
        { name: "end" },
        { name: "expression" }
      ]
    },
    { source: "su", tokenStart: 0, tokenEnd: 2 }
  );
  assert.equal(insertion.inserted, "sum(variable, start, end, expression)");
  assert.equal(insertion.caretOffset, insertion.inserted.length);
  assert.equal(insertion.selectionStart, 4, "the first parameter is selected");
  assert.equal(insertion.selectionEnd, 12);
});

test("a function without arguments is inserted as an empty call", () => {
  const insertion = completionInsertion(
    { kind: "function", name: "sin" },
    { source: "si", tokenStart: 0, tokenEnd: 2 }
  );
  assert.equal(insertion.inserted, "sin()");
  assert.equal(insertion.caretOffset, 4);
});

test("a constant suggestion is inserted without parentheses", () => {
  const insertion = completionInsertion(
    { kind: "constant", name: "pi" },
    { source: "p", tokenStart: 0, tokenEnd: 1 }
  );
  assert.equal(insertion.inserted, "pi");
  assert.equal(insertion.caretOffset, 2);
});

test("a component suggestion expands to an indented starter snippet", () => {
  const insertion = completionInsertion(
    { kind: "component", name: "section", snippet: "section($0)\n" },
    { source: "document({\n  content: [\n    sec", tokenStart: 28, tokenEnd: 31 }
  );
  assert.equal(insertion.inserted, "section()\n    ");
  assert.equal(insertion.caretOffset, 8);
});

test("a snippet without a caret marker keeps the caret after the text", () => {
  const insertion = completionInsertion(
    { kind: "component", name: "proof", snippet: "proof([])" },
    { source: "pro", tokenStart: 0, tokenEnd: 3 }
  );
  assert.equal(insertion.inserted, "proof([])");
  assert.equal(insertion.caretOffset, "proof([])".length);
});
