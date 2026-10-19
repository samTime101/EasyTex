import test from "node:test";
import assert from "node:assert/strict";
import { FUNCTIONS, CONSTANTS } from "../src/builtins.js";
import {
  FUNCTION_DOCS,
  CONSTANT_DOCS,
  OPERATOR_DOCS,
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
