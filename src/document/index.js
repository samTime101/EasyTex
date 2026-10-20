// Public entry point of the MathScript document layer.
//
// compileDocument() is to documents what compile() is to expressions: it
// parses, validates, builds the document tree, and renders HTML and LaTeX.
// Rendering is skipped when the document has errors, exactly like the
// expression pipeline, so a renderer never receives an invalid tree.

import { CATEGORY, diagnostic } from "../diagnostics.js";
import { parseProgram } from "../parser.js";
import { buildDocument } from "./build.js";
import { renderDocumentHTML } from "./render-html.js";
import { renderDocumentLaTeX } from "./render-latex.js";

export { buildDocument, HANDLED_COMPONENTS, NAMED_ARGUMENTS, BIBLIOGRAPHY_TYPES } from "./build.js";
export { renderDocumentHTML, renderInline } from "./render-html.js";
export { renderDocumentLaTeX } from "./render-latex.js";
export { renderStandaloneHTML } from "./export-html.js";
export { SHEET_CSS } from "./styles.js";
export {
  COMPONENTS,
  COMPONENT_DOCS,
  COMPONENT_CATEGORY_ORDER,
  CONTAINER_OF_METHOD,
  DOCUMENT_NOTES,
  methodsFor
} from "./components.js";
export { TEMPLATES, TEMPLATE_NAMES, PAGE_SIZES, resolvePage, parseLength, parseDimension } from "./templates.js";

export function compileDocument(source, options = {}) {
  const parsed = parseProgram(source);
  const diagnostics = [...parsed.diagnostics];
  const tokens = parsed.tokens;

  const built = buildDocument(parsed, options);
  diagnostics.push(...built.diagnostics);

  if (!built.document) {
    return { document: null, diagnostics, html: null, latex: null, ast: null, tokens };
  }

  const hasErrors = diagnostics.some((entry) => entry.severity !== "warning");
  if (hasErrors) {
    return { document: built.document, diagnostics, html: null, latex: null, ast: null, tokens };
  }

  let html = null;
  let latex = null;
  try {
    html = renderDocumentHTML(built.document);
  } catch (error) {
    diagnostics.push(
      diagnostic(CATEGORY.DOCUMENT, `The HTML renderer failed: ${error.message}`, built.document.blocks[0]?.span)
    );
  }
  try {
    const exported = renderDocumentLaTeX(built.document);
    latex = exported.latex;
    diagnostics.push(...exported.diagnostics);
  } catch (error) {
    diagnostics.push(
      diagnostic(CATEGORY.DOCUMENT, `The LaTeX exporter failed: ${error.message}`, built.document.blocks[0]?.span)
    );
  }

  return { document: built.document, diagnostics, html, latex, ast: null, tokens };
}
