import { SYMBOLS, LATEX_SYMBOLS } from "../symbols.js";

const SYMBOL_NOTES = {
  hbar: "Also written hslash.",
  hslash: "Same glyph as hbar.",
  emptyset: "Also written varnothing.",
  varnothing: "Same glyph as emptyset.",
  neg: "Also written lnot.",
  lnot: "Same glyph as neg.",
  triangle: "Also written vartriangle.",
  vartriangle: "Same glyph as triangle.",
  square: "Also written Box.",
  Box: "Same glyph as square.",
  dots: "Ellipsis; also written ldots.",
  ldots: "Ellipsis on the baseline.",
  cdots: "Centered ellipsis.",
  vdots: "Vertical ellipsis.",
  ddots: "Diagonal ellipsis.",
  dotsb: "Ellipsis between binary operators.",
  dotsc: "Ellipsis between commas.",
  dotsi: "Ellipsis between integral signs.",
  dotsm: "Ellipsis between multiplication signs.",
  dotso: "Ellipsis in other positions."
};

export const SYMBOL_DOCS = Object.entries(SYMBOLS).map(([name, symbol]) => ({
  name,
  symbol,
  latex: LATEX_SYMBOLS[name],
  note: SYMBOL_NOTES[name] ?? ""
}));
