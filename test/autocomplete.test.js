import test from "node:test";
import assert from "node:assert/strict";
import { completionInsertion } from "../ui/completion-insertion.js";

// ------------------------------------------------------------------- fields

test("a field name is inserted with its separator and a trailing space", () => {
  const insertion = completionInsertion(
    { kind: "field", name: "title" },
    { source: "document({ ti", tokenStart: 11, tokenEnd: 13 }
  );
  assert.equal(insertion.inserted, "title: ");
  assert.equal(insertion.caretOffset, "title: ".length);
});

test("a field name keeps an existing separator instead of doubling it", () => {
  const colon = completionInsertion(
    { kind: "field", name: "title" },
    { source: "document({ title:", tokenStart: 11, tokenEnd: 16 }
  );
  assert.equal(colon.inserted, "title");

  const equals = completionInsertion(
    { kind: "field", name: "title" },
    { source: "document({ title=", tokenStart: 11, tokenEnd: 16 }
  );
  assert.equal(equals.inserted, "title");
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

test("a function suggestion inserts a call and leaves the caret inside it", () => {
  const insertion = completionInsertion(
    { kind: "function", name: "sum" },
    { source: "su", tokenStart: 0, tokenEnd: 2 }
  );
  assert.equal(insertion.inserted, "sum()");
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
