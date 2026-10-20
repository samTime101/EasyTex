import test from "node:test";
import assert from "node:assert/strict";
import { compileScratchpad } from "../src/index.js";
import { splitTopLevel } from "../src/lexer.js";
import { parseSequence } from "../src/parser.js";

function texts(source) {
  return splitTopLevel(source).map((range) => source.slice(range.start, range.end).trim());
}

test("a source is split at the line breaks that end an expression", () => {
  assert.deepEqual(texts("a + b"), ["a + b"]);
  assert.deepEqual(texts("a + b\nc + d"), ["a + b", "c + d"]);
  assert.deepEqual(texts("a + b\r\nc + d"), ["a + b", "c + d"]);
  assert.deepEqual(texts(""), []);
  assert.deepEqual(texts("   \n  \n"), []);
});

test("an expression that continues over several lines stays whole", () => {
  assert.deepEqual(texts("sum(\n  i, 1, n, i^2\n)"), ["sum(\n  i, 1, n, i^2\n)"]);
  assert.deepEqual(texts("frac(a,\n  b) + 1"), ["frac(a,\n  b) + 1"]);
});

test("a comment never splits an expression", () => {
  assert.deepEqual(texts("frac(a, b) /* one\ntwo */ + 1"), ["frac(a, b) /* one\ntwo */ + 1"]);
  assert.deepEqual(texts("x = 5 // a note\ny = 6"), ["x = 5 // a note", "y = 6"]);
});

test("every expression of a scratchpad is compiled on its own", () => {
  const result = compileScratchpad("sum(i, 1, n, i^2)\nx = frac(1, 2)", { complex: true });
  assert.equal(result.expressions.length, 2);
  assert.equal(result.expressions[0].ast.kind, "Call");
  assert.equal(result.expressions[1].ast.kind, "Relation");
  assert.deepEqual(result.diagnostics, []);
  assert.match(result.latex, /\\sum/);
  assert.match(result.latex, /\\frac/);
  assert.equal(result.mathml.split("<math").length - 1, 2);
});

test("a broken expression does not hide the ones around it", () => {
  const result = compileScratchpad("a + b\n2x\nc + d", { complex: true });
  assert.equal(result.expressions.length, 3);
  assert.ok(result.expressions[0].mathml, "the first expression still renders");
  assert.equal(result.expressions[1].mathml, null, "the broken one does not");
  assert.ok(result.expressions[2].mathml, "and the last one does");
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0].message, /Implicit multiplication/);
});

test("the diagnostics of a scratchpad point at the right line", () => {
  const result = compileScratchpad("a + b\n2x\nc + d", { complex: true });
  const [diagnostic] = result.diagnostics;
  assert.equal(diagnostic.span.start.line, 2);
  assert.equal(diagnostic.span.start.column, 2);
  assert.equal(diagnostic.span.start.offset, 7, "the offending character");
});

test("the language itself still holds one expression", () => {
  const { expressions } = parseSequence("a + b");
  assert.equal(expressions.length, 1);
  assert.equal(expressions[0].ast.kind, "Binary");
});

test("a single expression behaves exactly like the plain compiler", () => {
  const source = "sum(i, 1, n, i^2)";
  const scratchpad = compileScratchpad(source, { complex: true });
  assert.equal(scratchpad.expressions.length, 1);
  assert.match(scratchpad.latex, /\\sum/);
  assert.equal(scratchpad.ast.length, 1);
});
