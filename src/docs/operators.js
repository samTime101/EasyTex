export const OPERATOR_DOCS = [
  { symbol: "+", category: "Arithmetic operators", meaning: "Addition", example: "a + b" },
  { symbol: "-", category: "Arithmetic operators", meaning: "Subtraction and negation", example: "a - b" },
  { symbol: "*", category: "Arithmetic operators", meaning: "Multiplication", example: "a * b" },
  { symbol: "/", category: "Arithmetic operators", meaning: "Exact division, rendered as a fraction", example: "a / b" },
  { symbol: "^", category: "Arithmetic operators", meaning: "Exponentiation, right-associative", example: "x^3" },
  { symbol: "%", category: "Arithmetic operators", meaning: "Euclidean modulo for integer operands", example: "a % b" },
  { symbol: "=", category: "Relations", meaning: "Mathematical equality, never assignment", example: "x + 1 = 5" },
  { symbol: "!=", category: "Relations", meaning: "Not equal", example: "x != 0" },
  { symbol: "<", category: "Relations", meaning: "Less than", example: "x < 5" },
  { symbol: ">", category: "Relations", meaning: "Greater than", example: "x > 5" },
  { symbol: "<=", category: "Relations", meaning: "Less than or equal", example: "x <= 5" },
  { symbol: ">=", category: "Relations", meaning: "Greater than or equal", example: "x >= 5" }
];

export const SYNTAX_NOTES = [
  {
    title: "Function calls",
    body: "Every operation is a call with parenthesized, comma-separated arguments. Calls nest, and explicit parentheses define argument boundaries. The callee is always an identifier; (f)(x) and f(x)(y) are not valid calls.",
    example: "frac(a, sum(i, 1, n, i))"
  },
  {
    title: "No implicit multiplication",
    body: "Write every multiplication with an explicit *. Juxtaposition such as 2x, 2pi, or (x + 1)(x - 1) is not valid, and x(y) is always a call to x.",
    example: "2*x + 3*y"
  },
  {
    title: "Whitespace and comments",
    body: "Whitespace is insignificant. A // comment runs to the end of the line; a /* ... */ comment spans up to its closing marker.",
    example: "sum(i, 1, n, i^2) // first n squares"
  },
  {
    title: "Relations are propositions",
    body: "A relation may appear only as a complete expression. It cannot be an operand of an arithmetic operator, a scalar function, or another relation. Chained comparisons are not valid.",
    example: "x + 1 = 5"
  },
  {
    title: "Numbers and identifiers",
    body: "Numeric literals are digit runs with an optional fraction and exponent. Identifiers start with a letter and continue with letters, digits, or underscores.",
    example: "2.5e-3 * velocity_0"
  },
  {
    title: "Lists are structural",
    body: "A list is valid only as the argument of matrix() or vector(). Lists cannot be used as arithmetic operands.",
    example: "vector([x, y, z])"
  }
];

export const PRECEDENCE_EXAMPLES = [
  { source: "2 + 3*4", meaning: "2 + (3*4) = 14" },
  { source: "(2 + 3)*4", meaning: "(2 + 3)*4 = 20" },
  { source: "2^3^2", meaning: "2^(3^2) = 512" },
  { source: "-2^2", meaning: "-(2^2) = -4" },
  { source: "(-2)^2", meaning: "(-2)^2 = 4" },
  { source: "2^-1", meaning: "2^(-1)" },
  { source: "a/b*c", meaning: "(a/b)*c" },
  { source: "x < 5 + 1", meaning: "x < (5 + 1)" }
];
