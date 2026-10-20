import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_CONTEXTS, contextFieldDocs } from "../src/docs/field-contexts.js";
import { completionContextAt } from "../web/completion-context.js";

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
