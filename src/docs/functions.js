export const FUNCTION_DOCS = [
  {
    name: "sqrt",
    category: "Arithmetic and algebra",
    signature: "sqrt(expression)",
    summary: "Principal square root.",
    description:
      "Returns the non-negative square root of the expression in a real-only environment. In a complex environment, evaluation follows the environment's branch policy.",
    args: [{ name: "expression", type: "scalar", description: "The value to take the square root of." }],
    returns: "scalar",
    examples: [
      { source: "sqrt(x^2 + 1)", note: "Square root of a grouped expression." },
      { source: "sqrt(frac(3, 4))", note: "The root of a fraction." }
    ]
  },
  {
    name: "root",
    category: "Arithmetic and algebra",
    signature: "root(expression, degree)",
    summary: "The degree-th root of an expression.",
    description:
      "The radicand comes first and the degree second. When evaluated, the degree must be a nonzero integer. An even degree with a negative real radicand is a domain error in a real-only environment.",
    args: [
      { name: "expression", type: "scalar", description: "The radicand. Written first." },
      { name: "degree", type: "scalar", description: "The root degree, a nonzero integer when evaluated." }
    ],
    returns: "scalar",
    examples: [
      { source: "root(x + 1, 3)", note: "Cube root, written radicand first." },
      { source: "root(abs(x), 2)", note: "Square root of an absolute value." }
    ]
  },
  {
    name: "abs",
    category: "Arithmetic and algebra",
    signature: "abs(expression)",
    summary: "Absolute value or complex modulus.",
    description: "In a real-only environment this is the absolute value. With complex semantics it is the modulus.",
    args: [{ name: "expression", type: "scalar", description: "The value to measure." }],
    returns: "scalar",
    examples: [
      { source: "abs(x - 3)", note: "Distance from x to 3." },
      { source: "abs(-4)", note: "A numeric absolute value." }
    ]
  },
  {
    name: "frac",
    category: "Arithmetic and algebra",
    signature: "frac(numerator, denominator)",
    summary: "A built-up fraction.",
    description:
      "Makes the numerator and denominator explicit. `frac(a, b)` and `a/b` are both exact division; the syntax tree preserves which form the author wrote so renderers may style them differently. The denominator must not be zero when evaluated.",
    args: [
      { name: "numerator", type: "scalar", description: "The top of the fraction." },
      { name: "denominator", type: "scalar", description: "The bottom of the fraction. Must be nonzero when evaluated." }
    ],
    returns: "scalar",
    examples: [
      { source: "frac(a + b, c + d)", note: "Grouped numerator and denominator." },
      { source: "frac(1, 1 + x^2)", note: "A common rational form." }
    ]
  },
  {
    name: "pow",
    category: "Arithmetic and algebra",
    signature: "pow(base, exponent)",
    summary: "A power, equivalent to base^exponent.",
    description:
      "`pow(a, b)` and `a^b` have the same mathematical meaning. The syntax tree preserves which form the author wrote, so renderers may style them differently.",
    args: [
      { name: "base", type: "scalar", description: "The base." },
      { name: "exponent", type: "scalar", description: "The exponent." }
    ],
    returns: "scalar",
    examples: [
      { source: "pow(x, 2)", note: "Same value as x^2." },
      { source: "pow(x + 1, frac(1, 2))", note: "A fractional exponent." }
    ]
  },
  {
    name: "log",
    category: "Arithmetic and algebra",
    signature: "log(expression)",
    summary: "Base-10 logarithm.",
    description:
      "Uses base 10 in this version; this choice is provisional (see Appendix A, D2 of the specification). Use ln for the natural logarithm and logbase(expression, base) for any other base.",
    args: [{ name: "expression", type: "scalar", description: "A positive value when evaluated." }],
    returns: "scalar",
    examples: [
      { source: "log(1000)", note: "Base-10 logarithm of 1000." },
      { source: "log(x^2 + 1)", note: "A symbolic argument." }
    ]
  },
  {
    name: "logbase",
    category: "Arithmetic and algebra",
    signature: "logbase(expression, base)",
    summary: "Logarithm with an explicit base.",
    description:
      "The value comes first and the base second, so logbase(x, 2) is the base-2 logarithm of x. When evaluated, the base must be positive and not equal to 1; in a real-only environment the value must be positive. Use log for base 10 and ln for base e.",
    args: [
      { name: "expression", type: "scalar", description: "The value whose logarithm is taken. Written first." },
      { name: "base", type: "scalar", description: "The logarithm base, positive and not 1 when evaluated." }
    ],
    returns: "scalar",
    examples: [
      { source: "logbase(x, 2)", note: "Base-2 logarithm, written value first." },
      { source: "logbase(8, 2)", note: "A numerical base-2 logarithm." }
    ]
  },
  {
    name: "ln",
    category: "Arithmetic and algebra",
    signature: "ln(expression)",
    summary: "Natural logarithm, base e.",
    description:
      "Has an intrinsic mathematical meaning. Shadowing the identifier `e` in a local scope does not change what `ln` means.",
    args: [{ name: "expression", type: "scalar", description: "A positive value when evaluated." }],
    returns: "scalar",
    examples: [
      { source: "ln(e)", note: "The natural logarithm of Euler's number is 1." },
      { source: "ln(x)", note: "A symbolic natural logarithm." }
    ]
  },
  {
    name: "exp",
    category: "Arithmetic and algebra",
    signature: "exp(expression)",
    summary: "The exponential function, equivalent to e^expression.",
    description:
      "Has an intrinsic mathematical meaning. A renderer should avoid displaying `exp(x)` as e^x in a scope where `e` is bound to another value.",
    args: [{ name: "expression", type: "scalar", description: "The exponent." }],
    returns: "scalar",
    examples: [
      { source: "exp(x)", note: "Rendered as e^x." },
      { source: "exp(-x^2)", note: "A Gaussian-shaped term." }
    ]
  },
  {
    name: "sin",
    category: "Trigonometry",
    signature: "sin(expression)",
    summary: "Sine, with the argument in radians.",
    description: "Trigonometric functions use radians when evaluated.",
    args: [{ name: "expression", type: "scalar", description: "An angle in radians." }],
    returns: "scalar",
    examples: [
      { source: "sin(x)", note: "A sine wave." },
      { source: "sin(2*pi*x)", note: "A sine with period 1." }
    ]
  },
  {
    name: "cos",
    category: "Trigonometry",
    signature: "cos(expression)",
    summary: "Cosine, with the argument in radians.",
    description: "Trigonometric functions use radians when evaluated.",
    args: [{ name: "expression", type: "scalar", description: "An angle in radians." }],
    returns: "scalar",
    examples: [
      { source: "cos(x)", note: "A cosine wave." },
      { source: "cos(2*pi*x)", note: "A cosine with period 1." }
    ]
  },
  {
    name: "tan",
    category: "Trigonometry",
    signature: "tan(expression)",
    summary: "Tangent, with the argument in radians.",
    description: "Trigonometric functions use radians when evaluated.",
    args: [{ name: "expression", type: "scalar", description: "An angle in radians." }],
    returns: "scalar",
    examples: [
      { source: "tan(theta)", note: "A tangent." },
      { source: "frac(sin(x), cos(x))", note: "The tangent written as a fraction." }
    ]
  },
  {
    name: "asin",
    category: "Trigonometry",
    signature: "asin(expression)",
    summary: "Inverse sine with the principal branch.",
    description: "Inverse trigonometric functions use their principal branches when evaluated in the real domain.",
    args: [{ name: "expression", type: "scalar", description: "A value in [-1, 1] when evaluated in the real domain." }],
    returns: "scalar",
    examples: [{ source: "asin(x)", note: "The inverse sine of x." }]
  },
  {
    name: "acos",
    category: "Trigonometry",
    signature: "acos(expression)",
    summary: "Inverse cosine with the principal branch.",
    description: "Inverse trigonometric functions use their principal branches when evaluated in the real domain.",
    args: [{ name: "expression", type: "scalar", description: "A value in [-1, 1] when evaluated in the real domain." }],
    returns: "scalar",
    examples: [{ source: "acos(x)", note: "The inverse cosine of x." }]
  },
  {
    name: "atan",
    category: "Trigonometry",
    signature: "atan(expression)",
    summary: "Inverse tangent with the principal branch.",
    description: "Inverse trigonometric functions use their principal branches when evaluated in the real domain.",
    args: [{ name: "expression", type: "scalar", description: "Any real value when evaluated." }],
    returns: "scalar",
    examples: [{ source: "atan(x)", note: "The inverse tangent of x." }]
  },
  {
    name: "sum",
    category: "Bounded operations",
    signature: "sum(variable, start, end, expression)",
    summary: "Sum over an inclusive integer range.",
    description:
      "Combines the expression for each integer value of the variable from start through end, inclusive. If start is greater than end, the empty sum is 0. When evaluated, the bounds must be integer-valued; a non-integer bound is a domain error, not silent rounding. The variable is local to the expression argument.",
    args: [
      { name: "variable", type: "identifier", description: "The bound index variable." },
      { name: "start", type: "scalar", description: "The first index, inclusive." },
      { name: "end", type: "scalar", description: "The last index, inclusive." },
      { name: "expression", type: "scalar", description: "The term to add for each index value." }
    ],
    returns: "scalar",
    examples: [
      { source: "sum(i, 1, n, i^2)", note: "The sum of the first n squares." },
      { source: "sum(k, 0, 100, frac(1, k^2 + 1))", note: "A finite series with a fraction term." }
    ]
  },
  {
    name: "product",
    category: "Bounded operations",
    signature: "product(variable, start, end, expression)",
    summary: "Product over an inclusive integer range.",
    description:
      "Multiplies the expression for each integer value of the variable from start through end, inclusive. If start is greater than end, the empty product is 1. The variable is local to the expression argument.",
    args: [
      { name: "variable", type: "identifier", description: "The bound index variable." },
      { name: "start", type: "scalar", description: "The first index, inclusive." },
      { name: "end", type: "scalar", description: "The last index, inclusive." },
      { name: "expression", type: "scalar", description: "The factor to multiply for each index value." }
    ],
    returns: "scalar",
    examples: [
      { source: "product(i, 1, n, i)", note: "The factorial of n." },
      { source: "product(k, 1, n, frac(k + 1, k))", note: "A telescoping product." }
    ]
  },
  {
    name: "integral",
    category: "Bounded operations",
    signature: "integral(variable, start, end, expression)",
    summary: "Definite integral over an interval.",
    description:
      "Denotes the definite integral of the expression with respect to the variable from start to end. Reversing the bounds negates the integral, and equal bounds give zero. `infinity` and `-infinity` are permitted as bounds for improper integrals. The differential is implicit in the source syntax and is supplied by the renderer.",
    args: [
      { name: "variable", type: "identifier", description: "The variable of integration." },
      { name: "start", type: "scalar", description: "The lower bound. May be infinity or -infinity." },
      { name: "end", type: "scalar", description: "The upper bound. May be infinity or -infinity." },
      { name: "expression", type: "scalar", description: "The integrand." }
    ],
    returns: "scalar",
    examples: [
      { source: "integral(x, 0, 1, x^2)", note: "A definite integral." },
      { source: "integral(t, 0, infinity, exp(-t))", note: "An improper integral." }
    ]
  },
  {
    name: "derivative",
    category: "Calculus",
    signature: "derivative(variable, expression)",
    summary: "First derivative with respect to a variable.",
    description:
      "First-order in this version. Higher-order derivatives are written by nesting, for example `derivative(x, derivative(x, y))`. The variable is local to the expression argument.",
    args: [
      { name: "variable", type: "identifier", description: "The variable of differentiation." },
      { name: "expression", type: "scalar", description: "The expression to differentiate." }
    ],
    returns: "scalar",
    examples: [
      { source: "derivative(x, x^2 + 1)", note: "A first derivative." },
      { source: "derivative(x, derivative(x, y))", note: "A nested second derivative." }
    ]
  },
  {
    name: "partial",
    category: "Calculus",
    signature: "partial(variable, expression)",
    summary: "First partial derivative with respect to a variable.",
    description:
      "First-order in this version. Multivariable expressions are handled by nesting partial derivatives. The variable is local to the expression argument.",
    args: [
      { name: "variable", type: "identifier", description: "The variable of differentiation." },
      { name: "expression", type: "scalar", description: "The expression to differentiate partially." }
    ],
    returns: "scalar",
    examples: [
      { source: "partial(x, x^2 + y^2)", note: "A partial derivative with respect to x." },
      { source: "partial(y, x*y^2)", note: "A partial derivative with respect to y." }
    ]
  },
  {
    name: "limit",
    category: "Calculus",
    signature: "limit(variable, target, expression)",
    summary: "Two-sided limit as a variable approaches a target.",
    description:
      "Two-sided by default; one-sided and directional limits are not part of this version. The target may be a finite expression or `infinity`. The variable is local to the expression; the target is resolved in the enclosing scope.",
    args: [
      { name: "variable", type: "identifier", description: "The variable that approaches the target." },
      { name: "target", type: "scalar", description: "The value being approached. May be infinity." },
      { name: "expression", type: "scalar", description: "The expression whose limit is taken." }
    ],
    returns: "scalar",
    examples: [
      { source: "limit(x, 0, sin(x)/x)", note: "A classic finite limit." },
      { source: "limit(n, infinity, frac(1, n))", note: "A limit at infinity." }
    ]
  },
  {
    name: "matrix",
    category: "Structures",
    signature: "matrix(rows)",
    summary: "A matrix given by a list of row lists.",
    description:
      "The argument must be a non-empty list of non-empty lists, and every row must have the same length. The matrix is interpreted in row-major order. Entries must be scalar expressions.",
    args: [{ name: "rows", type: "list of row lists", description: "The matrix rows, each row a list." }],
    returns: "matrix",
    examples: [
      { source: "matrix([[1, 2], [3, 4]])", note: "A 2x2 matrix." },
      { source: "matrix([[a, b], [c, d]])", note: "A symbolic 2x2 matrix." }
    ]
  },
  {
    name: "vector",
    category: "Structures",
    signature: "vector(elements)",
    summary: "A column vector given by a list.",
    description:
      "The argument must be a non-empty list and every entry must be a scalar expression. A vector is rendered as a column vector by default.",
    args: [{ name: "elements", type: "list", description: "The vector entries, in order." }],
    returns: "vector",
    examples: [
      { source: "vector([x, y, z])", note: "A symbolic 3-vector." },
      { source: "vector([1, 2, 3])", note: "A numeric 3-vector." }
    ]
  }
];
