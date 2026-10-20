import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_CONTEXTS, contextFieldDocs } from "../src/docs/field-contexts.js";
import { completionContextAt } from "../ui/completion-context.js";

function names(result) {
  return (result?.candidates ?? []).map((candidate) => candidate.name);
}

function insideQuotes(source) {
  return completionContextAt(source, source.length - 1);
}

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

test("writer completion offers the fields of the current object", () => {
  const documentFields = completionContextAt("document({ ", 11);
  assert.equal(documentFields.type, "field");
  assert.ok(names(documentFields).includes("title"));
  assert.ok(names(documentFields).includes("content"));
  assert.ok(!names(documentFields).includes("size"));

  const pageFields = completionContextAt("page({ s", 8);
  assert.equal(pageFields.type, "field");
  assert.equal(pageFields.prefix, "s");
  assert.deepEqual(
    names(pageFields).filter((name) => name.startsWith("s")),
    ["size"]
  );

  const midway = completionContextAt("document({ ti", 12);
  assert.equal(midway.type, "field");
  assert.equal(midway.prefix, "t");
  assert.equal(midway.tokenStart, 11);
  assert.equal(midway.tokenEnd, 13);

  const marginFields = completionContextAt("page({ margins: { t", 19);
  assert.equal(marginFields.type, "field");
  assert.equal(marginFields.prefix, "t");
  assert.deepEqual(names(marginFields), ["top", "right", "bottom", "left"]);
});

test("writer completion skips fields that are already present", () => {
  const result = completionContextAt('document({ title: "x", ', 'document({ title: "x", '.length);
  assert.equal(result.type, "field");
  assert.ok(!names(result).includes("title"));
  assert.ok(names(result).includes("subtitle"));
});

test("reference entry completion follows the selected reference type", () => {
  const base = completionContextAt("bibliography([{ ", 16);
  assert.equal(base.type, "field");
  assert.ok(names(base).includes("key"));
  assert.ok(names(base).includes("journal"));
  assert.ok(names(base).includes("publisher"));
  assert.ok(!names(base).includes("abstract"));

  const article = completionContextAt('bibliography([{ key: "a", type: "article", ', 43);
  assert.equal(article.type, "field");
  assert.ok(names(article).includes("journal"));
  assert.ok(!names(article).includes("publisher"));
  assert.ok(!names(article).includes("key"));

  const techreportSource = 'bibliography([{ type: "techreport", ';
  const techreport = completionContextAt(techreportSource, techreportSource.length);
  const number = techreport.candidates.find((candidate) => candidate.name === "number");
  assert.equal(number.signature, "string or number");

  const reportNumber = insideQuotes('bibliography([{ type: "techreport", number: ""');
  assert.equal(reportNumber.type, "blocked");

  const unusualTypeSource = 'bibliography([{ type: "__proto__", ';
  const unusualType = completionContextAt(unusualTypeSource, unusualTypeSource.length);
  assert.equal(unusualType.type, "field");
  assert.ok(names(unusualType).includes("key"));
});

test("field completion stays out of values, strings, and finished objects", () => {
  assert.equal(completionContextAt('document({ title: "x"', 21), null);
  assert.equal(completionContextAt('text("sum', 9)?.type, "blocked");
  assert.equal(completionContextAt('document({ abstract: "sum', 25)?.type, "blocked");
  assert.equal(completionContextAt("document({ /* ti", 15)?.type, "blocked");
  assert.equal(completionContextAt('page({ size: "A4"', 17), null);
});

// -------------------------------------------------------------------- values

test("enumerated object values are offered inside empty quotes", () => {
  const sizes = insideQuotes('page({ size: ""');
  assert.equal(sizes.type, "value");
  assert.deepEqual(names(sizes).slice(0, 5), ["A4", "A3", "A5", "Letter", "Legal"]);
  assert.equal(sizes.candidates[0].isDefault, true);
  assert.equal(sizes.candidates[0].quote, true);

  const templates = insideQuotes('document({ type: ""');
  assert.equal(templates.type, "value");
  assert.equal(templates.candidates[0].name, "article");
  assert.equal(templates.candidates[0].isDefault, true);

  const referenceTypes = insideQuotes('bibliography([{ type: ""');
  assert.equal(referenceTypes.candidates[0].name, "misc");
  assert.equal(referenceTypes.candidates[0].isDefault, true);

  const margins = insideQuotes('page({ margins: { top: ""');
  assert.deepEqual(names(margins), ["25mm"]);
  assert.equal(margins.candidates[0].isDefault, true);

  const unknownObject = insideQuotes('document({ foo: { type: ""');
  assert.equal(unknownObject.type, "blocked");
});

test("the values of a field are offered when the caret sits after the empty string", () => {
  const source = 'page({ size: ""';
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "value");
  assert.deepEqual(names(result).slice(0, 5), ["A4", "A3", "A5", "Letter", "Legal"]);
  assert.equal(result.prefix, "");
  assert.equal(result.tokenStart, 13);
  assert.equal(result.tokenEnd, 15);

  const filled = completionContextAt('page({ size: "A4"', 'page({ size: "A4"'.length);
  assert.equal(filled, null, "a filled value offers nothing");
});

test("non-string options are offered without quote characters", () => {
  const columns = completionContextAt("page({ columns: ", 16);
  assert.equal(columns.type, "value");
  assert.deepEqual(names(columns), ["1", "2", "3"]);
  assert.equal(columns.candidates[0].isDefault, true);
  assert.equal(columns.candidates[0].quote, false);

  const numbering = completionContextAt("equation(x, number=", 19);
  assert.equal(numbering.type, "value");
  assert.deepEqual(names(numbering).slice(0, 2), ["false", "true"]);
  assert.equal(numbering.candidates[0].quote, false);
});

test("named-argument lookup ignores inherited object properties", () => {
  const value = completionContextAt("constructor(number=", "constructor(number=".length);
  assert.equal(value, null);
  assert.equal(insideQuotes('constructor(number=""').type, "blocked");
});

// ------------------------------------------------------------------ nesting

test("nested objects use the nearest object context", () => {
  const pageFields = completionContextAt("document({ content: [page({ ", 31);
  assert.equal(pageFields.type, "field");
  assert.deepEqual(names(pageFields), ["size", "orientation", "margins", "columns"]);

  const marginFields = completionContextAt("document({ content: [page({ margins: { ", 40);
  assert.equal(marginFields.type, "field");
  assert.deepEqual(names(marginFields), ["top", "right", "bottom", "left"]);

  const pageValue = insideQuotes('document({ content: [page({ size: ""');
  assert.equal(pageValue.type, "value");
  assert.equal(pageValue.candidates[0].name, "A4");
});

test("a bibliography inside document metadata still lists reference fields", () => {
  const source = 'document({ bibliography: [{ key: "k", ';
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "field");
  assert.ok(names(result).includes("type"));
  assert.ok(names(result).includes("journal"));
  assert.ok(names(result).includes("title"));
  assert.ok(!names(result).includes("key"));
  assert.ok(!names(result).includes("size"));
});

test("reference completion narrows by type and drops used fields", () => {
  const source = 'bibliography([{ type: "article", journal: "J", ';
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "field");
  assert.ok(names(result).includes("volume"));
  assert.ok(names(result).includes("pages"));
  assert.ok(!names(result).includes("journal"));
  assert.ok(!names(result).includes("publisher"));
  assert.ok(!names(result).includes("type"));
});

test("an unknown reference type keeps every possible field", () => {
  const source = 'bibliography([{ type: "dataset", ';
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "field");
  assert.ok(names(result).includes("journal"));
  assert.ok(names(result).includes("publisher"));
  assert.ok(names(result).includes("institution"));
});

test("reference field docs keep the required fields first", () => {
  const book = contextFieldDocs("reference", "book").map((field) => field.name);
  assert.deepEqual(book, [
    "key",
    "type",
    "author",
    "title",
    "year",
    "publisher",
    "edition",
    "address",
    "doi",
    "url"
  ]);
});

// ------------------------------------------------------------------ parsing

test("commas and braces inside strings do not split object entries", () => {
  const source = 'document({ title: "a, b }", content: [], ';
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "field");
  assert.ok(!names(result).includes("title"));
  assert.ok(!names(result).includes("content"));
  assert.ok(names(result).includes("subtitle"));
});

test("comments inside an object do not change the field context", () => {
  const lineSource = 'document({ title: "x", // }\n  ';
  const line = completionContextAt(lineSource, lineSource.length);
  assert.equal(line.type, "field");
  assert.ok(names(line).includes("subtitle"));

  const blockSource = "document({ /* x */ ";
  const block = completionContextAt(blockSource, blockSource.length);
  assert.equal(block.type, "field");
  assert.ok(names(block).includes("title"));
});

test("a comment suppresses completion while the caret is inside it", () => {
  const lineSource = "document({ // ti";
  const blockSource = "document({ /* ti";
  assert.equal(completionContextAt(lineSource, lineSource.length)?.type, "blocked");
  assert.equal(completionContextAt(blockSource, blockSource.length)?.type, "blocked");
});

test("a partially typed field replaces only the current key", () => {
  const source = "document({ au";
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "field");
  assert.equal(result.prefix, "au");
  assert.equal(result.tokenStart, 11);
  assert.equal(result.tokenEnd, 13);
  assert.ok(names(result).includes("author"));
});

test("a field name followed by spaces still points at that key", () => {
  const source = "document({ au ";
  const result = completionContextAt(source, source.length);
  assert.equal(result.type, "field");
  assert.equal(result.prefix, "au");
  assert.equal(result.tokenStart, 11);
  assert.equal(result.tokenEnd, 14);
});

// -------------------------------------------------------------------- limits

test("unknown objects and unknown fields receive no suggestions", () => {
  assert.equal(completionContextAt("figure({ ", 8), null);
  assert.equal(insideQuotes('figure({ size: ""').type, "blocked");
  assert.equal(insideQuotes('page({ title: ""').type, "blocked");
  assert.equal(insideQuotes('document({ language: ""').type, "blocked");
});

test("a finished value does not reopen the value list", () => {
  assert.equal(completionContextAt('page({ size: "A4"', 17), null);
  assert.equal(completionContextAt("page({ columns: 1", 17), null);
  const typed = 'document({ type: "article"';
  assert.equal(completionContextAt(typed, typed.length), null);
});

test("named arguments offer their own values", () => {
  const align = insideQuotes('table([[]], align=""');
  assert.equal(align.type, "value");
  assert.deepEqual(names(align), ["left", "center", "right"]);
  assert.equal(align.candidates[0].isDefault, true);
  assert.equal(align.candidates[0].quote, true);

  const numbering = completionContextAt("equation(x, number = ", 21);
  assert.equal(numbering.type, "value");
  assert.deepEqual(names(numbering), ["false", "true"]);
  assert.equal(numbering.candidates[0].quote, false);

  const label = insideQuotes('section("S", label=""');
  assert.equal(label.type, "blocked");
});

test("a table cell string is not mistaken for a named argument", () => {
  const cell = insideQuotes('table([["a", ""');
  assert.equal(cell.type, "blocked");
});

// ------------------------------------------------------------------ metadata

test("value candidates carry consistent insertion metadata", () => {
  const sizes = insideQuotes('page({ size: ""');
  for (const candidate of sizes.candidates) {
    assert.equal(candidate.kind, "value");
    assert.equal(candidate.name, candidate.value);
    assert.equal(candidate.quote, true);
    assert.equal(typeof candidate.signature, "string");
    assert.equal(typeof candidate.summary, "string");
  }
  assert.equal(sizes.candidates.filter((candidate) => candidate.isDefault).length, 1);
  assert.equal(sizes.candidates[0].isDefault, true);
});

test("field signatures expose the value type and the default", () => {
  const signature = (result, name) =>
    result.candidates.find((candidate) => candidate.name === name)?.signature;

  const page = completionContextAt("page({ ", 7);
  assert.equal(signature(page, "size"), "string · default A4");
  assert.equal(signature(page, "orientation"), "string · default portrait");
  assert.equal(signature(page, "columns"), "number · default 1");

  const margins = completionContextAt("page({ margins: { ", 17);
  assert.equal(signature(margins, "top"), "string · default 25mm");

  const documentFields = completionContextAt("document({ ", 11);
  assert.equal(signature(documentFields, "type"), "string · default article");

  const reference = completionContextAt("bibliography([{ ", 16);
  assert.equal(signature(reference, "type"), "string · default misc");
});
