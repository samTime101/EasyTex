# EasyTeX application

EasyTeX is a web application for writing mathematics in **MathScript**, a function-based notation
language specified in [`SPECIFICATION.md`](./SPECIFICATION.md). It has two editors that share one
parser, validator, and set of renderers:

- an **expression editor** for single mathematical expressions, and
- a **document writer** for complete documents with sections, numbered equations, figures, tables,
  references, citations, and theorems.

Both editors preview with native MathML and export LaTeX. The document writer additionally previews
the laid-out sheet and exports a standalone HTML file. No source is ever executed; every input is
parsed into data and validated before rendering.

## Pages

| Page | Path | Purpose |
| --- | --- | --- |
| Expression editor | `/` | Write and preview one MathScript expression; inspect LaTeX, MathML, and the AST. |
| Document writer | `/document` | Write a document as a program of statements; preview the sheet, LaTeX, and standalone HTML; export or print. |
| Reference | `/docs` | Every function, constant, Greek name, named symbol, operator, syntax rule, document template, and component, with examples and a LaTeX compatibility table. |

## Current features

### MathScript language

- Function-based notation: `sum(i, 1, n, i^2)`, `frac(a, b)`, `sqrt(x)`; calls nest freely.
- Arithmetic and relations with conventional precedence and associativity; `^` binds tighter than
  unary minus, and calls bind tighter than both.
- Bounded operations with inclusive bounds: `sum`, `product`, `integral`, `limit`.
- First-order calculus: `derivative`, `partial`; higher orders and mixed partials are written by
  nesting.
- Structures: `matrix([[1, 2], [3, 4]])` and `vector([x, y, z])`, with shape validation.
- Constants include `pi`, `e`, `i`, and `infinity`; `log` is base 10, `ln` is natural, and `logbase(expression, base)` takes an explicit base.
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
- Hover documentation for functions, constants, and documented symbols, aware of bound-variable scope.
- Syntax highlighting for comments, strings, numbers, booleans, functions, constants, and operators.
- Auto-closing brackets and quotes, smart `Enter`, line indent/unindent, pair deletion, and a
  **Format** action (`Shift` + `Alt` + `F`) that re-indents the source from bracket depth.
- A **Maximize** toggle that hides the output pane so the source fills the workspace.
- Examples library: 33 expressions for the expression editor and 12 documents for the writer,
  covering the arithmetic, the bounded operations, the calculus, the structures, the symbols, and
  the document components — plus a few examples that show what the diagnostics look like. A
  complex-mode toggle for `i`, and a paper-and-ink light theme with a monochrome dark theme, are
  persisted in `localStorage`.
- Keyboard-accessible output tabs (arrow keys, Home, and End); copy and download actions are disabled
  when there is no valid output.
- Copy output and download a complete `.tex` document.
- Source can be shared with `#src=<url-encoded source>`.

### Expression editor

- Accepting a function suggestion writes the call **expanded**, with the names of the parameters as
  placeholders: `integral(variable, start, end, expression)`. The first placeholder is selected, so
  typing replaces it, and **Tab** moves to the next one and, after the last, out of the call.
- The suggestion list shows the whole signature, so the argument order is readable without hovering.

### Document writer

- A document is a **program of statements**. `document = Document(type="article", title="…")` creates
  the document; every other statement is a method call on a bound name, such as
  `main = document.section("Introduction")` and `main.paragraph("The sum is ", inline(sum(i, 1, n, i^2)), ".")`.
- A name stands for a document or a block, never for a value, and is only used before a dot. There is
  no assignment in the language, so `n = 5` is a diagnostic rather than a statement.
- Every method declares how many positional arguments it takes. While those slots are open, `=` is
  the equality relation; afterwards it is a named argument, and an unknown name lists the names the
  method accepts.
- Templates: `article`, `report`, `academic_report`, `thesis`, `book`, `presentation`,
  `technical_document`, `letter`. Templates control heading numbering, contents, the abstract, and
  the LaTeX class.
- Declarative page layout: A3/A4/A5/Letter/Legal, portrait or landscape, per-side margins in
  mm/cm/in/pt/px, and one to three columns.
- 36 methods across seven categories: the document itself, document structure, prose, mathematics
  blocks, tables and figures, academic structures, and references.
- Automatic numbering for sections, equations (`number=true`), tables, figures, listings, and
  theorem-like results; the named `label=` registers a target, `ref(...)` resolves it, and
  unresolved or duplicate labels are errors.
- A reference list is created with `refs = document.bibliography()`, and each entry is added with the
  method named after its type — `refs.book("euler1748", author="…", title="…", publisher="…", year=1748)` —
  with per-type required fields. `cite(...)` renders numbered, linked citations and the list is
  numbered in definition order. A references section is appended when a document cites sources
  without a reference list.
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
- Context-aware completion in the writer: after a dot, the list contains only the methods the
  container around the caret accepts; inside a call, only the named arguments that method takes, and
  the arguments already given are omitted. The bindings of the statements before the caret decide
  what a name stands for.
- Typing an empty string (`""`) for an argument with allowed values or a default opens its value list.
  Enumerated arguments mark the default, and the default is offered first. Non-string options such as
  `columns=` and `number=` are suggested without quotes.
- Starter snippets: accepting `Document` expands a complete, valid article scaffold; `section`,
  `table`, `figure`, `theorem`, `bibliography`, and friends expand to matching templates. Multi-line
  snippets are indented to the insertion point and the caret lands in the first empty placeholder.
- Hover help: methods, metadata keys, page options, margins, named arguments (`label=`, `number=`,
  `caption=`, …), and reference fields show their scope, value type, allowed values, defaults, and
  an example.
- The same syntax highlighting, auto-closing, smart indentation, formatting, and maximize controls as
  the expression editor, with document components and field names highlighted too.

### Reference page

- A plain-language opening overview that explains what EasyTeX and MathScript are, followed by the
  complete catalog.
- Every function, constant, Greek letter name, named symbol, operator, syntax rule, template, page size, and document component.
- A searchable **LaTeX → MathScript** reference covering standard LaTeX/AMS functions, structures, constants, Greek letters, operators, relations, arrows, delimiters, big operators, accents, ordinary symbols, and document constructs. Each row is marked **native**, **approximate**, or **no equivalent**, with a note explaining the closest MathScript option.
- The LaTeX table is explicit about scope: the 604-page Comprehensive LaTeX Symbol List includes package fonts, emoji, phonetics, and decorative text glyphs that have no place in MathScript's font-free model. The reference covers the standard math vocabulary rather than claiming a one-to-one glyph mapping.
- Live MathML previews for expression examples; document examples link into the writer.
- Search across functions, constants, Greek letters, fields, argument names, and document components;
  each component lists positional and named arguments.
- New **Document authoring** section with a rendered document preview, authoring notes, the template
  table, page geometry, component catalog, and a field reference for metadata, page options, named
  arguments, and bibliography entries.
- The field reference lists each field's allowed values and defaults, and a **Reference types** table
  names the required and optional fields for every bibliography entry type.

### Shared implementation

- One lexer and parser serve both layers. Document literals add strings, booleans, objects, and
  `//` / `/* */` comments; mathematical expressions reject those literals.
- Shared documentation metadata in `src/docs/` drives the reference page, autocomplete, and hover
  help, including document components, object field scopes, defaults, and allowed values.
- Deterministic validation and rendering; no network access is required to build or preview.
- 144 conformance tests cover the language, the expression pipeline, the document layer, the
  documentation catalog, the writer examples, the authoring snippets, the field catalog, the
  context-aware completion and its insertion rules, the syntax highlighter, the editing/formatting
  helpers, the LaTeX mapping catalog, and the engine boundary.

### Engine and hosts

- The language lives in `src/` as a platform-independent engine: no DOM, no `window`, no
  `localStorage`, no `process`, no filesystem, no network. It maps strings to results and nothing
  else. A boundary test enforces this mechanically.
- `src/engine.js` is the single public surface. Every host — the browser UI, the command line
  tool, a desktop or mobile application — reaches the language through it.
- The React application in `app/` is the user interface. It reaches the language only through
  `src/engine.js` and reuses the documentation catalog and the design system in `ui/`, so the
  engine stays independent of the browser and of the app.
- `src/manifest.js` returns the whole language surface as plain JSON: functions and arities,
  constants, Greek names, named symbols, operators, components, fields with their allowed values
  and defaults, metadata names, page options, margin sides, named arguments, bibliography types,
  templates, page sizes, and the 743-row LaTeX catalog. A second implementation can be written
  against the manifest and the specification alone.
- `tools/easytex-engine.mjs` is the reference command line host. It speaks a JSON contract over
  standard input and standard output — one request per line — so the same engine can be driven from
  Windows, Linux, a language server, or a program written in any language.
- `ENGINE.md` specifies the contract: request and response shapes, the diagnostic format, the
  transports, and the manifest.

## Architecture

```text
src/
  engine.js                              public engine surface for every host
  manifest.js                            portable JSON description of the language
  lexer.js, parser.js, validate.js      shared front end
  builtins.js, diagnostics.js            language surface and error model
  render-mathml.js, render-latex.js      expression renderers
  docs/                                  function, constant, Greek, symbol, operator, LaTeX, field
                                         metadata, and object-field/value completion metadata
  document/
    components.js                        component catalog and authoring notes
    templates.js                         templates, page sizes, length parsing
    build.js                             document tree builder and validator
    render-html.js, styles.js            sheet HTML and stylesheet
    render-latex.js                      complete LaTeX export
    export-html.js                       standalone HTML export
    index.js                             compileDocument() entry point
ui/                                    the shared browser layer
  styles.css, docs.css, document.css   the design system
  highlight.js                          syntax highlighting
  editing.js                            auto-closing pairs, indentation, formatting
  completion-context.js                 object fields and field values
  completion-insertion.js                what a suggestion inserts
  snippets.js                           component starter snippets
  textarea-geometry.js                  text measurement
  asset-paths.js                        where the app keeps its files
  document-examples.js                  writer examples (tested in CI)
  vendor/                               print-js, vendored for offline use
tools/
  serve.mjs                              development static server
  easytex-engine.mjs                     command line host speaking the JSON contract
app/
  index.html                             entry document of the application
  src/
    main.jsx, App.jsx                    mount and router
    lib/                                 bridge to the engine, routing, theme, storage
    hooks/                               autocomplete, hover card, toast
    components/                          editor, suggestion list, hover card, tabs, header
    pages/                               expression editor, document writer, reference
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
5. **The engine knows nothing about its host.** The language in `src/` uses no browser and no
   operating-system API. Hosts reach it through `src/engine.js` or through the JSON contract in
   `ENGINE.md`, so the same engine can back a web page, a command line tool, or a desktop
   application written in another language.

## Running

```bash
npm run dev     # http://localhost:5173
npm test        # conformance and documentation tests
npm run engine -- compile --source "x = frac(1, 2)"   # the engine from a terminal
```

Node 18 or newer is required. The app is a React application built with Vite; the engine has no
dependencies at all, and the engine host (`tools/easytex-engine.mjs`) speaks JSON on standard input
and standard output.

## Updates

### 2026-10-20 — a document is a program of statements

- The document layer was rewritten. A document is no longer one `document({ ... })` object; it is a
  **program of statements**:

  ```text
  document = Document(type="article", title="Summing Squares")
  main = document.section("Result")
  main.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
  main.paragraph("Equation ", ref("eq:series"), " gives the closed form.")
  ```

- The old data form is gone. Nothing is executed either way: the statements are folded into the same
  document tree the renderer has always used, so the sheet, the LaTeX export, and the standalone
  HTML are unchanged.
- **A name stands for a document or a block, never for a value.** A name is only used before a dot,
  so `n = 5` is a diagnostic and a section named `e` never hides the constant `e`.
- **Arguments are decided by position, not by name.** Each method declares how many positional
  arguments it takes; while those slots are open `=` is the equality relation, and afterwards it is
  a named argument. An unknown name lists the names the method accepts.
- The catalogue became a **method catalogue**: the metadata moved to the named arguments of
  `Document(...)`, the page geometry to `document.page(...)`, the labels to a `label=` named
  argument, the prose from `text(...)` to `paragraph(...)`, and the bibliography to a reference list
  whose entries are added with the method named after their type (`refs.book(...)`,
  `refs.article(...)`).
- The writer learned the new shape: the completion offers the methods of the container around the
  caret and the named arguments of the call being written, the highlighting marks the constructor,
  the methods, and the named arguments, and every example — including the twelve in the writer — was
  rewritten in the new syntax.
- The specification (§10.6), the engine contract, the manifest, and the reference page follow the
  new language. The suite grew from 153 to 196 tests.

### 2026-10-20 — the expression editor takes several expressions

- The language is still one expression per source: MathScript has no statements, no assignment, and
  no sequencing, which is what keeps every expression unambiguous and safe to parse as data.
- The **editor**, however, did not have to be that strict, and now is not: the source is read as a
  scratchpad of independent expressions, one per line, and each one is checked and rendered on its
  own. A line that continues inside brackets stays a single expression, and a comment never splits
  anything.
- A broken line no longer hides the rest: the renders of the other lines stay on screen and the
  diagnostic points at the exact line and column of the mistake.
- This is a **host** feature, not a change to the language. The engine grew
  `compileScratchpad()` beside `compile()`, and the language, the document layer, and the exports
  are untouched.
- The editor now opens on a scratchpad of **two equations** — the sum of squares and the closed
  form that goes with it — so the new behaviour is visible at a glance.
- The suite grew from 144 to 153 tests, and the panel head was tightened so the mode switch, the
  status, and the panel actions still fit on one line.

### 2026-10-20 — a mode switch in the header

- The two editors are the same app in two modes, so the panel head now carries a **mode switch**
  instead of a separate button: `Expression | Document`, next to the status and the panel actions.
  The current mode is marked, the other one is one click away, and the URL still says which mode
  you are in. The reference page keeps its own links, because it is a document rather than a mode.
- The switch is a pair of links, not buttons, so it can be opened in a new tab and it works without
  JavaScript.

### 2026-10-20 — the interface against the web guidelines

- Ran the interface against the Web Interface Guidelines, the accessibility rules, the metadata
  rules, and the React performance rules.
- **Accessibility:** a skip link to the content, `aria-activedescendant` on the suggestion list, the
  output panels labelled by their tab, the toast announced with `role="status"`, the diagnostics
  as a real list, and the anchors of the reference clear of the sticky header.
- **Metadata:** the title, the description, the canonical link, and the social card now come from
  one record per page, so they can never disagree. The app has a favicon and a web manifest.
- **The reference page is loaded on demand** and its search lives in the address bar, so a
  filtered reference can be shared as a link. The heavy tables are memoised, and the hundreds of
  rows of the LaTeX catalog skip their layout while they are off the screen.
- **Touch and safe areas:** the controls answer a double tap, the tap highlight is set on purpose,
  the overlays keep the page from scrolling under them, and the header and the workspace respect
  the safe area of a notched phone.
- The suite still passes: 144 tests.

### 2026-10-20 — a typography and interface pass

- Gave the app a **type scale**: named sizes from `--text-2xs` to `--text-xl`, each with its line
  height and weight, so a role is one decision instead of three. Every font size is now in `rem`,
  so the reader's browser font size still applies.
- **Headings are balanced and paragraphs are pretty** (`text-wrap`), the prose keeps a 68-character
  measure, and the numbers that change while you type — the status, the timings, the statistics, the
  section counts — use `tabular-nums`, so nothing shifts under the cursor.
- The **header sticks** to the top of the page and grows a hairline once the content scrolls under
  it; the reference page keeps its navigation in view.
- The **panel heads** were the noisiest part of the interface: the title now shrinks and its
  subtitle ellipsizes, the actions stay on one row, and the export buttons share the panel's button
  size. The text size control moved to the header, where the other view settings live.
- The **status is a chip** instead of a floating line, the suggestion list marks the chosen row, and
  the diagnostics carry an accent on the side that names the problem.
- The controls share one height, answer the press, and every icon-only button carries a name. The
  motion respects `prefers-reduced-motion`, the writer uses the dynamic viewport height, and the
  editor keeps at least 16px of text on a touch screen, where a smaller field would zoom the page.
- The layers use a fixed stacking scale instead of ad-hoc `z-index` values.

### 2026-10-20 — more examples and a text size control

- The example library grew: **33 expressions** for the expression editor and **12 documents** for
  the writer. The new expressions cover the product, the double sum, the harmonic series, the
  improper integral, the limit at infinity, the second and mixed derivatives, the matrix of
  symbols, the nested fraction, Euler's identity, the square root of a negative number, the
  trigonometric identity, and the Greek letters — plus four examples that show the diagnostics.
  The new documents cover a book, a thesis, a landscape presentation, a small handout, and the
  inline styles and symbols.
- Both editors can now be zoomed: an `A−` / `A+` control with the current size, a reset, and the
  shortcuts `Ctrl` + `-`, `Ctrl` + `=`, and `Ctrl` + `0`. The size is remembered, and the
  highlight layer follows it so the code and the colours stay in step.
- The examples are checked by the test suite: every expression either compiles or reports the
  diagnostic it advertises, and every document example still builds. The suite grew from 142 to
  144 tests.

### 2026-10-20 — the writer fills the window

- Fixed the document writer collapsing to the height of its content. The writer's layout expects
  the header, the workspace, and the footer to be direct children of the body, but the React app
  renders them into a root element, so the workspace never received the free space. The writer now
  marks the body, and the root element carries the column, so the workspace takes the height
  between the header and the footer.
- **Maximize** now really maximizes: the editor panel fills the window instead of sitting in a
  short box with a large empty area under it.
- The suite grew from 141 to 142 tests.

### 2026-10-20 — the React app is the app

- The React application is now the only user interface. The old static pages, their scripts, and
  their markup are gone; what remains in `ui/` is the shared browser layer: the design system, the
  highlighter, the editing rules, the completion rules, and the vendored print library.
- The deployment follows: `vercel.json` builds the app with `npm run build`, serves `dist/`, and
  routes every path to the application. The specification and the other documents travel with the
  build, so `/SPECIFICATION.md` keeps working.
- Fixed the field values not showing up. The list of allowed values appeared only while the caret
  was *between* the quotes, so it vanished the moment the caret moved past the closing quote. An
  empty string at the caret now counts as a value position, and accepting a value replaces the
  empty string.
- Every page now offers the other pages: the expression editor links to the document writer and the
  reference, the writer links back to the expression editor, and the reference links to both.
- The editor keeps a visible scrollbar. The scrollbar area is always reserved, and the thumb is
  drawn in the readable grey instead of a barely visible line.
- The suite grew from 134 to 141 tests.

### 2026-10-20 — printable documents, a scrollable editor, and frontend tests

- The **Print / PDF** button now prints the document instead of the whole application. The
  vendored [print-js](https://github.com/eidellev/print-js) library copies the rendered sheet into a
  hidden frame together with the document's own stylesheet and the `@page` geometry, so the output
  is the document on its real paper size, and the browser's "Save as PDF" gives a vector copy of
  the mathematics. The library lives in `ui/vendor/` so the app keeps working offline.
- Fixed the editor being cut off in the writer. The painted highlight layer kept the size the
  textarea had when the page loaded, so when the panel grew — the diagnostics appear, the window
  resizes — the layer stayed short and hid the rest of the source. The layer now follows the
  textarea's size.
- Removed the scrollbar arrows. A classic scrollbar draws an up/down control at the end of its
  track, which landed on top of the equation numbers in the preview. The scrollbars are now thin
  and have no buttons.
- The suggestion list and the hover card no longer break when the caret cannot be measured.
- Added **frontend tests for the React host**: a real DOM (jsdom), the real renderer, and the real
  pages, loaded through Vite. They cover the editor preview, the diagnostics, the output tabs, the
  writer's sheet and statistics, the field suggestions, the reference search, and the print
  contract. The suite grew from 134 to 141 tests.

### 2026-10-20 — a stable sheet preview and a fixed reference navigation

- Fixed the document writer's preview jitter in both hosts. The sheet is scaled from the width of
  the output column, never from its own width: a sheet that sized itself shrank the zoom, and the
  smaller zoom shrank the sheet again, so the preview resized itself in a loop. The zoom is now
  computed from the column and only written when it really changes.
- The writer was missing `ui/document.css`, so the preview column was not a flex item and
  the sheet could size the column. The React host now loads the writer stylesheet as well.
- Fixed the reference navigation in the React host. The links were wrapped in a group element that
  broke the column layout of the navigation, so the entries ran into each other. The navigation now
  has the same structure as the static page: a group label followed by its links, stacked.

### 2026-10-20 — the React application

- Built the whole web app as a React application in `app/`, with Vite: the expression editor, the
  document writer, and the reference page. It reaches the language only through `src/engine.js`,
  and it reuses the shared stylesheet, the documentation catalog, the highlighter, and the
  completion rules.
- The editor keeps every behaviour: the painted highlight layer, the suggestion list with keyboard
  and mouse selection, the hover card, auto-closing pairs, smart `Enter`, indentation, formatting,
  the output tabs, the diagnostics, and the exports.
- The reference page keeps the search box, the section navigation that follows the scroll, the
  highlighted samples, the live previews, and the whole LaTeX compatibility table.
- Added tests for the router, for the host boundaries, and a build smoke test. The suite grew from
  129 to 134 tests.

### 2026-10-20 — static hosting on Vercel and everywhere else

- Added `vercel.json`. The repository root is the site, so Vercel served the files but had no
  page at `/`. The configuration now maps `/` to the expression editor and adds the friendly
  paths `/editor`, `/document`, and `/docs`.
- Made every internal link absolute, in the pages and in the scripts that build them, so the app
  works at whatever URL a host maps it to and never breaks on a rewritten path.
- A document's relative image paths now resolve against the app instead of the current URL, so a
  figure in the writer example loads at `/document` as well as at `/web/document.html`.
- Added tests that keep the links absolute, that every local link points at a file that exists,
  that the scripts build no relative links, that the Vercel configuration agrees with the
  development server, and that relative image paths resolve against the app. The suite grew from
  122 to 129 tests.

### 2026-10-20 — engine, hosts, and highlighted reference

- Separated the engine from its hosts. The language in `src/` is platform independent: no browser
  API, no operating-system API, no I/O. `src/engine.js` is the public surface, and a boundary test
  fails the build if a browser or Node API ever appears in the engine.
- Added `src/manifest.js`, a portable JSON description of the whole language — functions and
  arities, constants, Greek names, symbols, operators, components, fields with allowed values and
  defaults, metadata names, page options, margin sides, named arguments, bibliography types,
  templates, page sizes, and the 743-row LaTeX catalog. Another implementation of the engine can
  be written against the manifest and the specification alone.
- Added `tools/easytex-engine.mjs`, the reference command line host. It speaks a JSON contract over
  standard input and standard output, one request per line, so the engine can be driven from
  Windows, Linux, a language server, or any language. `npm run engine -- compile|document|manifest|
  version|serve` covers the commands.
- Added `ENGINE.md`: the contract, the response shapes, the diagnostic format, the transports, the
  manifest, and how to write a host.
- The reference page now highlights every MathScript sample with the same scanner the editors
  use: example blocks, syntax notes, precedence sources, the LaTeX table's MathScript column, and
  field examples.
- The hover card is rebuilt: a named header with a kind chip, the signature in its own code block,
  a two-column argument list, value chips with the default marked, and a highlighted example with
  the rendered preview below it.
- The suite grew from 111 to 122 tests.

### 2026-10-20 — completion test coverage

- Extracted the suggestion insertion rules into a pure `completionInsertion()` helper and covered
  field names, quoted and unquoted values, function calls, constants, and component snippets.
- Added completion-context tests for nested objects, bibliography entries inside document
  metadata, reference-type narrowing, unknown types, strings and comments that contain object
  punctuation, unknown objects and fields, named arguments, and value metadata.
- Added field-default invariants (every default is one of its own options and matches the engine's
  page defaults) and scanner-offset coverage.
- The suite grew from 85 to 111 tests.

### 2026-10-20 — focused editor layout

- Removed the introductory strip from the expression editor. Both editors now begin directly with
  the source and output panels.
- Adjusted the workspace grid so the panels fill the available height without an empty row, and
  restored natural stacked rows on narrow screens. Removed the now-unused intro styles.

### 2026-10-20 — object-field completion and enumerated values

- Added context-aware completion for document objects. Inside `document({ ... })`, `page({ ... })`,
  `margins: { ... }`, and bibliography entry objects, the writer lists only that object's fields,
  omits fields already present, and narrows a reference entry to its declared `type`.
- Added value completion. Typing `""` in a field with allowed values or a default opens a filtered,
  case-insensitive list. The default appears first and is marked **DEFAULT**; other entries are
  marked **OPTION**. Non-string fields such as `columns` and `number=` offer their values without
  quotes, and quoted numeric values are replaced with valid unquoted numbers.
- Field suggestions show their type and default in the signature column, and accepted field names
  insert `name: ` with the caret ready for a value. Mouse and keyboard selection both work.
- The reference and hover cards now show field defaults alongside allowed value groups.
- Deferred autocomplete refresh by one microtask so it sees the final caret position after
  auto-closing quotes; previously an input event fired before the caret moved inside the new pair.
- Added field, reference-type, value/default, blocked-string, and non-string option tests. The suite
  grew from 77 to 85 tests.

### 2026-10-20 — visual system, onboarding, and monochrome dark mode

- Reworked the interface palette around warm paper, ink, rust, and pine in the light theme; the dark
  chrome is black, white, and gray. Syntax highlighting keeps a restrained, high-contrast color
  palette in both themes so the editor stays scannable.
- Added a plain-language intro strip to the expression editor and a new "EasyTeX & MathScript"
  overview at the top of the reference, explaining the distinction between the application and the
  language. The document writer stays focused on the source and preview.
- Replaced the serif display face with a tighter sans-serif hierarchy, while keeping the printed
  document sheet's serif typography.
- Improved small-screen navigation with a collapsible reference contents panel, a compact header, and
  panel headers that wrap cleanly; added keyboard navigation to output tabs.
- Strengthened the UI hierarchy with restrained borders and shadows, accessible focus states, clearer
  status indicators, and disabled export actions when output is unavailable.
- Updated the default document sheet accents and sample chart to match the light palette.
- The full suite was at 77 passing tests after this change.

### 2026-10-20 — arbitrary-base logarithms

- Added `logbase(expression, base)`, with the value first and the base second. It requires two scalar arguments and renders as \(\log_b(x)\) in MathML and LaTeX.
- `log` remains base 10 and `ln` remains natural. The reference page, hover help, autocomplete metadata, specification, and LaTeX catalog now describe `logbase`; the `\log_{b}(x)` mapping is native instead of a documented gap.
- The suite grew from 76 to 77 tests.

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
