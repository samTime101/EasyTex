# EasyTeX

**Write math, not LaTeX.**

EasyTeX is a web editor and previewer for **MathScript**, a function-based mathematical notation language defined in [`SPECIFICATION.md`](./SPECIFICATION.md). It includes an expression editor and a document writer for complete papers, reports, and notes.

Type a readable expression:

```text
sum(i, 1, n, i^2)
```

See it rendered instantly as professional notation, and export clean LaTeX when you need it. Put the
same expression in a `document({ ... })` source to get a full sheet with sections, numbered equations,
figures, references, and citations. See [`APPLICATION.md`](./APPLICATION.md) for the complete feature
list and update log.

## Quick start

No dependencies are required. Node 18 or newer is enough.

```bash
npm run dev
```

Then open <http://localhost:5173>. The document writer is at
<http://localhost:5173/web/document.html> and the full language reference is at
<http://localhost:5173/web/docs.html>.

Run the conformance tests with:

```bash
npm test
```

## Deploying

EasyTeX is a static site: no build step, no dependencies, no server. Any static host can serve the
repository as it is. The included `vercel.json` maps the friendly paths on Vercel:

| Path | Page |
| --- | --- |
| `/` | Expression editor |
| `/editor` | Expression editor |
| `/document` | Document writer |
| `/docs` | Reference |
| `/SPECIFICATION.md` | Language specification |

Connect the repository to Vercel and deploy; nothing else is needed. On another host, serve the
repository root and map `/` to `/web/index.html`, exactly as the development server does. Every
link inside the app is absolute, so the pages keep working at whatever URL the host maps them to.

## Features

- **Live preview** using native MathML, with no third-party rendering library.
- **Document writer** for `document({ ... })` sources: templates, page geometry, sections, numbered
  equations, tables, figures, listings, theorems, cross-references, citations, and bibliographies.
- **LaTeX and standalone HTML export** of documents, plus Print/PDF with the document's page size and
  margins. The last valid preview stays visible while diagnostics are fixed.
- **Structured parser** with a full lexer, recursive-descent parser, and AST.
- **Validation** for built-in arity, free function application, bound variables, matrix shapes, relation nesting, list placement, document structure, labels, references, and bibliography entries.
- **Logarithms with an explicit base**: `log(x)` is base 10, `ln(x)` is natural, and `logbase(x, b)` takes the value first and the base second.
- **Expanded symbol vocabulary**: lowercase, variant, and uppercase Greek names, plus named ordinary symbols such as `aleph`, `hbar`, `emptyset`, `forall`, and `ell`. These stay ordinary free variables and add no new syntax or dependency.
- **Diagnostics** with source positions and categories. Click a diagnostic to select the offending range in the editor.
- **Function suggestions** while typing: an autocomplete list with signatures, keyboard navigation, and correct insertion of calls and constants. In the writer, document components are suggested too, and structured components insert starter snippets — `document` expands to a complete scaffold. Inside document objects, completion offers only the fields for that object (`document`, `page`, `margins`, or a bibliography entry); typing `""` for a field with allowed values or a default opens the value list, with the default marked.
- **Hover documentation** in the editor: signatures, argument descriptions, and a rendered example for the function or documented symbol under the pointer, with scope-aware handling of bound variables. The writer also explains components and fields (metadata keys, named arguments, and bibliography entries). The card is highlighted like the editor and shows allowed values with the default marked.
- **Syntax highlighting** in both editors: comments, strings, numbers, booleans, functions, constants, operators, document components, and field names each get their own color, in light and dark themes. The reference page uses the same highlighter, so every sample on it is colored too.
- **Editing assistance**: brackets and quotes auto-close around a selection or step over their partner, `Backspace` removes an empty pair, `Enter` keeps indentation and expands bracket pairs into a block, and `Tab` / `Shift` + `Tab` indent lines. `Shift` + `Alt` + `F` or the **Format** button re-indents source from bracket depth.
- **Maximize** button in both editors hides the output pane so the source gets the full page width.
- **Documentation page** at `/web/docs.html` covering every function, constant, Greek letter name, named symbol, operator, syntax rule, component, template, and document field — with allowed values, defaults, bibliography reference types, live previews, search, and links into both editors. A searchable **LaTeX → MathScript** reference maps standard LaTeX/AMS notation and marks every construct that has no native equivalent.
- **Export** to LaTeX, MathML, or the raw AST. Download a complete `.tex` document with one click.
- **Examples** for sums, products, fractions, logarithms, integrals, limits, derivatives, matrices, vectors, and documents.
- **Complex mode** toggle for the imaginary unit `i`.
- **Paper-and-ink light theme and a black-and-white dark interface**, persisted in `localStorage`.
- **Plain-language onboarding**: the expression editor and reference explain the difference between EasyTeX and MathScript.
- **Platform-independent engine**: the language lives in `src/` with no browser or operating-system API, behind a documented JSON contract. The web app, the command line host, and any future desktop or mobile app are separate hosts on top of the same engine. See [`ENGINE.md`](./ENGINE.md).
- **Zero runtime dependencies.** Everything is plain ES modules.

## Project layout

```text
easytex/
├── SPECIFICATION.md      Language specification (v0.1-draft)
├── ENGINE.md             Engine contract: hosts, JSON protocol, manifest
├── APPLICATION.md        Application features and update log
├── package.json
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
├── test/                 Node test-runner conformance tests
├── tools/serve.mjs       Dependency-free static dev server
├── tools/easytex-engine.mjs  Command line host speaking the JSON contract
└── web/                  EasyTeX web app
    ├── index.html        Expression editor
    ├── styles.css
    ├── app.js
    ├── autocomplete.js
    ├── completion-context.js
    ├── snippets.js
    ├── hover-docs.js
    ├── highlight.js
    ├── editing.js
    ├── textarea-geometry.js
    ├── theme.js
    ├── document.html     Document writer
    ├── document.css
    ├── document.js
    ├── document-examples.js
    ├── asset-paths.js
    ├── assets/           Sample images used by document examples
    ├── docs.html         Reference page
    ├── docs.css
    └── docs.js
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

const document = compileDocument(`document({
  type: "article",
  title: "Summing Squares",
  author: "A. Author",
  content: [
    section("Result", [
      equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
    ])
  ]
})`);

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
