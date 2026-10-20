import test from "node:test";
import assert from "node:assert/strict";
import { callEnd, nextPlaceholder, placeholderPositions } from "../ui/placeholders.js";
import { completionInsertion } from "../ui/completion-insertion.js";
import { docsFor } from "../src/docs/index.js";

// The call a suggestion inserts, with the names of the parameters.
const EXPANDED = "integral(variable, start, end, expression)";

function names(placeholders) {
  return placeholders.map((placeholder) => placeholder.name);
}

test("the placeholders of a call are its parameter names", () => {
  const placeholders = placeholderPositions(EXPANDED, 9);
  assert.deepEqual(names(placeholders), ["variable", "start", "end", "expression"]);
  assert.equal(placeholders[0].start, 9);
  assert.equal(placeholders[0].end, 17);
  assert.equal(placeholders[1].start, 19);
  assert.equal(placeholders[1].end, 24);
  assert.equal(placeholders[3].start, 31);
  assert.equal(placeholders[3].end, 41);
});

test("a placeholder that has been replaced is no longer a placeholder", () => {
  const written = "integral(x, start, end, expression)";
  assert.deepEqual(names(placeholderPositions(written, 10)), [
    "start",
    "end",
    "expression"
  ]);
});

test("Tab moves to the next placeholder", () => {
  const next = nextPlaceholder(EXPANDED, 9);
  assert.equal(next.name, "start");
  assert.equal(next.start, 19);

  const after = nextPlaceholder(EXPANDED, 19);
  assert.equal(after.name, "end");

  const last = nextPlaceholder(EXPANDED, 26);
  assert.equal(last.name, "expression");

  assert.equal(nextPlaceholder(EXPANDED, 31), null, "there is no placeholder after the last one");
});

test("a call without arguments has no placeholders", () => {
  assert.deepEqual(placeholderPositions("sin(x)", 5), []);
  assert.equal(nextPlaceholder("sin(x)", 5), null);
});

test("a call that is not a function has no placeholders", () => {
  assert.deepEqual(placeholderPositions("myOwnThing(a, b)", 12), []);
});

test("the placeholders of a nested call belong to the inner call", () => {
  const source = "frac(integral(variable, start, end, expression), 2)";
  const placeholders = placeholderPositions(source, 20);
  assert.deepEqual(names(placeholders), ["variable", "start", "end", "expression"]);
});

test("the end of a call is the position after its bracket", () => {
  assert.equal(callEnd(EXPANDED, 9), EXPANDED.length);
  assert.equal(callEnd(EXPANDED, 41), EXPANDED.length);
  assert.equal(callEnd("integral(variable, start", 20), null, "the call is still open");
  assert.equal(callEnd("sum(i, 1, n, i^2) + 1", 10), 17);
});

test("the expanded call of a suggestion is the one the editor writes", () => {
  const insertion = completionInsertion(docsFor("integral"), {
    source: "integral",
    tokenStart: 0,
    tokenEnd: 8
  });
  assert.equal(insertion.inserted, EXPANDED);
  assert.equal(insertion.selectionStart, 9);
  assert.equal(insertion.selectionEnd, 17);
});
