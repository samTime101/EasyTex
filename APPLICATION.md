# EasyTeX application

EasyTeX is a zero-dependency web application for writing mathematics in **MathScript**, a
function-based notation language specified in [`SPECIFICATION.md`](./SPECIFICATION.md). It has two
editors that share one parser, validator, and set of renderers:

- an **expression editor** for single mathematical expressions, and
- a **document writer** for complete documents with sections, numbered equations, figures, tables,
  references, citations, and theorems.

Both editors preview with native MathML and export LaTeX. The document writer additionally previews
the laid-out sheet and exports a standalone HTML file. No source is ever executed; every input is
parsed into data and validated before rendering.

## Pages

| Page | Path | Purpose |
| --- | --- | --- |
| Expression editor | `/` (`web/index.html`) | Write and preview one MathScript expression; inspect LaTeX, MathML, and the AST. |
| Document writer | `/web/document.html` | Write a `document({ ... })` source; preview the sheet, LaTeX, and standalone HTML; export or print. |
| Reference | `/web/docs.html` | Every function, constant, operator, syntax rule, document template, and component, with examples. |

## Current features

### MathScript language

- Function-based notation: `sum(i, 1, n, i^2)`, `frac(a, b)`, `sqrt(x)`; calls nest freely.
- Arithmetic and relations with conventional precedence and associativity; `^` binds tighter than
  unary minus, and calls bind tighter than both.
- Bounded operations with inclusive bounds: `sum`, `product`, `integral`, `limit`.
- First-order calculus: `derivative`, `partial`; higher orders and mixed partials are written by
  nesting.
- Structures: `matrix([[1, 2], [3, 4]])` and `vector([x, y, z])`, with shape validation.
- Constants include `pi`, `e`, `i`, and `infinity`; `log` is base 10 and `ln` is natural.
- **No implicit multiplication**: `2x` is an error with a diagnostic that suggests `2*x`.
- Unknown functions are errors; bare identifiers are free variables; bound variables are scoped to
  their operation.
- Diagnostics carry source spans and are classified by category (`syntax`, `name`, `arity`,
  `binding`, `structure`, `relation`, `reference`, `document`, …). Invalid input never produces
  rendered output.

### Expression editor

- Live MathML preview with no third-party rendering library.
- Output tabs for **Preview**, **LaTeX**, **MathML**, and the raw **AST**.
- Clickable diagnostics that select the offending source range.
- Autocomplete (`Ctrl` + `Space`) with signatures and correct insertion of calls and constants.
- Hover documentation for functions and constants, aware of bound-variable scope.
- Examples library, complex-mode toggle for `i`, and light/dark themes persisted in `localStorage`.
- Copy output and download a complete `.tex` document.
- Source can be shared with `#src=<url-encoded source>`.

### Document writer

- One `document({ ... })` call declares type, metadata, and content.
- Templates: `article`, `report`, `academic_report`, `thesis`, `book`, `presentation`,
  `technical_document`, `letter`. Templates control heading numbering, contents, the abstract, and
  the LaTeX class.
- Declarative page layout: A3/A4/A5/Letter/Legal, portrait or landscape, per-side margins in
  mm/cm/in/pt/px, and one to three columns.
- 31 components across six categories: document metadata, structure, text and inline formatting,
  mathematics blocks, tables and figures, and academic structures.
- Automatic numbering for sections, equations (`number=true`), tables, figures, listings, and
  theorem-like results; `label(...)` and named `label=` register targets, `ref(...)` resolves them,
  and unresolved or duplicate labels are errors.
- Bibliography entries with per-type required fields; `cite(...)` renders numbered, linked citations
  and the bibliography is numbered in definition order. A references section is appended when a
  document cites sources without a bibliography block.
- Theorem, lemma, definition, corollary, and proof blocks.
- Inline Markdown-free formatting: `bold`, `italic`, `underline`, `emphasis`, `code_text`, and
  `inline` mathematics inside prose.
- Live sheet preview at true page geometry, scaled to the pane; the last valid preview is kept while
  diagnostics are fixed.
- Output tabs for the rendered **Document**, **LaTeX**, and standalone **HTML**.
- Download `.tex` or `.html`, copy the current export, and **Print / PDF** with a generated `@page`
  rule matching the document's page size and margins.
- Seven built-in examples, including a deliberately broken document that demonstrates diagnostics.
- Missing images degrade to a readable placeholder instead of a broken icon.
- Autocomplete and hover documentation cover document components as well as functions and constants.

### Reference page

- Every function, constant, operator, syntax rule, template, page size, and document component.
- Live MathML previews for expression examples; document examples link into the writer.
- Search across functions, constants, components, and argument names; each component lists positional
  and named arguments.
- New **Document authoring** section with a rendered document preview, authoring notes, the template
  table, page geometry, and the full component catalog.

### Shared implementation

- One lexer and parser serve both layers. Document literals add strings, booleans, objects, and
  `//` / `/* */` comments; mathematical expressions reject those literals.
- Shared documentation metadata in `src/docs/` drives the reference page, autocomplete, and hover
  help, including document components.
- Deterministic validation and rendering; no network access is required to build or preview.
- 45 conformance tests cover the language, the expression pipeline, the document layer, the
  documentation catalog, and the writer examples.

## Architecture

```text
src/
  lexer.js, parser.js, validate.js      shared front end
  builtins.js, diagnostics.js            language surface and error model
  render-mathml.js, render-latex.js      expression renderers
  docs/                                  shared documentation metadata
  document/
    components.js                        component catalog and authoring notes
    templates.js                         templates, page sizes, length parsing
    build.js                             document tree builder and validator
    render-html.js, styles.js            sheet HTML and stylesheet
    render-latex.js                      complete LaTeX export
    export-html.js                       standalone HTML export
    index.js                             compileDocument() entry point
web/
  index.html, app.js                     expression editor
  document.html, document.js, css        document writer
  document-examples.js                   writer examples (tested in CI)
  docs.html, docs.js, docs.css           reference page
  autocomplete.js, hover-docs.js         editor assistance (filterable by kind)
```

Design rules:

1. **Source is data.** MathScript and document sources are parsed, never evaluated. There is no host
   `eval`, no generated JavaScript, and no network access during compilation.
2. **One parser.** Documents embed mathematical expressions as ordinary MathScript, validated by the
   same `validate()` pass, so diagnostics and spans remain exact.
3. **Fail closed.** Error-severity diagnostics suppress HTML and LaTeX output rather than substituting
   placeholder content. Warnings (for example, an unimplemented template-specific export) still
   render and are reported alongside errors.
4. **One catalog.** Components and their arguments are declared once and consumed by the builder,
   validators, reference page, autocomplete, and hover help; drift tests enforce the link.

## Running

```bash
npm run dev     # http://localhost:5173
npm test        # conformance and documentation tests
```

Node 18 or newer is required; there are no runtime dependencies. The dev server is a dependency-free
static file server (`tools/serve.mjs`).

## Updates

### 2026-10-19 — document layer and writer

- Added `src/document/`: document builder, validator, numbering, cross-references, bibliography,
  templates, page geometry, component catalog, HTML sheet renderer, standalone HTML export, and a
  complete LaTeX exporter.
- Added the Document Writer at `web/document.html` with live sheet preview, diagnostics, LaTeX and
  HTML tabs, downloads, Print/PDF, examples, and `#src=` loading.
- Extended the lexer and parser with string literals and escapes, booleans, object literals, and
  block comments, all rejected inside mathematical expressions.
- Added document authoring sections to the reference page: rendered preview, authoring notes,
  template and page-size tables, and the full component catalog with argument tables and examples.
- Registered document components in the shared documentation registry with a `kind` field;
  autocomplete and hover help now filter by kind and support components in the writer.
- Added `web/document-examples.js` and tests that keep every published example compiling.
- Added a sample figure asset and missing-image handling in the preview.
- Test suite grew from 19 to 45 tests.
