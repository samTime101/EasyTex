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

## Features

- **Live preview** using native MathML, with no third-party rendering library.
- **Document writer** for `document({ ... })` sources: templates, page geometry, sections, numbered
  equations, tables, figures, listings, theorems, cross-references, citations, and bibliographies.
- **LaTeX and standalone HTML export** of documents, plus Print/PDF with the document's page size and
  margins. The last valid preview stays visible while diagnostics are fixed.
- **Structured parser** with a full lexer, recursive-descent parser, and AST.
- **Validation** for arity, unknown functions, bound variables, matrix shapes, relation nesting, list placement, document structure, labels, references, and bibliography entries.
- **Diagnostics** with source positions and categories. Click a diagnostic to select the offending range in the editor.
- **Function suggestions** while typing: an autocomplete list with signatures, keyboard navigation, and correct insertion of calls and constants. In the writer, document components are suggested too, and structured components insert starter snippets — `document` expands to a complete scaffold.
- **Hover documentation** in the editor: signatures, argument descriptions, and a rendered example for the function under the pointer, with scope-aware handling of bound variables. The writer also explains components and fields (metadata keys, named arguments, and bibliography entries).
- **Documentation page** at `/web/docs.html` covering every function, constant, operator, syntax rule, component, template, and field, with live previews, search, and links into both editors.
- **Export** to LaTeX, MathML, or the raw AST. Download a complete `.tex` document with one click.
- **Examples** for sums, products, fractions, integrals, limits, derivatives, matrices, vectors, and documents.
- **Complex mode** toggle for the imaginary unit `i`.
- **Light and dark themes**, persisted in `localStorage`.
- **Zero runtime dependencies.** Everything is plain ES modules.

## Project layout

```text
easytex/
├── SPECIFICATION.md      Language specification (v0.1-draft)
├── APPLICATION.md        Application features and update log
├── package.json
├── src/                  Parser, validator, renderers, and document layer
│   ├── docs/             Function, constant, operator, and component documentation data
│   ├── document/         Document builder, templates, sheet and LaTeX renderers
│   ├── lexer.js
│   ├── parser.js
│   ├── validate.js
│   ├── builtins.js
│   ├── diagnostics.js
│   ├── render-mathml.js
│   ├── render-latex.js
│   ├── render-shared.js
│   └── index.js
├── test/                 Node test-runner conformance tests
├── tools/serve.mjs       Dependency-free static dev server
└── web/                  EasyTeX web app
    ├── index.html        Expression editor
    ├── styles.css
    ├── app.js
    ├── autocomplete.js
    ├── snippets.js
    ├── hover-docs.js
    ├── textarea-geometry.js
    ├── theme.js
    ├── document.html     Document writer
    ├── document.css
    ├── document.js
    ├── document-examples.js
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
| `Tab` | Insert two spaces |

## Library usage

The parser, renderers, and document layer are ordinary ES modules and can be used outside the web app:

```js
import { compile, compileDocument } from "./src/index.js";

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

## Status

This is an early, working implementation of the v0.1-draft specification:

- **Implemented:** arithmetic, precedence, function calls, bounded operations, calculus notation, structures, constants, diagnostics, LaTeX/MathML output, and the experimental document layer described in section 10.6 of the specification.
- **Not yet implemented:** numeric evaluation, user-defined functions, piecewise `cases`, slide-by-slide presentation rendering, letter-specific LaTeX layout, and an interactive equation editor.

The three compatibility-sensitive decisions in the specification are provisionally set to: no implicit multiplication, `log` is base 10, and higher-order calculus uses nested first-order forms. See Appendix A of the specification.

## License

MIT
