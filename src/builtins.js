export const FUNCTIONS = {
  sqrt: { arity: 1, kind: "scalar" },
  root: { arity: 2, kind: "scalar" },
  abs: { arity: 1, kind: "scalar" },
  frac: { arity: 2, kind: "scalar" },
  pow: { arity: 2, kind: "scalar" },
  log: { arity: 1, kind: "scalar" },
  ln: { arity: 1, kind: "scalar" },
  exp: { arity: 1, kind: "scalar" },
  sin: { arity: 1, kind: "scalar" },
  cos: { arity: 1, kind: "scalar" },
  tan: { arity: 1, kind: "scalar" },
  asin: { arity: 1, kind: "scalar" },
  acos: { arity: 1, kind: "scalar" },
  atan: { arity: 1, kind: "scalar" },
  sum: { arity: 4, kind: "scalar", binder: true },
  product: { arity: 4, kind: "scalar", binder: true },
  integral: { arity: 4, kind: "scalar", binder: true, infinityBounds: true },
  derivative: { arity: 2, kind: "scalar", binder: true },
  partial: { arity: 2, kind: "scalar", binder: true },
  limit: { arity: 3, kind: "scalar", binder: true, infinityTarget: true },
  matrix: { arity: 1, kind: "structure" },
  vector: { arity: 1, kind: "structure" }
};

export const BINDER_FUNCTIONS = new Set([
  "sum",
  "product",
  "integral",
  "derivative",
  "partial",
  "limit"
]);

export const STRUCTURE_FUNCTIONS = new Set(["matrix", "vector"]);

export const CONSTANTS = new Set(["pi", "e", "infinity", "i"]);

export const RESERVED = new Set(["cases"]);

export const GREEK = {
  alpha: "\u03b1",
  beta: "\u03b2",
  gamma: "\u03b3",
  delta: "\u03b4",
  epsilon: "\u03f5",
  varepsilon: "\u03b5",
  zeta: "\u03b6",
  eta: "\u03b7",
  theta: "\u03b8",
  vartheta: "\u03d1",
  iota: "\u03b9",
  kappa: "\u03ba",
  varkappa: "\u03f0",
  lambda: "\u03bb",
  mu: "\u03bc",
  nu: "\u03bd",
  xi: "\u03be",
  omicron: "\u03bf",
  pi: "\u03c0",
  varpi: "\u03d6",
  rho: "\u03c1",
  varrho: "\u03f1",
  sigma: "\u03c3",
  varsigma: "\u03c2",
  tau: "\u03c4",
  upsilon: "\u03c5",
  phi: "\u03c6",
  varphi: "\u03d5",
  chi: "\u03c7",
  psi: "\u03c8",
  omega: "\u03c9",
  Gamma: "\u0393",
  Delta: "\u0394",
  Theta: "\u0398",
  Lambda: "\u039b",
  Xi: "\u039e",
  Pi: "\u03a0",
  Sigma: "\u03a3",
  Upsilon: "\u03a5",
  Phi: "\u03a6",
  Psi: "\u03a8",
  Omega: "\u03a9"
};

export const LATEX_GREEK = {
  ...Object.fromEntries(Object.keys(GREEK).map((name) => [name, `\\${name}`])),
  // LaTeX has no \omicron: the lowercase Latin o is the conventional input.
  omicron: "o"
};

export function arityOf(name) {
  return FUNCTIONS[name]?.arity ?? null;
}
