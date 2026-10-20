// The engine's public surface.
//
// Every host — the browser editors, a command line tool, a desktop
// application, or a binding written in another language — reaches the
// language through this module. It is the only place a host needs to know
// about.
//
// The engine is platform independent by construction:
//
//   * it performs no I/O and reads no files,
//   * it uses no browser API (no DOM, no window, no localStorage),
//   * it uses no operating-system API (no process, no filesystem),
//   * it maps strings to results and nothing else.
//
// A host that needs a different platform talks to the engine through a
// binding; the engine itself never learns about the host. See ENGINE.md for
// the request/response contract and the portable manifest.

export {
  compile,
  compileScratchpad,
  parse,
  validate,
  renderMathML,
  renderLaTeX,
  formatDiagnostic,
  CATEGORY
} from "./index.js";
export {
  compileDocument,
  buildDocument,
  renderDocumentHTML,
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
  parseDimension,
  NAMED_ARGUMENTS,
  BIBLIOGRAPHY_TYPES
} from "./document/index.js";
export { engineManifest, ENGINE_NAME, ENGINE_VERSION } from "./manifest.js";
