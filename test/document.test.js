import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, compileDocument, parse } from "../src/index.js";
import {
  COMPONENTS,
  COMPONENT_DOCS,
  DOCUMENT_NOTES,
  TEMPLATES,
  PAGE_SIZES,
  HANDLED_COMPONENTS,
  NAMED_ARGUMENTS,
  renderStandaloneHTML
} from "../src/document/index.js";
import {
  KNOWN_METADATA,
  PAGE_OPTIONS,
  MARGIN_SIDES,
  BIBLIOGRAPHY_TYPES
} from "../src/document/build.js";
import {
  FIELD_DOCS,
  FIELD_SCOPE_ORDER,
  groupFieldsByScope
} from "../src/docs/index.js";
import { DOCUMENT_EXAMPLES, DEFAULT_DOCUMENT_SOURCE } from "../web/document-examples.js";
import { prepareSnippet, lineIndent } from "../web/snippets.js";

function messages(result) {
  return result.diagnostics.map((entry) => `${entry.severity} ${entry.category}: ${entry.message}`);
}

function errors(result) {
  return result.diagnostics.filter((entry) => entry.severity !== "warning");
}

const FULL_DOCUMENT = `document({
  type: "report",
  title: "Summation Identities",
  author: "A. Author",
  abstract: "We collect standard finite-sum identities.",
  content: [
    page({ size: "A4", columns: 1 }),
    section("Introduction", [
      text("The series ", inline(sum(i, 1, n, i)), " is quadratic in ", n, "."),
      equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series"),
      text("See ", ref("eq:series"), " and ", cite("smith2024"), "."),
      bullets(["First item", "Second item"]),
      table(["Name", "Score"], [["Alice", 90], ["Bob", 85]], caption="Exam scores", label="tab:scores"),
      theorem("Pythagoras", [text("In a right triangle, ", inline(a^2 + b^2 = c^2), ".")], label="thm:pyth"),
      proof([text("Expand both sides and collect terms.")])
    ]),
    bibliography([{ key: "smith2024", type: "article", author: "J. Smith", title: "On series", journal: "J. Math.", year: 2024 }])
  ]
})`;

test("the lexer reads strings, escapes, and block comments", () => {
  const { tokens, diagnostics } = tokenize('text("a \\"quoted\\" value\\nnext") /* comment */ 42');
  assert.deepEqual(diagnostics, []);
  assert.equal(tokens[0].type, "identifier");
  assert.equal(tokens[1].type, "punct");
  assert.equal(tokens[2].type, "string");
  assert.equal(tokens[2].value, 'a "quoted" value\nnext');
  assert.equal(tokens.at(-2).type, "number");

  const unterminated = tokenize('"never closed');
  assert.ok(unterminated.diagnostics.some((entry) => entry.message.includes("Unterminated string")));

  const comment = tokenize("/* never closed");
  assert.ok(comment.diagnostics.some((entry) => entry.message.includes("Unterminated block comment")));

  const escape = tokenize('"bad \\q escape"');
  assert.ok(escape.diagnostics.some((entry) => entry.message.includes("Unsupported escape")));
});

test("strings, booleans, and objects parse as document values", () => {
  const { ast, diagnostics } = parse('document({ toc: true, title: "Hi", content: [text("x")] })');
  assert.deepEqual(diagnostics, []);
  const object = ast.args[0];
  assert.equal(object.kind, "Object");
  assert.equal(object.entries[0].value.kind, "Boolean");
  assert.equal(object.entries[0].value.value, true);
  assert.equal(object.entries[1].value.kind, "String");
});

test("a string in a mathematical expression is a type error", () => {
  const result = compileDocument('document({ type: "article", content: [ equation(sqrt("hello")) ] })');
  assert.ok(
    result.diagnostics.some((entry) => entry.category === "type" && entry.message.includes("scalar")),
    messages(result).join("\n")
  );
  assert.equal(result.html, null, "nothing is rendered while the document has errors");
});

test("a full document compiles, renders, and exports", () => {
  const result = compileDocument(FULL_DOCUMENT);
  assert.deepEqual(messages(result), []);
  assert.ok(result.document);
  assert.ok(result.html.includes('class="ms-sheet"'));
  assert.ok(result.html.includes("Summation Identities"));
  assert.ok(result.html.includes("<math"), "equations render as MathML");
  assert.ok(result.html.includes('href="#ms-eq-series"'), "references link to labelled blocks");
  assert.ok(result.html.includes("(1)"), "numbered equations show their number");
  assert.ok(result.html.includes("Table 1"), "tables are captioned and numbered");
  assert.ok(result.html.includes('href="#bib-smith2024"'), "citations link to bibliography entries");
  assert.ok(result.html.includes("Theorem 1"), "theorem environments are numbered");
  assert.ok(result.latex.startsWith("\\documentclass"), "LaTeX export is a complete document");
  assert.ok(result.latex.includes("a4paper"), "page geometry reaches the LaTeX export");
  assert.ok(result.latex.includes("\\begin{equation}"));
  assert.ok(result.latex.includes("\\label{eq:series}"));
  assert.ok(result.latex.includes("\\cite{smith2024}"));
  assert.ok(result.latex.includes("\\newtheorem{theorem}{Theorem}"));
  assert.equal(result.document.stats.equations, 1);
  assert.equal(result.document.stats.tables, 1);
});

test("sections, equations, figures, and tables are numbered automatically", () => {
  const result = compileDocument(`document({
    type: "article",
    title: "Numbering",
    author: "A",
    content: [
      section("One", [
        subsection("One point one", [text("Body.")]),
        equation(x = 1, number=true),
        equation(x = 2, number=true)
      ]),
      section("Two", [text("Body.")]),
      figure(image("plot.png"), caption="A plot"),
      figure(image("plot.png"), caption="Another plot")
    ]
  })`);
  assert.deepEqual(messages(result), []);
  const html = result.html;
  assert.ok(html.includes('<span class="ms-section-number">1</span>'));
  assert.ok(html.includes('<span class="ms-section-number">1.1</span>'));
  assert.ok(html.includes('<span class="ms-section-number">2</span>'));
  assert.ok(html.includes("(1)") && html.includes("(2)"), "equations are numbered in order");
  assert.ok(html.includes("Figure 1") && html.includes("Figure 2"), "figures are numbered in order");
});

test("references resolve forward and backwards", () => {
  const result = compileDocument(`document({
    type: "article",
    title: "Refs",
    author: "A",
    content: [
      section("First", [
        text("See ", ref("eq:later"), "."),
        equation(x = 1, number=true, label="eq:later"),
        text("And ", ref("sec:second"), ".")
      ]),
      section("Second", [text("Body.")], label="sec:second")
    ]
  })`);
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes(">(1)</a>"));
  assert.ok(result.html.includes(">2</a>"));
});

test("broken references, duplicate labels, and unnumbered labels are diagnostics", () => {
  const missing = compileDocument('document({ content: [ text("See ", ref("nope"), ".") ] })');
  assert.ok(messages(missing).some((entry) => entry.includes("Unresolved reference 'nope'")));
  assert.ok((missing.html ?? "").includes("??") || missing.html === null);

  const duplicate = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [
      equation(x = 1, number=true, label="eq:same"),
      equation(x = 2, number=true, label="eq:same")
    ]
  })`);
  assert.ok(messages(duplicate).some((entry) => entry.includes("Duplicate label 'eq:same'")));

  const unnumbered = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [ equation(x = 1, label="eq:loose") ]
  })`);
  assert.ok(messages(unnumbered).some((entry) => entry.includes("add number=true")));
});

test("metadata is validated with helpful diagnostics", () => {
  const unknown = compileDocument('document({ type: "article", title: "T", author: "A", nope: 1, content: [text("x")] })');
  assert.ok(messages(unknown).some((entry) => entry.startsWith("warning name: Unknown document metadata field 'nope'")));
  assert.ok(unknown.html, "warnings do not stop rendering");

  const badType = compileDocument('document({ type: "paper", content: [text("x")] })');
  assert.ok(messages(badType).some((entry) => entry.includes("Unknown document type 'paper'")));

  const missingContent = compileDocument('document({ type: "article", title: "T" })');
  assert.ok(messages(missingContent).some((entry) => entry.includes("missing the required 'content' field")));
  assert.equal(missingContent.document, null);

  const missingTitle = compileDocument('document({ type: "article", content: [text("x")] })');
  assert.ok(messages(missingTitle).some((entry) => entry.startsWith("warning document: This document has no title")));
});

test("unknown components are named with suggestions", () => {
  const result = compileDocument('document({ content: [ sectoin("T", [text("x")]) ] })');
  const all = messages(result).join("\n");
  assert.ok(all.includes("Unknown document component 'sectoin'"), all);
  assert.ok(all.includes("'section'"), all);
});

test("component argument rules are enforced", () => {
  const arity = compileDocument('document({ content: [ text() ] })');
  assert.ok(messages(arity).some((entry) => entry.includes("text() expects at least one")));

  const badBlock = compileDocument('document({ content: [ bold("x") ] })');
  assert.ok(messages(badBlock).some((entry) => entry.includes("inline component")));

  const badInline = compileDocument('document({ content: [ text(section("x", [text("y")])) ] })');
  assert.ok(messages(badInline).some((entry) => entry.includes("block component")));

  const namedAfterPositional = compileDocument(
    'document({ type: "article", title: "T", author: "A", content: [ equation(x = 1, label="eq:a", number=true) ] })'
  );
  assert.deepEqual(messages(namedAfterPositional), [], "named arguments in any order are fine");

  const misplaced = compileDocument('document({ content: [ equation(number=true, x = 1) ] })');
  assert.ok(messages(misplaced).some((entry) => entry.includes("Positional arguments must come before named arguments")));
});

test("tables validate their shape", () => {
  const ragged = compileDocument('document({ content: [ table(["A", "B"], [["1"]]) ] })');
  assert.ok(messages(ragged).some((entry) => entry.includes("same number of cells")));

  const empty = compileDocument("document({ content: [ table([]) ] })");
  assert.ok(messages(empty).some((entry) => entry.includes("at least one row")));

  const badAlign = compileDocument('document({ content: [ table([["1"]], align="middle") ] })');
  assert.ok(messages(badAlign).some((entry) => entry.includes("Alignment must be")));
});

test("aligned() requires relations", () => {
  const bad = compileDocument("document({ content: [ aligned([x + y]) ] })");
  assert.ok(messages(bad).some((entry) => entry.includes("must be a relation")));

  const good = compileDocument(
    'document({ type: "article", title: "T", author: "A", content: [ aligned([x + y = 5, x - y = 1], number=true) ] })'
  );
  assert.deepEqual(messages(good), []);
  assert.ok(good.latex.includes("\\begin{aligned}"));
  assert.ok(good.html.includes("ms-aligned-table"));
});

test("bibliography entries are validated and citations resolve", () => {
  const missingField = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [
      text("See ", cite("a"), "."),
      bibliography([{ key: "a", type: "article", author: "A", year: 2024 }])
    ]
  })`);
  assert.ok(messages(missingField).some((entry) => entry.includes("missing the required field 'title'")));

  const duplicate = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [ bibliography([{ key: "a", type: "misc", author: "A", title: "T", year: 1 }, { key: "a", type: "misc", author: "B", title: "U", year: 2 }]) ]
  })`);
  assert.ok(messages(duplicate).some((entry) => entry.includes("Duplicate bibliography key 'a'")));

  const unknownType = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [ bibliography([{ key: "a", type: "tweet", author: "A", title: "T", year: 1 }]) ]
  })`);
  assert.ok(messages(unknownType).some((entry) => entry.includes("Unknown bibliography type 'tweet'")));

  const unknownKey = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [ text("See ", cite("ghost"), ".") ]
  })`);
  assert.ok(messages(unknownKey).some((entry) => entry.includes("No bibliography entry with the key 'ghost'")));

  const auto = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [
      text("See ", cite("b"), "."),
      bibliography([{ key: "b", type: "book", author: "A", title: "T", year: 2001, publisher: "P" }])
    ]
  })`);
  assert.deepEqual(messages(auto), []);
  assert.ok(auto.html.includes("References"));
});

test("templates change numbering and table of contents", () => {
  const report = compileDocument(`document({
    type: "report", title: "R", author: "A",
    content: [ section("One", [text("x")]), section("Two", [text("y")]) ]
  })`);
  assert.deepEqual(messages(report), []);
  assert.ok(report.html.includes('class="ms-toc"'));
  assert.ok(report.latex.includes("\\tableofcontents"));

  const letter = compileDocument(`document({
    type: "letter", title: "Dear reader", author: "A",
    content: [ section("Subject", [text("Hello.")]) ]
  })`);
  assert.deepEqual(errors(letter), []);
  assert.ok(!letter.html.includes("ms-section-number"), "letters are unnumbered");
  assert.ok(!letter.html.includes("ms-toc"));
  assert.ok(messages(letter).every((entry) => !entry.includes("no title")));
  assert.ok(messages(letter).some((entry) => entry.includes("letter template exports as a standard article")));
});

test("page configuration is validated and exported", () => {
  const landscape = compileDocument(`document({
    type: "presentation", title: "S", author: "A",
    content: [ text("Slide content.") ]
  })`);
  assert.deepEqual(errors(landscape), []);
  assert.equal(landscape.document.page.orientation, "landscape");
  assert.ok(messages(landscape).some((entry) => entry.includes("presentation template exports as a landscape article")));

  const columns = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [ page({ size: "A5", columns: 2, margins: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" } }), text("Two columns.") ]
  })`);
  assert.deepEqual(messages(columns), []);
  assert.equal(columns.document.page.size, "A5");
  assert.ok(columns.html.includes("--ms-columns: 2"));
  assert.ok(columns.latex.includes("\\begin{multicols}{2}"));
  assert.ok(columns.latex.includes("margin=10.00mm"));

  const badSize = compileDocument('document({ content: [ page({ size: "B5" }) ] })');
  assert.ok(messages(badSize).some((entry) => entry.includes("Unknown page size 'B5'")));

  const badMargin = compileDocument('document({ content: [ page({ margins: { top: "big" } }) ] })');
  assert.ok(messages(badMargin).some((entry) => entry.includes("not a valid length")));

  const badColumns = compileDocument("document({ content: [ page({ columns: 0 }) ] })");
  assert.ok(messages(badColumns).some((entry) => entry.includes("between 1 and 3")));
});

test("images validate their source and dimensions", () => {
  const badScheme = compileDocument('document({ content: [ figure(image("javascript:alert(1)")) ] })');
  assert.ok(messages(badScheme).some((entry) => entry.includes("unsupported scheme")));

  const badWidth = compileDocument('document({ content: [ figure(image("plot.png", width="wide")) ] })');
  assert.ok(messages(badWidth).some((entry) => entry.includes("not a valid length")));

  const ok = compileDocument(
    'document({ type: "article", title: "T", author: "A", content: [ figure(image("https://example.com/p.png", width="80%", alt="Plot"), caption="A plot") ] })'
  );
  assert.deepEqual(messages(ok), []);
  assert.ok(ok.html.includes('src="https://example.com/p.png"'));
  assert.ok(ok.html.includes("width: 80%"));
  assert.ok(ok.latex.includes("width=0.8\\textwidth"));
});

test("text escapes HTML and LaTeX special characters", () => {
  const result = compileDocument(
    'document({ type: "article", title: "T", author: "A", content: [ text("50% of {a} & b_1 # x") ] })'
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("50% of {a} &amp; b_1 # x"));
  assert.ok(result.latex.includes("50\\% of \\{a\\} \\& b\\_1 \\# x"));
});

test("code listings carry captions and languages", () => {
  const result = compileDocument(`document({
    type: "article", title: "T", author: "A",
    content: [ listing("const x = 1;", language="javascript", caption="A listing", label="lst:one") ]
  })`);
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("Listing 1"));
  assert.ok(result.latex.includes("\\usepackage{listings}"));
  assert.ok(result.latex.includes("language=JavaScript"));
  assert.ok(result.latex.includes("label={lst:one}"));
});

test("page_break renders a separator and a newpage", () => {
  const result = compileDocument('document({ type: "article", title: "T", author: "A", content: [ text("One."), page_break(), text("Two.") ] })');
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("ms-page-break"));
  assert.ok(result.latex.includes("\\newpage"));
});

test("a bare block is wrapped in a default article", () => {
  const result = compileDocument('section("Introduction", [text("Hello.")])');
  assert.ok(messages(result).some((entry) => entry.startsWith("warning document: This source is not wrapped")));
  assert.ok(result.html.includes("Hello."));
  assert.ok(result.latex.includes("\\section{Introduction}"));
});

test("standalone HTML export embeds the styles", () => {
  const result = compileDocument(FULL_DOCUMENT);
  const standalone = renderStandaloneHTML({ title: result.document.metadata.titleText, html: result.html });
  assert.ok(standalone.startsWith("<!doctype html>"));
  assert.ok(standalone.includes(".ms-sheet"));
  assert.ok(standalone.includes("Summation Identities"));
});

test("every documented component exists, is handled, and has examples", () => {
  const documented = new Set(Object.keys(COMPONENTS));
  for (const name of documented) {
    assert.ok(HANDLED_COMPONENTS.has(name), `'${name}' is documented but not handled by build.js`);
  }
  for (const name of HANDLED_COMPONENTS) {
    assert.ok(documented.has(name), `'${name}' is handled but not documented`);
  }
  for (const doc of COMPONENT_DOCS) {
    assert.ok(doc.signature.startsWith(`${doc.name}(`) || doc.signature.startsWith(`${doc.name}({`), `${doc.name} signature`);
    assert.ok(doc.summary.length > 0, `${doc.name} summary`);
    assert.ok(doc.category, `${doc.name} category`);
    assert.ok(doc.status === "implemented", `${doc.name} status`);
    assert.ok(doc.examples.length > 0, `${doc.name} examples`);
  }
  for (const [name, names] of Object.entries(NAMED_ARGUMENTS)) {
    const documented1 = new Set(COMPONENTS[name].named.map((entry) => entry.name));
    for (const arg of names) assert.ok(documented1.has(arg), `${name} named argument '${arg}' is not documented`);
    for (const arg of documented1) assert.ok(names.has(arg), `${name} documented named argument '${arg}' is not implemented`);
  }
});

test("every documented example builds a document without errors", () => {
  const wrap = (source) => {
    const trimmed = source.trim();
    if (trimmed.startsWith("document(")) return trimmed;
    return `document({ type: "article", title: "Example", author: "Docs", content: [\n${trimmed}\n] })`;
  };
  for (const doc of COMPONENT_DOCS) {
    for (const example of doc.examples) {
      const result = compileDocument(wrap(example.source));
      assert.deepEqual(
        errors(result).map((entry) => `${entry.category}: ${entry.message}`),
        [],
        `example for '${doc.name}' failed: ${example.source}`
      );
      assert.ok(result.html, `example for '${doc.name}' did not render`);
    }
  }
});

test("document notes are complete", () => {
  assert.ok(DOCUMENT_NOTES.length >= 5);
  for (const note of DOCUMENT_NOTES) {
    assert.ok(note.title && note.body && note.example, `note '${note.title}' is incomplete`);
  }
});

test("every template has a label, summary, and LaTeX class", () => {
  assert.ok(Object.keys(TEMPLATES).length >= 8);
  for (const [name, template] of Object.entries(TEMPLATES)) {
    assert.equal(template.name, name);
    assert.ok(template.label && template.summary, name);
    assert.ok(["article", "report", "book"].includes(template.latexClass), name);
  }
});

test("document writer examples compile as advertised", () => {
  assert.ok(DOCUMENT_EXAMPLES.length >= 5, "the writer ships several examples");
  assert.ok(
    DOCUMENT_EXAMPLES.some((example) => example.valid === false),
    "one example demonstrates diagnostics"
  );

  for (const example of DOCUMENT_EXAMPLES) {
    const result = compileDocument(example.source);
    if (example.valid === false) {
      assert.ok(errors(result).length > 0, `'${example.label}' should report errors`);
      continue;
    }
    assert.deepEqual(
      errors(result).map((entry) => `${entry.category}: ${entry.message}`),
      [],
      `'${example.label}' should compile without errors`
    );
    assert.ok(result.html, `'${example.label}' should render HTML`);
    assert.ok(result.latex, `'${example.label}' should export LaTeX`);
  }

  const fallback = compileDocument(DEFAULT_DOCUMENT_SOURCE);
  assert.deepEqual(errors(fallback), [], "the default document is valid");
  assert.ok(fallback.html && fallback.latex);
});

// ------------------------------------------------------------------ snippets

const SNIPPET_WRAPPERS = {
  subsection: (source) => `section("Outer", [\n${source}\n])`,
  subsubsection: (source) => `section("Outer", [\n  subsection("Inner", [\n${source}\n  ])\n])`
};

function wrapSnippet(name, source) {
  const inner = SNIPPET_WRAPPERS[name] ? SNIPPET_WRAPPERS[name](source) : source;
  if (name === "document") return inner;
  return `document({ type: "article", title: "Snippet", author: "Docs", content: [\n${inner}\n] })`;
}

test("component snippets are valid starter documents", () => {
  const snippets = COMPONENT_DOCS.filter((doc) => doc.snippet);
  assert.ok(snippets.length >= 10, "several components offer a starter snippet");

  for (const doc of snippets) {
    const markers = doc.snippet.match(/\$0/g) ?? [];
    assert.ok(markers.length <= 1, `${doc.name} snippet has more than one caret marker`);
    assert.ok(
      doc.snippet.trimStart().startsWith(`${doc.name}(`),
      `${doc.name} snippet should start with '${doc.name}('`
    );

    const prepared = prepareSnippet(doc.snippet);
    assert.ok(!prepared.text.includes("$0"), `${doc.name} snippet still contains the caret marker`);

    const result = compileDocument(wrapSnippet(doc.name, prepared.text));
    assert.deepEqual(
      errors(result).map((entry) => `${entry.category}: ${entry.message}`),
      [],
      `snippet for '${doc.name}' failed: ${prepared.text}`
    );
    assert.ok(result.html, `snippet for '${doc.name}' did not render`);
  }
});

test("the document snippet scaffolds a complete default document", () => {
  const prepared = prepareSnippet(COMPONENTS.document.snippet);
  assert.equal(
    prepared.text.slice(prepared.caret - 1, prepared.caret + 1),
    '""',
    'the caret lands inside text("")'
  );

  const result = compileDocument(prepared.text);
  assert.deepEqual(messages(result), [], "the scaffold compiles without diagnostics");
});

test("snippet insertion indents continuation lines and places the caret", () => {
  const prepared = prepareSnippet(COMPONENTS.section.snippet, "  ");
  assert.equal(prepared.text, 'section("", [\n    text("")\n  ])');
  assert.equal(prepared.text.slice(prepared.caret - 1, prepared.caret + 1), '""');

  const plain = prepareSnippet("page_break()");
  assert.equal(plain.text, "page_break()");
  assert.equal(plain.caret, plain.text.length);

  assert.equal(lineIndent("  section(", 10), "  ");
  assert.equal(lineIndent('text("a"), ', 11), "");
  assert.equal(lineIndent("\n  x", 4), "  ");
});

// -------------------------------------------------------------------- fields

test("every document field has hover documentation", () => {
  const documented = new Set(FIELD_DOCS.map((field) => field.name));
  assert.equal(documented.size, FIELD_DOCS.length, "field names are unique");

  const expected = new Set([
    ...KNOWN_METADATA,
    ...PAGE_OPTIONS,
    ...MARGIN_SIDES,
    ...Object.values(NAMED_ARGUMENTS).flatMap((names) => [...names]),
    ...Object.values(BIBLIOGRAPHY_TYPES).flatMap((type) => type.fields),
    "key"
  ]);
  for (const name of expected) {
    assert.ok(documented.has(name), `field '${name}' has no documentation`);
  }

  for (const field of FIELD_DOCS) {
    assert.ok(expected.has(field.name), `field '${field.name}' is not a real field name`);
    assert.ok(field.summary.length > 0, `field '${field.name}' needs a summary`);
    assert.ok(field.type, `field '${field.name}' needs a value type`);
    assert.ok(FIELD_SCOPE_ORDER.includes(field.scope), `field '${field.name}' has an unknown scope`);
  }

  const size = FIELD_DOCS.find((field) => field.name === "size");
  assert.deepEqual(
    size.values.map((value) => value.toUpperCase()).sort(),
    Object.keys(PAGE_SIZES).sort(),
    "page sizes are listed in their source spelling"
  );
});

test("field scopes group the catalog without losing entries", () => {
  const groups = groupFieldsByScope();
  assert.deepEqual(
    groups.map((group) => group.scope),
    FIELD_SCOPE_ORDER.filter((scope) => groups.some((group) => group.scope === scope))
  );
  const grouped = groups.flatMap((group) => group.items.map((field) => field.name));
  assert.deepEqual(grouped, FIELD_DOCS.map((field) => field.name));
  for (const group of groups) assert.ok(group.label, `${group.scope} needs a display label`);
});
