export { tokenize, TOKEN } from "./lexer.js";
export { parse } from "./parser.js";
export { validate } from "./validate.js";
export { renderMathML } from "./render-mathml.js";
export { renderLaTeX } from "./render-latex.js";
export { formatDiagnostic, CATEGORY } from "./diagnostics.js";
export {
  compileDocument,
  buildDocument,
  HANDLED_COMPONENTS,
  NAMED_ARGUMENTS
} from "./document/index.js";
export {
  renderDocumentHTML,
  renderInline,
  renderDocumentLaTeX,
  renderStandaloneHTML,
  SHEET_CSS,
  COMPONENTS,
  COMPONENT_DOCS,
  COMPONENT_CATEGORY_ORDER,
  DOCUMENT_NOTES,
  TEMPLATES,
  TEMPLATE_NAMES,
  PAGE_SIZES,
  resolvePage,
  parseLength,
  parseDimension
} from "./document/index.js";

import { parse, parseSequence } from "./parser.js";
import { validate } from "./validate.js";
import { renderMathML } from "./render-mathml.js";
import { renderLaTeX } from "./render-latex.js";

// Compile a source that holds several independent expressions.
//
// The language is a single expression; an editor is a scratchpad. Each
// top-level expression is compiled on its own, so one broken line does not
// hide the others, and the diagnostics keep their absolute positions.
export function compileScratchpad(source, options = {}) {
  const { expressions, diagnostics, tokens } = parseSequence(source);

  const results = expressions.map((entry) => {
    if (!entry.ast) {
      return { ...entry, mathml: null, latex: null };
    }
    const validated = validate(entry.ast, options);
    const problems = [...entry.diagnostics, ...validated.diagnostics];
    const failed = problems.some((entry) => entry.severity !== "warning");
    return {
      ...entry,
      diagnostics: problems,
      mathml: failed ? null : renderMathML(entry.ast, options),
      latex: failed ? null : renderLaTeX(entry.ast, options)
    };
  });

  return {
    expressions: results,
    diagnostics: results.flatMap((entry) => entry.diagnostics),
    mathml: results.map((entry) => entry.mathml).filter(Boolean).join("\n"),
    latex: results.map((entry) => entry.latex).filter(Boolean).join("\n"),
    ast: results.map((entry) => entry.ast),
    tokens
  };
}

export function compile(source, options = {}) {
  const parsed = parse(source);
  if (parsed.diagnostics.some((diag) => diag.severity !== "warning") || !parsed.ast) {
    return { ast: null, diagnostics: parsed.diagnostics, mathml: null, latex: null, tokens: parsed.tokens };
  }
  const validated = validate(parsed.ast, options);
  const diagnostics = [...parsed.diagnostics, ...validated.diagnostics];
  if (diagnostics.some((diag) => diag.severity !== "warning")) {
    return { ast: parsed.ast, diagnostics, mathml: null, latex: null, tokens: parsed.tokens };
  }
  return {
    ast: parsed.ast,
    diagnostics,
    mathml: renderMathML(parsed.ast, options),
    latex: renderLaTeX(parsed.ast, options),
    tokens: parsed.tokens
  };
}
