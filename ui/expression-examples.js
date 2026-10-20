// Examples for the expression editor.
//
// The list is shared with the test suite: every example is compiled, and the
// ones marked as errors have to report a diagnostic.

export const EXPRESSION_EXAMPLES = [
  { label: "Sum of squares", source: "sum(i, 1, n, i^2)" },
  { label: "Nested sum and product", source: "sum(i, 1, n, product(j, 1, i, j))" },
  { label: "Product of the first n integers", source: "product(i, 1, n, i)" },
  { label: "Double sum", source: "sum(i, 1, n, sum(j, 1, i, j))" },
  { label: "Harmonic series", source: "sum(i, 1, n, frac(1, i))" },
  { label: "Quadratic formula", source: "x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)" },
  { label: "Gaussian density", source: "frac(1, sqrt(2*pi*sigma^2)) * exp(frac(-(x - mu)^2, 2*sigma^2))" },
  { label: "Nested fraction", source: "frac(1, frac(1, 2))" },
  { label: "A rational identity", source: "frac(x^2 - 1, x - 1) = x + 1" },
  { label: "Definite integral", source: "integral(x, 0, 1, x^2)" },
  { label: "Improper integral", source: "integral(t, 0, infinity, exp(-t))" },
  { label: "Limit", source: "limit(x, 0, sin(x)/x)" },
  { label: "Limit at infinity", source: "limit(x, infinity, frac(1, x))" },
  { label: "Derivative", source: "derivative(x, x^2 + 1)" },
  { label: "Second derivative", source: "derivative(x, derivative(x, f(x)))" },
  { label: "Partial derivative", source: "partial(x, x^2 + y^2)" },
  { label: "Mixed partial", source: "partial(y, partial(x, f(x, y)))" },
  { label: "Matrix", source: "matrix([[1, 2], [3, 4]])" },
  { label: "Matrix of symbols", source: "matrix([[a, b], [c, d]])" },
  { label: "Column vector", source: "vector([x, y, z])" },
  { label: "Vector of squares", source: "vector([x^2, y^2, z^2])" },
  { label: "Root and absolute value", source: "root(abs(x - 3), 3)" },
  { label: "Base-2 logarithm", source: "logbase(x, 2)" },
  { label: "The natural logarithm", source: "ln(e^x) = x" },
  { label: "Euler's identity", source: "e^(i*pi) + 1 = 0" },
  { label: "Square root of a negative number", source: "sqrt(-1)" },
  { label: "Trigonometric identity", source: "cos(2*pi*x) = 1 - 2*sin(pi*x)^2" },
  { label: "Greek letters", source: "alpha + beta = gamma" },
  { label: "Function application", source: "f(x) + f(x - a)" },
  { label: "Error: implicit multiplication", source: "2x", error: true },
  { label: "Error: a constant used as a function", source: "pi(x)", error: true },
  { label: "Error: a missing bracket", source: "sum(i, 1, n", error: true },
  { label: "Error: a string in an expression", source: 'sqrt("oops")', error: true }
];

// The editor opens on a scratchpad of two equations: the sum of squares and
// the closed form that goes with it.
export const DEFAULT_EXPRESSION_SOURCE =
  "sum(i, 1, n, i^2)\nsum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6)";
