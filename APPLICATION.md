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
| Reference | `/web/docs.html` | Every function, constant, Greek name, named symbol, operator, syntax rule, document template, and component, with examples and a LaTeX compatibility table. |

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
- Expanded Greek vocabulary: variant forms (`varepsilon`, `varphi`, `vartheta`, `varkappa`, `varpi`, `varrho`, `varsigma`), uppercase commands (`Gamma` through `Omega`), and `omicron` (whose LaTeX input is the ordinary letter `o`).
- Named ordinary symbols such as `aleph`, `hbar`, `emptyset`, `nabla`, `forall`, `exists`, `ell`, `Re`, and `Im`; they are ordinary free variables that render upright.
- **No implicit multiplication**: `2x` is an error with a diagnostic that suggests `2*x`.
- Free function application: `f(x) + f(x - a)` is valid without declaring `f`; bare identifiers are
  free variables; bound variables are scoped to their operation. Applying a constant such as `pi(x)`
  is an error.
- Diagnostics carry source spans and are classified by category (`syntax`, `name`, `arity`,
  `binding`, `structure`, `relation`, `reference`, `document`, …). Invalid input never produces
  rendered output.

### Expression editor

- Live MathML preview with no third-party rendering library.
- Output tabs for **Preview**, **LaTeX**, **MathML**, and the raw **AST**.
- Clickable diagnostics that select the offending source range.
- Autocomplete (`Ctrl` + `Space`) with signatures and correct insertion of calls and constants.
- Hover documentation for functions and constants, aware of bound-variable scope.
- Syntax highlighting for comments, strings, numbers, booleans, functions, constants, and operators.
- Auto-closing brackets and quotes, smart `Enter`, line indent/unindent, pair deletion, and a
  **Format** action (`Shift` + `Alt` + `F`) that re-indents the source from bracket depth.
- A **Maximize** toggle that hides the output pane so the source fills the workspace.
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
- Starter snippets: accepting `document` expands a complete, valid article scaffold; `section`,
  `table`, `figure`, `theorem`, `bibliography`, and friends expand to matching templates. Multi-line
  snippets are indented to the insertion point and the caret lands in the first empty placeholder.
- Field hover help: metadata keys, page options, margin sides, named arguments (`label=`, `number=`,
  `caption=`, …), and bibliography fields show their scope, value type, allowed values, and an example.
- The same syntax highlighting, auto-closing, smart indentation, formatting, and maximize controls as
  the expression editor, with document components and field names highlighted too.

### Reference page

- Every function, constant, Greek letter name, named symbol, operator, syntax rule, template, page size, and document component.
- A searchable **LaTeX → MathScript** reference covering standard LaTeX/AMS functions, structures, constants, Greek letters, operators, relations, arrows, delimiters, big operators, accents, ordinary symbols, and document constructs. Each row is marked **native**, **approximate**, or **no equivalent**, with a note explaining the closest MathScript option.
- The LaTeX table is explicit about scope: the 604-page Comprehensive LaTeX Symbol List includes package fonts, emoji, phonetics, and decorative text glyphs that have no place in MathScript's font-free model. The reference covers the standard math vocabulary rather than claiming a one-to-one glyph mapping.
- Live MathML previews for expression examples; document examples link into the writer.
- Search across functions, constants, Greek letters, fields, argument names, and document components;
  each component lists positional and named arguments.
- New **Document authoring** section with a rendered document preview, authoring notes, the template
  table, page geometry, component catalog, and a field reference for metadata, page options, named
  arguments, and bibliography entries.
- The field reference lists each field's allowed values, and a **Reference types** table names the
  required and optional fields for every bibliography entry type.

### Shared implementation

- One lexer and parser serve both layers. Document literals add strings, booleans, objects, and
  `//` / `/* */` comments; mathematical expressions reject those literals.
- Shared documentation metadata in `src/docs/` drives the reference page, autocomplete, and hover
  help, including document components.
- Deterministic validation and rendering; no network access is required to build or preview.
- 76 conformance tests cover the language, the expression pipeline, the document layer, the
  documentation catalog, the writer examples, the authoring snippets, the field catalog, the syntax
  highlighter, the editing/formatting helpers, and the LaTeX mapping catalog.

## Architecture

```text
src/
  lexer.js, parser.js, validate.js      shared front end
  builtins.js, diagnostics.js            language surface and error model
  render-mathml.js, render-latex.js      expression renderers
  docs/                                  function, constant, Greek, symbol, operator, LaTeX, field metadata
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
  autocomplete.js, snippets.js, hover-docs.js   editor assistance (filterable by kind)
  highlight.js, editing.js               syntax highlighting and editing helpers
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

### 2026-10-20 — Backspace removes empty auto-closed pairs

- Fixed the editor glue so Backspace on an empty auto-closed pair (`()`, `[]`, `{}`, or `""`) deletes both characters instead of only moving the caret. The same handler serves the expression editor and the document writer.
- Added a regression test for the textarea key handler and kept the skip-over path intact when typing an existing closer.

### 2026-10-20 — named symbols and LaTeX compatibility reference

- Added `src/symbols.js` with named ordinary symbols (`aleph`, `hbar`, `emptyset`, `nabla`, `forall`, `exists`, `ell`, `Re`, `Im`, `Box`, and others). They are ordinary identifiers, render upright in MathML, and export as the matching LaTeX command.
- Expanded `GREEK` with the standard variant forms (`varepsilon`, `varphi`, `vartheta`, `varkappa`, `varpi`, `varrho`, `varsigma`) and uppercase commands (`Gamma` through `Omega`). Changed `epsilon` to the lunate form to match `\epsilon`, with `varepsilon` for the curly form; `omicron` exports as the Latin letter `o`.
- Added `src/docs/latex.js`, a 743-row LaTeX → MathScript catalog covering functions, structures, constants, Greek letters, operators, relations, arrows, delimiters, big operators, accents, ordinary symbols, fonts/spacing, and document constructs. Rows are classified as native, approximate, or no equivalent, with explicit notes for gaps.
- The reference page gained **Named symbols** and **LaTeX compatibility** sections with status badges, counts, category tables, and searchable rows. The LaTeX scope note explains why the 25,731-symbol PDF is not a one-to-one feature list.
- Added coverage tests tying every function, constant, Greek name, operator, and named symbol to a LaTeX row, plus duplicate-command and renderer checks. The suite grew from 72 to 75 tests for this work.

### 2026-10-20 — free function application

- Calls to identifiers that are not built-in functions are now function applications: `f(x) + f(x - a)`,
  `g(x, y)`, `phi(t)`, and nested forms such as `f(g(x))` all compile without declarations.
- Applying a constant (`pi(2)`) or a reserved name remains an error, and every application argument
  must still be a scalar expression. Bound and higher-order uses such as `sum(f, 1, n, f(x))` work.
- Free applications render as ordinary function notation in MathML and LaTeX. The reference page has
  a new **Function application** syntax note, and the specification updates its name-resolution, call,
  diagnostics, and conformance sections.

### 2026-10-19 — syntax highlighting, editing assistance, and complete reference

- Added `web/highlight.js`: a tolerant, single-pass MathScript scanner and a highlight layer painted
  under a transparent textarea. Comments, strings, numbers, booleans, functions, constants, operators,
  document components, and field names are colored; the writer highlights components and fields too.
- Added `web/editing.js`: auto-closing `(` `[` `{` and `"` (wrapping a selection, stepping over the
  partner), Backspace pair deletion, smart Enter that keeps indentation and expands bracket pairs,
  Tab / Shift+Tab line indentation, and bracket-depth re-indentation with `Shift` + `Alt` + `F`.
  Edits go through `execCommand("insertText")` so undo/redo keeps working.
- Both editors gained **Format** and **Maximize** controls; maximizing hides the output pane and
  resizes the source to the full workspace width. Default workspace split now gives the source more room.
- The reference page gained a 24-entry **Greek letters** section, allowed-value groups for field
  entries, and a **Reference types** table listing the required and optional fields of every
  bibliography type. Field values now cover `columns` (1–3), `number` (true/false), `type`
  (templates and reference types), page sizes, orientation, and alignment.
- New tests cover the scanner, highlighting output, auto-closing, smart Enter, indentation, formatting
  (including idempotency against every shipped example), selection mapping, Greek coverage, and field
  value/reference-type completeness. The suite grew from 50 to 71 tests.

### 2026-10-19 — authoring snippets and field help

- Autocomplete now inserts starter snippets for 16 structured components, including a complete
  default `document({ ... })` scaffold. Multi-line snippets are indented to the insertion point and
  the caret lands inside the first empty placeholder.
- Added `src/docs/fields.js`: documentation for the 40 document metadata keys, page options, margin
  sides, named arguments, and bibliography fields.
- The writer's hover help distinguishes call sites from field uses (the `label` component versus
  `label=` in a section) and explains scope, value type, allowed values, and an example.
- The reference page gained a **Fields** section rendering the same catalog.
- New tests check that every snippet is a valid fragment, that insertion geometry is exact, and that
  the field catalog covers the builder's metadata, page, named-argument, and bibliography tables.
  The suite grew from 45 to 50 tests.

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
