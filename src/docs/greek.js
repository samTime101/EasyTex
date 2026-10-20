// Greek letter catalog for the reference page.
//
// Greek names are ordinary identifiers to the lexer and the validator: they
// stay free variables, render as the matching Greek letter in both MathML and
// LaTeX, and never need a symbol to be typed. The table on the docs page is
// derived from the same map the renderers use, so it can never drift.

import { CONSTANTS, GREEK, LATEX_GREEK } from "../builtins.js";

function greekNote(name) {
  if (name === "omicron") return "LaTeX writes this letter as o.";
  if (name.startsWith("var")) return "Variant form.";
  if (name[0] === name[0].toUpperCase()) return "Uppercase Greek command.";
  return "";
}

export const GREEK_DOCS = Object.entries(GREEK).map(([name, symbol]) => ({
  name,
  symbol,
  latex: LATEX_GREEK[name],
  constant: CONSTANTS.has(name),
  note: greekNote(name)
}));
