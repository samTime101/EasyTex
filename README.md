# EasyTeX

**Write math, not LaTeX.**

EasyTeX is a web editor and previewer for **MathScript**, a function-based mathematical notation language defined in [`SPECIFICATION.md`](./SPECIFICATION.md).

Type a readable expression:

```text
sum(i, 1, n, i^2)
```

See it rendered instantly as professional notation, and export clean LaTeX when you need it.

## Quick start

No dependencies are required. Node 18 or newer is enough.

```bash
npm run dev
```

Then open <http://localhost:5173>. The full language reference lives at <http://localhost:5173/web/docs.html>.

Run the conformance tests with:

```bash
npm test
```

## Features

- **Live preview** using native MathML, with no third-party rendering library.
- **Structured parser** with a full lexer, recursive-descent parser, and AST.
- **Validation** for arity, unknown functions, bound variables, matrix shapes, relation nesting, list placement, and `infinity` contexts.
- **Diagnostics** with source positions. Click a diagnostic to select the offending range in the editor.
- **Function suggestions** while typing: an autocomplete list with signatures, keyboard navigation, and correct insertion of calls and constants.
- **Hover documentation** in the editor: signatures, argument descriptions, and a rendered example for the function under the pointer, with scope-aware handling of bound variables.
- **Documentation page** at `/web/docs.html` covering every function, constant, operator, syntax rule, and worked example with live previews, search, and "Try it" links into the editor.
- **Export** to LaTeX, MathML, or the raw AST. Download a complete `.tex` document with one click.
- **Examples** for sums, products, fractions, integrals, limits, derivatives, matrices, vectors, and more.
- **Complex mode** toggle for the imaginary unit `i`.
- **Light and dark themes**, persisted in `localStorage`.
- **Zero runtime dependencies.** Everything is plain ES modules.

## Project layout

```text
easytex/
├── SPECIFICATION.md      Language specification (v0.1-draft)
├── package.json
├── src/                  Parser, validator, and renderers
│   ├── docs/             Function, constant, and operator documentation data
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
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── autocomplete.js
    ├── hover-docs.js
    ├── textarea-geometry.js
    ├── theme.js
    ├── docs.html
    ├── docs.css
    └── docs.js
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl` + `Space` | Show all function and constant suggestions |
| `↑` / `↓` | Move through suggestions |
| `Enter` or `Tab` | Accept the selected suggestion |
| `Esc` | Dismiss suggestions |
| `Ctrl` + `Enter` | Re-render immediately |
| `Tab` | Insert two spaces |

## Library usage

The parser and renderers are ordinary ES modules and can be used outside the web app:

```js
import { compile } from "./src/index.js";

const result = compile("sum(i, 1, n, i^2)");

console.log(result.latex);   // \sum_{i = 1}^{n} i^{2}
console.log(result.mathml);  // <math ...>...</math>
console.log(result.diagnostics);
```

`compile()` returns diagnostics and no rendered output when the expression is invalid. Lower-level entry points (`parse`, `validate`, `renderLaTeX`, `renderMathML`, `tokenize`) are exported as well.

## Status

This is an early, working implementation of the v0.1-draft specification:

- **Implemented:** arithmetic, precedence, function calls, bounded operations, calculus notation, structures, constants, diagnostics, and LaTeX/MathML output.
- **Not yet implemented:** numeric evaluation, user-defined functions, piecewise `cases`, document markup, and an interactive equation editor.

The three compatibility-sensitive decisions in the specification are provisionally set to: no implicit multiplication, `log` is base 10, and higher-order calculus uses nested first-order forms. See Appendix A of the specification.

## License

MIT
