import test from "node:test";
import assert from "node:assert/strict";
import { compile, parse, validate, renderLaTeX } from "../src/index.js";

const valid = [
  "sum(i, 1, n, i^2)",
  "product(i, 1, n, i)",
  "integral(x, 0, 1, x^2)",
  "frac(a + b, c + d)",
  "sqrt(x^2 + 1)",
  "limit(x, 0, sin(x)/x)",
  "sum(i, 1, n, product(j, 1, i, j))",
  "matrix([[1, 2], [3, 4]])",
  "vector([x, y, z])",
  "2^3^2",
  "-2^2",
  "2^-1",
  "frac(a, sum(i, 1, n, i))",
  "a + b = c + d",
  "x < 5",
  "x + 1 = 5",
  "derivative(x, x^2 + 1)",
  "partial(x, x^2 + y^2)",
  "limit(x, infinity, 1/x)",
  "integral(x, -infinity, infinity, exp(-x^2))",
  "sum(pi, 1, n, pi)",
  "root(abs(x - 3), 3)",
  "logbase(x, 2)",
  "a % b",
  "f(x) + f(x - a)",
  "foo(x, y)"
];

test("valid conformance examples compile", () => {
  for (const source of valid) {
    const result = compile(source);
    assert.deepEqual(
      result.diagnostics.map((diag) => diag.message),
      [],
      `expected no diagnostics for: ${source}`
    );
    assert.ok(result.latex.length > 0, `expected LaTeX for: ${source}`);
    assert.ok(result.mathml.startsWith("<math"), `expected MathML for: ${source}`);
  }
});

const invalid = [
  ["2x", "syntax"],
  ["2 x", "syntax"],
  ["2pi", "syntax"],
  ["(x + 1)(x - 1)", "syntax"],
  ["sum(i, 1, n)", "arity"],
  ["logbase(x)", "arity"],
  ["sqrt(x + 1", "syntax"],
  ["a < b < c", "syntax"],
  ["matrix([[1, 2], [3]])", "structure"],
  ["matrix([])", "structure"],
  ["vector([])", "structure"],
  ["sum(i + 1, 1, n, i)", "structure"],
  ["frac(a, b,)", "syntax"],
  ["frac(a, , b)", "syntax"],
  ["sin(x < 5)", "type"],
  ["(x < 5) + 1", "type"],
  ["x = (y < 5)", "type"],
  ["[1, 2]", "type"],
  ["sum(sin, 1, n, 1)", "name"],
  ["pi(2)", "name"],
  ["cases(x)", "reserved"],
  ["sum(i, 1, infinity, i)", "domain"],
  ["infinity + 1", "domain"],
  [".5", "lexical"],
  ["1.", "lexical"]
];

test("invalid conformance examples are rejected", () => {
  for (const [source, category] of invalid) {
    const result = compile(source);
    assert.ok(result.diagnostics.length > 0, `expected a diagnostic for: ${source}`);
    assert.ok(
      result.diagnostics.some((diag) => diag.category === category),
      `expected category '${category}' for: ${source}, got ${result.diagnostics
        .map((diag) => diag.category)
        .join(", ")}`
    );
  }
});

test("precedence and associativity follow the specification", () => {
  const { ast } = parse("2 + 3 * 4");
  assert.equal(ast.kind, "Binary");
  assert.equal(ast.operator, "+");
  assert.equal(ast.right.operator, "*");

  const power = parse("2^3^2").ast;
  assert.equal(power.operator, "^");
  assert.equal(power.right.operator, "^");

  const negative = parse("-2^2").ast;
  assert.equal(negative.kind, "Unary");
  assert.equal(negative.operand.operator, "^");

  const negativeExponent = parse("2^-1").ast;
  assert.equal(negativeExponent.operator, "^");
  assert.equal(negativeExponent.right.kind, "Unary");
});

test("nested comma boundaries are respected", () => {
  const { ast } = parse("frac(a, sum(i, 1, n, i))");
  assert.equal(ast.kind, "Call");
  assert.equal(ast.callee.name, "frac");
  assert.equal(ast.args.length, 2);
  assert.equal(ast.args[1].callee.name, "sum");
  assert.equal(ast.args[1].args.length, 4);
});

test("bounded variables are local and bounds resolve outside the binding", () => {
  const result = compile("sum(i, 1, n, product(j, 1, i, j))");
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.latex, "\\sum_{i = 1}^{n} \\prod_{j = 1}^{i} j");
});

test("a bound variable may shadow a constant", () => {
  const { ast } = parse("sum(pi, 1, n, pi)");
  validate(ast);
  const body = ast.args[3];
  assert.equal(body.name, "pi");
  assert.equal(body.binding, "bound");
  assert.equal(renderLaTeX(ast), "\\sum_{\\mathrm{pi} = 1}^{n} \\mathrm{pi}");
});

test("function names cannot be used as values", () => {
  const { ast } = parse("sin + 1");
  const { diagnostics } = validate(ast);
  assert.ok(diagnostics.some((diag) => diag.message.includes("cannot be used as a value")));
});

test("unknown bare identifiers are free variables", () => {
  const { ast } = parse("x + 1");
  const { diagnostics } = validate(ast);
  assert.equal(diagnostics.length, 0);
});

test("matrices require equal row lengths and vectors need entries", () => {
  const matrix = compile("matrix([[1, 2, 3], [4, 5, 6]])");
  assert.equal(matrix.diagnostics.length, 0);

  const ragged = compile("matrix([[1, 2], [3]])");
  assert.ok(ragged.diagnostics.some((diag) => diag.message.includes("same length")));

  const vector = compile("vector([x, y])");
  assert.equal(vector.diagnostics.length, 0);
});

test("exp falls back to function notation when e is bound", () => {
  const shadowed = compile("sum(e, 0, 1, exp(e))");
  assert.equal(shadowed.diagnostics.length, 0);
  assert.ok(shadowed.latex.includes("\\exp"));

  const free = compile("exp(x)");
  assert.ok(free.latex.includes("e^{x}"));
});

test("logbase renders the base as a subscript", () => {
  const result = compile("logbase(x, 2)");
  assert.deepEqual(result.diagnostics.map((diag) => diag.message), []);
  assert.equal(result.latex, "\\log_{2}\\left(x\\right)");
  assert.ok(
    result.mathml.includes('<msub><mi mathvariant="normal">log</mi><mn>2</mn></msub>'),
    "MathML should place 2 in a subscript on log"
  );

  const symbolic = compile("logbase(x^2 + 1, e)");
  assert.equal(symbolic.latex, "\\log_{e}\\left(x^{2}+1\\right)");
  assert.ok(symbolic.mathml.includes('<msub><mi mathvariant="normal">log</mi><mi>e</mi></msub>'));
});

test("comments and whitespace are ignored", () => {
  const multiline = compile("sum(\n  i, // index\n  1,\n  n,\n  i^2\n)");
  assert.equal(multiline.diagnostics.length, 0);
  assert.equal(multiline.latex, "\\sum_{i = 1}^{n} i^{2}");
});

test("rendering uses fractions for division and preserves grouping", () => {
  assert.equal(compile("frac(a, b)").latex, "\\frac{a}{b}");
  assert.equal(compile("a/b").latex, "\\frac{a}{b}");
  assert.equal(compile("a/b/c").latex, "\\frac{\\frac{a}{b}}{c}");
  assert.equal(compile("(a + b)*c").latex, "\\left(a+b\\right)\\cdot c");
});

test("free identifiers are applied as functions", () => {
  const result = compile("f(x) + f(x - a)");
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.latex, "f\\left(x\\right)+f\\left(x-a\\right)");
  assert.ok(result.mathml.includes("<mi>f</mi>"));

  const multi = compile("g(x, y)");
  assert.equal(multi.diagnostics.length, 0);
  assert.equal(multi.latex, "g\\left(x, y\\right)");

  const named = compile("foo(x)");
  assert.equal(named.diagnostics.length, 0);
  assert.equal(named.latex, "\\mathrm{foo}\\left(x\\right)");

  const greek = compile("phi(x)");
  assert.equal(greek.diagnostics.length, 0);
  assert.ok(greek.latex.startsWith("\\phi"));

  const nested = compile("f(g(x))");
  assert.equal(nested.diagnostics.length, 0);
  assert.equal(nested.latex, "f\\left(g\\left(x\\right)\\right)");
});

test("Greek variants, uppercase Greek, and named symbols render", () => {
  const result = compile("aleph + hbar + emptyset + Gamma + varepsilon + ell + forall + Box");
  assert.deepEqual(result.diagnostics.map((diag) => diag.message), []);
  for (const symbol of ["\u2135", "\u210f", "\u2205", "\u0393", "\u03b5", "\u2113", "\u2200", "\u25a1"]) {
    assert.ok(result.mathml.includes(symbol), `missing ${symbol}`);
  }
  assert.ok(result.mathml.includes('<mi mathvariant="normal">\u0393</mi>'), "uppercase Greek should be upright");
  assert.ok(!result.mathml.includes("<mi>\u0393</mi>"), "uppercase Greek should not be italic");
  for (const command of ["\\aleph", "\\hbar", "\\emptyset", "\\Gamma", "\\varepsilon", "\\ell", "\\forall", "\\Box"]) {
    assert.ok(result.latex.includes(command), `missing ${command}`);
  }
});

test("free function application still checks arguments and names", () => {
  const relation = compile("f(x = y)");
  assert.ok(relation.diagnostics.some((diag) => diag.message.includes("requires a scalar")));

  const stringArg = compile('f("s")');
  assert.ok(stringArg.diagnostics.some((diag) => diag.message.includes("requires a scalar")));

  const constant = compile("pi(x)");
  assert.ok(constant.diagnostics.some((diag) => diag.message.includes("constant, not a function")));

  const imaginary = compile("i(x)");
  assert.ok(imaginary.diagnostics.some((diag) => diag.message.includes("constant, not a function")));
  const realOnly = compile("i(x)", { complex: false });
  assert.equal(realOnly.diagnostics.length, 0);

  const bound = compile("sum(f, 1, n, f(x))");
  assert.equal(bound.diagnostics.length, 0);
  assert.equal(bound.latex, "\\sum_{f = 1}^{n} f\\left(x\\right)");

  const multiplication = compile("f(x)g(x)");
  assert.ok(
    multiplication.diagnostics.some((diag) => diag.message.includes("Implicit multiplication"))
  );
});
