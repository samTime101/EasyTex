# EasyTeX

**Write math, not LaTeX.**

EasyTeX is a web editor and previewer for **MathScript**, a function-based mathematical notation language defined in [`SPECIFICATION.md`](./SPECIFICATION.md). It includes an expression editor and a document writer for complete papers, reports, and notes.

Type a readable expression:

```text
sum(i, 1, n, i^2)
```

See it rendered instantly as professional notation, and export clean LaTeX when you need it. Put the
same expression in a document — a program of statements — to get a full sheet with sections, numbered
equations, figures, references, and citations:

```text
document = Document(type="article", title="Summing Squares")
main = document.section("Result")
main.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
main.paragraph("Equation ", ref("eq:series"), " gives the closed form.")
```

See [`APPLICATION.md`](./APPLICATION.md) for the complete feature list and update log.

## Quick start

Node 18 or newer is enough. The app itself needs React and Vite; the engine needs nothing at all.

```bash
npm run dev
```

Then open <http://localhost:5174>. The document writer is at
<http://localhost:5174/document> and the full language reference is at
<http://localhost:5174/docs>.

Run the conformance tests with:

```bash
npm test
```

## Deploying

The app is a React application: `npm run build` writes it to `dist/`, and every path is routed to
the same document by the included `vercel.json`.

| Path | Page |
| --- | --- |
| `/` | Expression editor |
| `/document` | Document writer |
| `/docs` | Reference |
| `/SPECIFICATION.md` | Language specification |

Connect the repository to Vercel and deploy; the configuration builds the app and routes every
path to it. On another host, build the app and serve `dist/` with a fallback to `index.html`.
Every link inside the app is absolute, so the pages keep working at whatever URL the host maps
them to.

## Features

- **Live preview** using native MathML, with no third-party rendering library.
- **A scratchpad, not a single slot**: the expression editor takes one expression per line and checks and renders each on its own, so a broken line never hides the ones around it.
- **A mode switch in the header** moves between the expression editor and the document writer, so both are one click away.
- **Document writer** for programs of statements: templates, page geometry, sections, numbered
  equations, tables, figures, listings, theorems, cross-references, citations, and bibliographies.
  A name stands for a document or a block and never for a value, so there is no assignment in the
  language.
- **LaTeX and standalone HTML export** of documents, plus Print/PDF that prints the document
  alone — its own stylesheet, its real paper size and margins — through the print-js library, so the
  browser's "Save as PDF" gives a vector copy of the mathematics. The last valid preview stays
  visible while diagnostics are fixed.
- **Structured parser** with a full lexer, recursive-descent parser, and AST.
- **Validation** for built-in arity, free function application, bound variables, matrix shapes, relation nesting, list placement, document structure, labels, references, and bibliography entries.
- **Logarithms with an explicit base**: `log(x)` is base 10, `ln(x)` is natural, and `logbase(x, b)` takes the value first and the base second.
- **Expanded symbol vocabulary**: lowercase, variant, and uppercase Greek names, plus named ordinary symbols such as `aleph`, `hbar`, `emptyset`, `forall`, and `ell`. These stay ordinary free variables and add no new syntax or dependency.
- **Diagnostics** with source positions and categories. Click a diagnostic to select the offending range in the editor.
- **Function suggestions** while typing: an autocomplete list with signatures, keyboard navigation, and correct insertion of calls and constants. Accepting a function writes the call **expanded**, with the names of its parameters as placeholders — `integral(variable, start, end, expression)` — the first one selected, so typing replaces it and **Tab** walks to the next. In the writer, the methods of the container around the caret are suggested, and each method inserts a starter snippet — `Document` expands to a complete scaffold. Inside a call, completion offers only the named arguments that method accepts; typing `""` for an argument with allowed values or a default opens the value list, with the default marked.
- **Hover documentation** in the editor: signatures, argument descriptions, and a rendered example for the function or documented symbol under the pointer, with scope-aware handling of bound variables. The writer also explains components and fields (metadata keys, named arguments, and bibliography entries). The card is highlighted like the editor and shows allowed values with the default marked.
- **Syntax highlighting** in both editors: comments, strings, numbers, booleans, functions, constants, operators, document components, and field names each get their own color, in light and dark themes. The reference page uses the same highlighter, so every sample on it is colored too.
- **Editing assistance**: brackets and quotes auto-close around a selection or step over their partner, `Backspace` removes an empty pair, `Enter` keeps indentation and expands bracket pairs into a block, and `Tab` / `Shift` + `Tab` indent lines. `Shift` + `Alt` + `F` or the **Format** button re-indents source from bracket depth.
- **Maximize** button in both editors hides the output pane so the source gets the full page width.
- **Documentation page** at `/docs` covering every function, constant, Greek letter name, named symbol, operator, syntax rule, component, template, and document field — with allowed values, defaults, bibliography reference types, live previews, search, and links into both editors. A searchable **LaTeX → MathScript** reference maps standard LaTeX/AMS notation and marks every construct that has no native equivalent.
- **Export** to LaTeX, MathML, or the raw AST. Download a complete `.tex` document with one click.
- **Examples**: 33 expressions — sums, products, fractions, logarithms, integrals, limits, derivatives, matrices, vectors, Greek letters, and the symbols — and 12 documents, from a one-page article to a book, a thesis, and a landscape presentation.
- **Text size control** in both editors (`A−` / `A+`, or `Ctrl` + `-` / `Ctrl` + `=`), remembered between visits.
- **Complex mode** toggle for the imaginary unit `i`.
- **Paper-and-ink light theme and a black-and-white dark interface**, persisted in `localStorage`.
- **Plain-language onboarding**: the expression editor and reference explain the difference between EasyTeX and MathScript.
- **Platform-independent engine**: the language lives in `src/` with no browser or operating-system API, behind a documented JSON contract. The web app, the command line host, and any future desktop or mobile app are separate hosts on top of the same engine. See [`ENGINE.md`](./ENGINE.md).
- **A React application**: the expression editor, the document writer, and the reference page are React components in `app/`, built with Vite on top of the very same engine and the very same stylesheet. The browser layer in `ui/` holds the design system and the editor helpers that the app and the tests share.
- **A type scale, not a pile of sizes**: named sizes with their line height and weight, balanced headings, a 68-character measure, and tabular numbers so the live readouts never shift.
- **Zero runtime dependencies.** Everything is plain ES modules.

## Project layout

```text
easytex/
├── SPECIFICATION.md      Language specification (v0.1-draft)
├── ENGINE.md             Engine contract: hosts, JSON protocol, manifest
├── APPLICATION.md        Application features and update log
├── package.json
├── vite.config.js        Build configuration
├── src/                  The engine: parser, validator, renderers, document layer
│   ├── engine.js         Public engine surface used by every host
│   ├── manifest.js       Portable JSON description of the whole language
│   ├── docs/             Function, constant, Greek, symbol, operator, LaTeX, and component documentation data
│   ├── document/         Document builder, templates, sheet and LaTeX renderers
│   ├── lexer.js
│   ├── parser.js
│   ├── validate.js
│   ├── builtins.js
│   ├── symbols.js
│   ├── diagnostics.js
│   ├── render-mathml.js
│   ├── render-latex.js
│   ├── render-shared.js
│   └── index.js
├── app/                  The React application
│   ├── index.html
│   └── src/
│       ├── main.jsx      Mounts React
│       ├── App.jsx       Routes to the three pages
│       ├── components/   Editor, autocomplete, hover card, tabs, header
│       ├── hooks/        Autocomplete, hover, toast
│       ├── lib/          The bridge to the engine, routing, theme, storage
│       └── pages/        Editor, writer, and reference pages
├── test/                 Node test-runner conformance tests
├── tools/serve.mjs       Dependency-free file server
├── tools/easytex-engine.mjs  Command line host speaking the JSON contract
└── ui/                   The shared browser layer
    ├── styles.css        The design system
    ├── docs.css          Reference page styles
    ├── document.css      Document writer styles
    ├── highlight.js      The syntax highlighter
    ├── editing.js        Auto-closing pairs, indentation, formatting
    ├── completion-context.js  Object fields and field values
    ├── completion-insertion.js  What a suggestion inserts
    ├── snippets.js       Component starter snippets
    ├── textarea-geometry.js     Text measurement
    ├── asset-paths.js    Where the app keeps its files
    ├── document-examples.js     Writer examples
    ├── assets/           Sample images used by document examples
    └── vendor/           print-js, vendored for the offline pages
```

## Keyboard shortcuts

These work in both editors; in the document writer, `Ctrl` + `Space` also lists document components.

| Shortcut | Action |
| --- | --- |
| `Ctrl` + `Space` | Show all suggestions |
| `↑` / `↓` | Move through suggestions |
| `Enter` or `Tab` | Accept the selected suggestion |
| `Esc` | Dismiss suggestions |
| `Ctrl` + `Enter` | Re-render immediately |
| `Tab` / `Shift` + `Tab` | Indent / unindent the selected lines |
| `Shift` + `Alt` + `F` | Re-indent the source |

## Library usage

The engine is a library, not a program. It performs no I/O and uses no browser or operating-system
API, so the same code runs in a browser, on a server, on Windows, on Linux, or inside a desktop
application. `src/engine.js` is the only module a host needs:

```js
import { compile, compileDocument } from "./src/engine.js";

const result = compile("sum(i, 1, n, i^2)");

console.log(result.latex);   // \sum_{i = 1}^{n} i^{2}
console.log(result.mathml);  // <math ...>...</math>
console.log(result.diagnostics);

const document = compileDocument(`document = Document(type="article", title="Summing Squares", author="A. Author")
main = document.section("Result")
main.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")`);

console.log(document.html);  // rendered sheet markup
console.log(document.latex); // complete LaTeX file
```

`compile()` and `compileDocument()` return diagnostics and no rendered output when the source is
invalid. Lower-level entry points (`parse`, `validate`, `buildDocument`, `renderDocumentHTML`,
`renderStandaloneHTML`, `renderLaTeX`, `renderMathML`, `tokenize`) are exported as well.

## Command line host

`tools/easytex-engine.mjs` is the reference host for the engine contract. It speaks JSON over
standard input and standard output, so it runs the same on Windows, Linux, and macOS and can be
driven from any language:

```bash
npm run engine -- compile --source "x = frac(1, 2)" --pretty
npm run engine -- document --file note.math
npm run engine -- manifest --pretty
npm run engine -- serve            # newline-delimited JSON, one request per line
```

The contract, the response shapes, the diagnostic format, and the portable language manifest are
specified in [`ENGINE.md`](./ENGINE.md). A second implementation of the engine in another language
can be written against that document and the manifest alone.

## Status

This is an early, working implementation of the v0.1-draft specification:

- **Implemented:** arithmetic, precedence, function calls, bounded operations, calculus notation, structures, constants, diagnostics, LaTeX/MathML output, and the experimental document layer described in section 10.6 of the specification.
- **Not yet implemented:** numeric evaluation, user-defined functions, piecewise `cases`, slide-by-slide presentation rendering, letter-specific LaTeX layout, and an interactive equation editor.

The three compatibility-sensitive decisions in the specification are provisionally set to: no implicit multiplication, `log` is base 10, and higher-order calculus uses nested first-order forms. See Appendix A of the specification.

## License

MIT
