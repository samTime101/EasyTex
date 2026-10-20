import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_CONTEXTS, contextFieldDocs } from "../src/docs/field-contexts.js";
import { completionContextAt, bindingsBefore } from "../ui/completion-context.js";

function names(result) {
  return (result?.candidates ?? []).map((candidate) => candidate.name);
}

// The completion at the end of a source.
function at(source) {
  return completionContextAt(source, source.length);
}

// The completion just before the last character, as if the caret were inside
// an empty string.
function inside(source) {
  return completionContextAt(source, source.length - 1);
}

const PREAMBLE = 'document = Document(type="article", title="T")\nmain = document.section("S")\n';

// -------------------------------------------------------------------- fields

test("every completion context references documented fields", () => {
  for (const [context, definition] of Object.entries(FIELD_CONTEXTS)) {
    assert.ok(definition.fields.length > 0, `${context} has fields`);
    assert.equal(
      contextFieldDocs(context).length,
      new Set(definition.fields).size,
      `${context} fields are all documented`
    );
  }
  assert.deepEqual(contextFieldDocs("__proto__"), []);
});

test("the bindings before the caret are known", () => {
  const source = `${PREAMBLE}fig = main.figure()\nrefs = document.bibliography()\n`;
  const bindings = bindingsBefore(source, source.length);
  assert.deepEqual([...bindings.keys()], ["document", "main", "fig", "refs"]);
  assert.equal(bindings.get("document").kind, "document");
  assert.equal(bindings.get("main").kind, "section");
  assert.equal(bindings.get("fig").kind, "figure");
  assert.equal(bindings.get("refs").kind, "references");
});

test("the methods of the container are offered after a dot", () => {
  const methods = at(`${PREAMBLE}main.`);
  assert.equal(methods.type, "method");
  assert.ok(names(methods).includes("paragraph"));
  assert.ok(names(methods).includes("equation"));
  assert.ok(!names(methods).includes("book"), "a reference entry is not a block method");
  assert.ok(!names(methods).includes("image"), "an image belongs to a figure");

  const figure = at(`${PREAMBLE}fig = main.figure()\nfig.`);
  assert.deepEqual(names(figure), ["image"]);

  const references = at(`${PREAMBLE}refs = document.bibliography()\nrefs.`);
  assert.ok(names(references).includes("book"));
  assert.ok(names(references).includes("article"));
  assert.ok(!names(references).includes("paragraph"));

  const document = at('document = Document(type="article")\ndocument.');
  assert.ok(names(document).includes("section"));
  assert.ok(names(document).includes("page"));
  assert.ok(names(document).includes("bibliography"));
});

test("the methods are filtered by the prefix that is typed", () => {
  const partial = at(`${PREAMBLE}main.para`);
  assert.equal(partial.type, "method");
  assert.equal(partial.prefix, "para");
  assert.deepEqual(names(partial), ["paragraph"]);
  assert.equal(partial.tokenStart, PREAMBLE.length + 5);
  assert.equal(partial.tokenEnd, PREAMBLE.length + 9);
});

test("an unknown name offers no methods", () => {
  assert.equal(at(`${PREAMBLE}ghost.`), null);
  assert.equal(at("nothing."), null);
});

test("the named arguments of a method are offered", () => {
  const equation = at(`${PREAMBLE}main.equation(x = 1, `);
  assert.equal(equation.type, "field");
  assert.deepEqual(names(equation), ["number", "label"]);

  const table = at(`${PREAMBLE}main.table(["A"], [[1]], `);
  assert.deepEqual(names(table), ["caption", "label", "align"]);

  const theorem = at(`${PREAMBLE}main.theorem("T", `);
  assert.deepEqual(names(theorem), ["content", "label"]);
});

test("the metadata of Document is offered", () => {
  const metadata = at("document = Document(");
  assert.equal(metadata.type, "field");
  assert.deepEqual(names(metadata), [
    "type",
    "title",
    "subtitle",
    "author",
    "date",
    "language",
    "keywords",
    "abstract",
    "affiliations"
  ]);
});

test("the arguments already given are not offered again", () => {
  const result = at(`${PREAMBLE}main.equation(x = 1, label="eq:a", `);
  assert.deepEqual(names(result), ["number"]);
});

test("a partially typed argument replaces only that name", () => {
  const source = `${PREAMBLE}main.equation(x = 1, lab`;
  const result = at(source);
  assert.equal(result.type, "field");
  assert.equal(result.prefix, "lab");
  assert.equal(result.tokenStart, source.length - 3);
  assert.equal(result.tokenEnd, source.length);
  assert.deepEqual(names(result), ["label"]);
});

test("a method that may not be called on the container offers nothing", () => {
  const wrong = at(`${PREAMBLE}fig = main.figure()\nfig.equation(`);
  assert.equal(wrong, null);
});

// -------------------------------------------------------------------- values

test("the values of a named argument are offered inside the quotes", () => {
  const sizes = inside(`${PREAMBLE}main.page(size="`);
  assert.equal(sizes.type, "value");
  assert.deepEqual(names(sizes).slice(0, 5), ["A4", "A3", "A5", "Letter", "Legal"]);
  assert.equal(sizes.candidates[0].isDefault, true);
  assert.equal(sizes.candidates[0].quote, true);

  const templates = inside('document = Document(type="');
  assert.equal(templates.type, "value");
  assert.equal(templates.candidates[0].name, "article");
  assert.equal(templates.candidates[0].isDefault, true);

  const alignment = inside(`${PREAMBLE}main.table(["A"], [[1]], align="`);
  assert.deepEqual(names(alignment), ["left", "center", "right"]);
});

test("the values are offered when the caret sits after the empty string", () => {
  const source = `${PREAMBLE}main.page(size=""`;
  const result = at(source);
  assert.equal(result.type, "value");
  assert.deepEqual(names(result).slice(0, 5), ["A4", "A3", "A5", "Letter", "Legal"]);
  assert.equal(result.prefix, "");
});

test("a string that is not a value offers nothing", () => {
  assert.equal(inside(`${PREAMBLE}main.paragraph("abc`).type, "blocked");
  assert.equal(inside(`${PREAMBLE}main.paragraph("a`).type, "blocked");
});

test("a comment suppresses completion", () => {
  assert.equal(at(`${PREAMBLE}// a comment`).type, "blocked");
  assert.equal(at(`${PREAMBLE}/* a comment`).type, "blocked");
});

test("the reference fields follow the method that was chosen", () => {
  const book = at(`${PREAMBLE}refs = document.bibliography()\nrefs.book("k", `);
  assert.equal(book.type, "field");
  assert.ok(names(book).includes("publisher"));
  assert.ok(names(book).includes("year"));
  assert.ok(!names(book).includes("journal"), "a book has no journal");

  const article = at(`${PREAMBLE}refs = document.bibliography()\nrefs.article("k", `);
  assert.ok(names(article).includes("journal"));
  assert.ok(!names(article).includes("publisher"));
});

// -------------------------------------------------------------------- limits

test("a method call on an unknown name offers nothing", () => {
  assert.equal(at(`${PREAMBLE}ghost.paragraph("`).type, "blocked");
  assert.equal(at(`${PREAMBLE}ghost.`), null);
});

test("the completion does not open outside a call or a member access", () => {
  assert.equal(at(`${PREAMBLE}main`), null);
  assert.equal(at(""), null);
});

test("value candidates carry consistent insertion metadata", () => {
  const sizes = inside(`${PREAMBLE}main.page(size="`);
  for (const candidate of sizes.candidates) {
    assert.equal(candidate.kind, "value");
    assert.equal(candidate.name, candidate.value);
    assert.equal(candidate.quote, true);
    assert.equal(typeof candidate.signature, "string");
    assert.equal(typeof candidate.summary, "string");
  }
  assert.equal(sizes.candidates.filter((candidate) => candidate.isDefault).length, 1);
});
