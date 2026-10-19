export const CONSTANT_DOCS = [
  {
    name: "pi",
    constant: true,
    category: "Constants",
    signature: "pi",
    summary: "The ratio of a circle's circumference to its diameter.",
    description: "Renders as the symbol \u03c0. A bounded operation may shadow the name locally, in which case it renders as the variable name instead.",
    examples: [{ source: "cos(2*pi*x)", note: "A full period of the cosine." }]
  },
  {
    name: "e",
    constant: true,
    category: "Constants",
    signature: "e",
    summary: "Euler's number, the base of the natural logarithm.",
    description: "Renders as an italic e. Shadowing e does not change the meaning of ln or exp, and a renderer should avoid displaying exp as a power of a shadowed e.",
    examples: [{ source: "ln(e)", note: "The natural logarithm of e." }]
  },
  {
    name: "infinity",
    constant: true,
    category: "Constants",
    signature: "infinity",
    summary: "The extended-real point at infinity.",
    description:
      "Permitted as the target of a limit and as a bound of an integral; -infinity is permitted in the same contexts. It must not be used as a bound of sum or product, and other arithmetic involving it is outside the defined semantics of this version.",
    examples: [
      { source: "limit(x, infinity, frac(1, x))", note: "A limit at infinity." },
      { source: "integral(t, 0, infinity, exp(-t))", note: "An improper integral with an infinite bound." }
    ]
  },
  {
    name: "i",
    constant: true,
    category: "Constants",
    signature: "i",
    summary: "The imaginary unit, when complex-number semantics are enabled.",
    description:
      "In a real-only environment, i is an ordinary free variable unless bound. Regardless of environment, a bounded operation may bind the name i locally, as in sum(i, 1, n, i^2).",
    examples: [{ source: "sqrt(-1)", note: "A complex-valued square root." }]
  }
];
