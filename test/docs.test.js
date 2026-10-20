import test from "node:test";
import assert from "node:assert/strict";
import { FUNCTIONS, CONSTANTS, GREEK, LATEX_GREEK } from "../src/builtins.js";
import { SYMBOLS } from "../src/symbols.js";
import {
  FUNCTION_DOCS,
  CONSTANT_DOCS,
  OPERATOR_DOCS,
  GREEK_DOCS,
  SYMBOL_DOCS,
  LATEX_DOCS,
  LATEX_CATEGORY_ORDER,
  LATEX_SECTIONS,
  LATEX_TARGETS,
  matchDocumentation,
  docsFor,
  documentationNames,
  groupFunctionsByCategory
} from "../src/docs/index.js";
import { compile } from "../src/index.js";

test("every built-in function and constant has documentation", () => {
  for (const name of Object.keys(FUNCTIONS)) {
    assert.ok(docsFor(name), `missing documentation for function '${name}'`);
  }
  for (const name of CONSTANTS) {
    assert.ok(docsFor(name), `missing documentation for constant '${name}'`);
  }
  for (const doc of [...FUNCTION_DOCS, ...CONSTANT_DOCS]) {
    assert.ok(
      Object.hasOwn(FUNCTIONS, doc.name) || CONSTANTS.has(doc.name),
      `documentation exists for unknown name '${doc.name}'`
    );
  }
});

test("every Greek letter name is documented with its symbol and LaTeX form", () => {
  assert.equal(GREEK_DOCS.length, Object.keys(GREEK).length);
  for (const [name, symbol] of Object.entries(GREEK)) {
    const doc = GREEK_DOCS.find((entry) => entry.name === name);
    assert.ok(doc, `missing documentation for Greek letter '${name}'`);
    assert.equal(doc.symbol, symbol);
    assert.equal(doc.latex, LATEX_GREEK[name]);
    assert.equal(doc.constant, CONSTANTS.has(name));
    assert.equal(typeof doc.note, "string");

    const registryDoc = docsFor(name);
    assert.ok(registryDoc, `Greek letter '${name}' is missing a registry entry`);
    assert.equal(registryDoc.kind, CONSTANTS.has(name) ? "constant" : "symbol");
    assert.equal(registryDoc.signature, name);
    if (!CONSTANTS.has(name)) {
      assert.ok(registryDoc.summary.includes(symbol), `summary for '${name}' is missing its glyph`);
      assert.equal(registryDoc.examples[0].source, name);
    }
  }
  assert.equal(docsFor("pi").kind, "constant");
  const withoutSymbol = GREEK_DOCS.filter((entry) => [...entry.symbol].length !== 1);
  assert.deepEqual(withoutSymbol, [], "each Greek entry holds exactly one symbol");
});

test("every named symbol is documented and renders as a symbol", () => {
  assert.equal(SYMBOL_DOCS.length, Object.keys(SYMBOLS).length);
  for (const [name, symbol] of Object.entries(SYMBOLS)) {
    assert.match(name, /^[A-Za-z][A-Za-z0-9_]*$/, `invalid identifier '${name}'`);
    assert.ok(!Object.hasOwn(FUNCTIONS, name), `symbol '${name}' collides with a function`);
    assert.ok(!CONSTANTS.has(name), `symbol '${name}' collides with a constant`);
    assert.ok(!Object.hasOwn(GREEK, name), `symbol '${name}' collides with a Greek name`);

    const doc = SYMBOL_DOCS.find((entry) => entry.name === name);
    assert.ok(doc, `missing documentation for symbol '${name}'`);
    assert.equal(doc.symbol, symbol);
    assert.equal(doc.latex, `\\${name}`);
    assert.equal(typeof doc.note, "string");

    const registryDoc = docsFor(name);
    assert.ok(registryDoc, `symbol '${name}' is missing a registry entry`);
    assert.equal(registryDoc.kind, "symbol");
    assert.equal(registryDoc.signature, name);
    assert.ok(registryDoc.summary.includes(symbol), `summary for '${name}' is missing its glyph`);
    assert.equal(registryDoc.examples[0].source, name);

    const result = compile(name);
    assert.deepEqual(
      result.diagnostics.map((diag) => diag.message),
      [],
      `symbol '${name}' did not compile`
    );
    assert.ok(result.mathml.includes(symbol), `MathML for '${name}' is missing '${symbol}'`);
    assert.ok(result.latex.includes(doc.latex), `LaTeX for '${name}' is missing '${doc.latex}'`);
  }
});

test("the LaTeX reference is ordered, complete, and internally consistent", () => {
  const categories = new Set(LATEX_CATEGORY_ORDER);
  const seenLatex = new Set();
  let categoryIndex = 0;
  for (const doc of LATEX_DOCS) {
    const nextCategory = LATEX_CATEGORY_ORDER.indexOf(doc.category);
    assert.ok(nextCategory >= categoryIndex, `LaTeX category '${doc.category}' is out of order`);
    categoryIndex = nextCategory;
    assert.ok(categories.has(doc.category), `unknown LaTeX category '${doc.category}'`);
    assert.ok(doc.latex.length > 0, "every LaTeX row needs a command");
    assert.ok(!seenLatex.has(doc.latex), `duplicate LaTeX row '${doc.latex}'`);
    seenLatex.add(doc.latex);
    assert.ok(["native", "approximate", "none"].includes(doc.status));
    assert.equal(typeof doc.note, "string");
    if (doc.status === "none") {
      assert.equal(doc.mathscript, null, `unsupported row '${doc.latex}' has a source`);
      assert.ok(doc.note.length > 0, `unsupported row '${doc.latex}' needs a note`);
    } else {
      assert.ok(doc.mathscript.length > 0, `supported row '${doc.latex}' has no source`);
    }
  }

  const targets = LATEX_TARGETS;
  for (const name of Object.keys(FUNCTIONS)) {
    assert.ok(targets.has(name), `no LaTeX reference row targets function '${name}'`);
  }
  for (const name of CONSTANTS) {
    assert.ok(targets.has(name), `no LaTeX reference row targets constant '${name}'`);
  }
  for (const name of Object.keys(GREEK)) {
    assert.ok(targets.has(name), `no LaTeX reference row targets Greek letter '${name}'`);
  }
  for (const operator of OPERATOR_DOCS) {
    assert.ok(targets.has(operator.symbol), `no LaTeX reference row targets operator '${operator.symbol}'`);
  }
  for (const name of Object.keys(SYMBOLS)) {
    assert.ok(targets.has(name), `no LaTeX reference row targets symbol '${name}'`);
  }

  for (const doc of GREEK_DOCS) {
    assert.ok(
      LATEX_DOCS.some((row) => row.target === doc.name && row.latex === doc.latex),
      `Greek letter '${doc.name}' is missing its exact LaTeX row`
    );
  }
  for (const doc of SYMBOL_DOCS) {
    assert.ok(
      LATEX_DOCS.some((row) => row.target === doc.name && row.latex === doc.latex),
      `symbol '${doc.name}' is missing its exact LaTeX row`
    );
  }

  const sectionCategories = new Set(LATEX_SECTIONS.flatMap((section) => section.categories));
  for (const category of LATEX_CATEGORY_ORDER) {
    assert.ok(sectionCategories.has(category), `category '${category}' is missing from a LaTeX section`);
  }
});

test("every documented example compiles without diagnostics", () => {
  for (const doc of [...FUNCTION_DOCS, ...CONSTANT_DOCS]) {
    assert.ok(doc.examples.length > 0, `'${doc.name}' has no examples`);
    for (const example of doc.examples) {
      const result = compile(example.source);
      assert.deepEqual(
        result.diagnostics.map((diag) => `${diag.category}: ${diag.message}`),
        [],
        `example for '${doc.name}' failed: ${example.source}`
      );
      assert.ok(result.mathml, `example for '${doc.name}' did not render: ${example.source}`);
    }
  }
});

test("operator examples compile when they are complete expressions", () => {
  for (const operator of OPERATOR_DOCS) {
    const result = compile(operator.example);
    assert.deepEqual(
      result.diagnostics.map((diag) => diag.message),
      [],
      `operator example failed: ${operator.example}`
    );
  }
});

test("function signatures begin with the function name", () => {
  for (const doc of FUNCTION_DOCS) {
    assert.ok(
      doc.signature.startsWith(`${doc.name}(`),
      `signature for '${doc.name}' should start with '${doc.name}('`
    );
    assert.ok(doc.summary.length > 0, `'${doc.name}' needs a summary`);
    assert.ok(doc.args.length > 0, `'${doc.name}' needs documented arguments`);
    assert.ok(doc.category, `'${doc.name}' needs a category`);
  }
});

test("every function category is represented and ordered", () => {
  const groups = groupFunctionsByCategory();
  const documented = groups.flatMap((group) => group.items.map((doc) => doc.name)).sort();
  const expected = FUNCTION_DOCS.map((doc) => doc.name).sort();
  assert.deepEqual(documented, expected);
});

test("documentation matching supports prefixes, functions, constants, and components", () => {
  const sumMatches = matchDocumentation("su", { kinds: ["function", "constant"] }).map((doc) => doc.name);
  assert.deepEqual(sumMatches, ["sum"]);

  const pMatches = matchDocumentation("p", { kinds: ["function", "constant"] }).map((doc) => doc.name);
  assert.deepEqual(pMatches, ["partial", "pow", "product", "pi"]);

  const withComponents = matchDocumentation("se", { kinds: ["component"] }).map((doc) => doc.name);
  assert.deepEqual(withComponents, ["section"]);

  const all = matchDocumentation("", { all: true });
  assert.equal(all.length, documentationNames().length);
  assert.ok(all.some((doc) => doc.name === "sqrt" && doc.kind === "function"));
  assert.ok(all.some((doc) => doc.name === "pi" && doc.kind === "constant"));
  assert.ok(all.some((doc) => doc.name === "section" && doc.kind === "component"));
});
