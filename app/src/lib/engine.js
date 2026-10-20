// The engine and the documentation catalog, imported through one module so a
// page never reaches into the engine's internals.
//
// The engine in src/ is platform independent: this file is the only bridge
// between it and the React host.

export {
  compile,
  parse,
  validate,
  compileDocument,
  renderStandaloneHTML,
  renderDocumentHTML,
  renderDocumentLaTeX,
  SHEET_CSS,
  COMPONENTS,
  COMPONENT_DOCS,
  COMPONENT_CATEGORY_ORDER,
  DOCUMENT_NOTES,
  TEMPLATES,
  TEMPLATE_NAMES,
  PAGE_SIZES,
  NAMED_ARGUMENTS,
  BIBLIOGRAPHY_TYPES,
  parseLength,
  parseDimension,
  resolvePage
} from "@engine/engine.js";

export {
  SYNTAX_NOTES,
  PRECEDENCE_EXAMPLES,
  GREEK_DOCS,
  SYMBOL_DOCS,
  LATEX_DOCS,
  FUNCTION_DOCS,
  CONSTANT_DOCS,
  OPERATOR_DOCS,
  FIELD_DOCS,
  FIELD_SCOPE_ORDER,
  FIELD_SCOPE_LABELS,
  groupFunctionsByCategory,
  groupConstantsByCategory,
  groupOperatorsByCategory,
  groupLatexBySection,
  groupComponentsByCategory,
  groupFieldsByScope,
  docsFor,
  fieldDocsFor,
  matchDocumentation
} from "@engine/docs/index.js";

export { scanSource, highlightSource } from "@web/highlight.js";
export {
  INDENT,
  autoCloseEdit,
  smartEnterEdit,
  deletePairEdit,
  indentEdit,
  formatSource,
  formatEdit
} from "@web/editing.js";
export { completionContextAt } from "@web/completion-context.js";
export { completionInsertion } from "@web/autocomplete.js";
export { prepareSnippet, lineIndent } from "@web/snippets.js";
export { TEXTAREA_STYLE_PROPS } from "@web/textarea-geometry.js";
export { resolveImageSources } from "@web/asset-paths.js";
