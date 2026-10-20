// The engine and the documentation catalog, imported through one module so a
// page never reaches into the engine's internals.
//
// The engine in src/ is platform independent: this file is the only bridge
// between it and the React host.

export {
  compile,
  compileScratchpad,
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

export { scanSource, highlightSource } from "@ui/highlight.js";
export {
  INDENT,
  autoCloseEdit,
  smartEnterEdit,
  deletePairEdit,
  indentEdit,
  formatSource,
  formatEdit
} from "@ui/editing.js";
export { completionContextAt } from "@ui/completion-context.js";
export { completionInsertion } from "@ui/completion-insertion.js";
export { callEnd, nextPlaceholder, placeholderPositions } from "@ui/placeholders.js";
export { prepareSnippet, lineIndent } from "@ui/snippets.js";
export { TEXTAREA_STYLE_PROPS } from "@ui/textarea-geometry.js";
export { resolveImageSources } from "@ui/asset-paths.js";
