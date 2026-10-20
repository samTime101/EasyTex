# The EasyTeX engine contract

The EasyTeX engine turns MathScript source into diagnostics, MathML, LaTeX,
and rendered documents. It is a library, not a program: it has no window, no
filesystem, no network, and no platform of its own. Everything that a user
sees — the browser editor, the document writer, the reference page, a command
line tool, a desktop application — is a *host* built on top of it.

This document is the agreement between the engine and its hosts. A host in
any language, on any platform, can be written against it.

## 1. Layers

```
    hosts                web/            tools/           your app
    ─────                ───             ──────           ────────
    browser UI, CLI,    ⇅ JSON contract ⇅
    desktop app  ───────►  engine (src/engine.js)  ◄─────────
                            │
                            ├── lexer, parser, validator
                            ├── MathML and LaTeX renderers
                            └── document builder, HTML and LaTeX exporters
```

- `src/` is the engine. It is platform independent: no DOM, no `window`, no
  `localStorage`, no `process`, no filesystem, no network. It maps strings to
  results and nothing else.
- `web/` is one host: the browser UI. It may use browser APIs, and it must
  never be imported by `src/`.
- `tools/` is another host: command line programs. `tools/easytex-engine.mjs`
  is the reference binding of the contract below.
- `test/engine-boundary.test.js` enforces these rules mechanically.

## 2. The engine surface

`src/engine.js` is the only module a host needs to import.

| Export | Purpose |
| --- | --- |
| `compile(source, options)` | Compile one expression. Returns `{ ok, mathml, latex, ast, diagnostics, tokens }`. |
| `compileDocument(source, options)` | Compile one document — a program of statements. Returns `{ ok, html, latex, ast, diagnostics, tokens }`. |
| `parse(source)` | Parse only. Returns `{ ast, diagnostics, tokens }`. |
| `validate(ast, options)` | Validate a parsed tree. Returns `{ diagnostics }`. |
| `renderMathML(ast, options)` | Render a tree as MathML. |
| `renderLaTeX(ast, options)` | Render a tree as LaTeX. |
| `engineManifest()` | The whole language surface as plain JSON. |
| `ENGINE_NAME`, `ENGINE_VERSION` | Identity of the engine. |

Options:

| Option | Default | Meaning |
| --- | --- | --- |
| `complex` | `true` | Enable complex-number semantics for `i`. |

Guarantees:

- **Deterministic.** The same source and options always give the same result.
  There is no clock, no randomness, and no environment lookup.
- **Total.** A malformed source never throws: it returns diagnostics.
- **Pure.** Calling the engine twice with the same input gives the same
  output, and the engine keeps no state between calls.
- **Versioned.** `ENGINE_VERSION` changes when the observable behaviour
  changes. Hosts should report it.

## 3. The JSON contract

A host that cannot link against the engine — a GUI written in Rust, a mobile
app, a language server — talks to it through this contract instead. The
reference binding is `tools/easytex-engine.mjs`.

### 3.1 Request

```json
{
  "id": "7",
  "command": "compile",
  "source": "x = frac(1, 2)",
  "options": { "complex": true },
  "includeAst": false
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string or number | Optional. Echoed back so a host can match replies. |
| `command` | string | `compile`, `document`, `manifest`, or `version`. |
| `source` | string | The MathScript source. Not needed for `manifest` and `version`. |
| `options` | object | Engine options, currently `complex`. |
| `includeAst` | boolean | When true, the reply carries the parsed tree. |

### 3.2 Response

```json
{
  "id": "7",
  "engine": "easytex",
  "version": "0.1.0",
  "command": "compile",
  "ok": true,
  "result": {
    "ok": true,
    "mathml": "<math …>",
    "latex": "x=\\frac{1}{2}",
    "diagnostics": []
  }
}
```

A request that could not be carried out at all answers with `ok: false` and
an `error` object:

```json
{ "id": "7", "engine": "easytex", "version": "0.1.0", "command": "nope",
  "ok": false, "error": { "message": "Unknown command: nope" } }
```

`ok: true` means the request was understood. Whether the *source* is valid is
reported by `result.ok`: a source with errors still returns `ok: true` at the
envelope level, with `result.ok: false` and the diagnostics filled in.

### 3.3 Results

`compile` returns:

| Field | Type | Meaning |
| --- | --- | --- |
| `ok` | boolean | True when the source has no error diagnostics. Warnings may still be present. |
| `mathml` | string or null | MathML for the expression, or null when it did not compile. |
| `latex` | string or null | LaTeX for the expression, or null when it did not compile. |
| `diagnostics` | array | The problems found, in source order. |
| `ast` | object or null | Present only with `includeAst: true`. |

`document` returns `ok`, `html`, `latex`, `diagnostics`, and optionally `ast`
in place of `mathml`.

### 3.4 Diagnostics

A diagnostic is data, never text to parse:

```json
{
  "severity": "error",
  "category": "syntax",
  "message": "Unexpected 'x' after a number. Implicit multiplication is not defined; write an explicit '*'",
  "span": {
    "start": { "offset": 1, "line": 1, "column": 2 },
    "end": { "offset": 2, "line": 1, "column": 3 }
  }
}
```

- `severity` is `error` or `warning`.
- `category` is one of `lexical`, `syntax`, `name`, `arity`, `structure`,
  `type`, `domain`, `reserved`, `document`, `reference`.
- `span` is optional. `offset` is a zero-based character offset; `line` and
  `column` are one-based. A host that wants to underline the problem uses
  `span`; a host that only wants to show messages uses `message`.

### 3.5 Transports

The contract is transport agnostic. Two are provided:

- **One shot.** A host runs the program once per request.
- **Newline-delimited JSON.** A host starts `serve` and writes one JSON
  request per line to standard input, reading one JSON response per line
  from standard output. Requests may be pipelined; responses may arrive in
  any order, so `id` is the way to match them.

```console
$ printf '{"id":"1","command":"compile","source":"pi"}\n' | node tools/easytex-engine.mjs serve
{"id":"1","engine":"easytex","version":"0.1.0","command":"compile","ok":true,"result":{…}}
```

## 4. The manifest

`engineManifest()` returns the whole language surface as JSON: functions with
their arities, constants, Greek names, named symbols, operators, the document
methods with their containers and arguments, every field with its scope and
allowed values, the metadata names, the page options, the margin sides, the
named arguments per method, the bibliography types, the templates, the page
sizes, the default page, and the LaTeX compatibility catalog.

```console
$ node tools/easytex-engine.mjs manifest --pretty | head
```

A new implementation of the engine in another language can be written against
the manifest and `SPECIFICATION.md` alone: the manifest says which names
exist, what they take, and what they mean. The manifest is the engine's
compatibility surface — a second implementation that matches it matches this
one.

## 5. Writing a host

A host in another language needs three things:

1. **A parser** for the language, following `SPECIFICATION.md`: identifiers,
   numbers, strings, comments, calls, objects, lists, and relations.
2. **The surface**, from the manifest: the built-in functions and their
   arities, the binder functions, the constants, the Greek names, the named
   symbols, and the document components.
3. **A renderer** that produces MathML for expressions and HTML or LaTeX for
   documents, matching the output of this engine for the same source.

Two rules keep a host interoperable:

- **`=` is equality.** There is no assignment in MathScript.
- **No implicit multiplication.** `2x` is an error; write `2*x`.

The `tools/easytex-engine.mjs` binding shows how small a host can be: it
imports `src/engine.js`, maps JSON to engine calls, and prints JSON. A Rust
or Go host does the same with a subprocess or a language-server pipe.

## 6. Repository map

| Path | Role |
| --- | --- |
| `src/engine.js` | The engine's public surface. |
| `src/manifest.js` | The portable language manifest. |
| `src/lexer.js`, `src/parser.js`, `src/validate.js` | Front end of the pipeline. |
| `src/render-mathml.js`, `src/render-latex.js` | Expression renderers. |
| `src/document/` | The document layer: builder, HTML sheet, LaTeX export. |
| `src/docs/` | The documentation catalog, shared by every host. |
| `web/` | The browser host. |
| `tools/easytex-engine.mjs` | The reference command line host. |
| `tools/serve.mjs` | The development static server. |
| `test/engine-boundary.test.js` | Enforces the boundary described here. |
