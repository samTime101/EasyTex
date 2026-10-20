import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, compileDocument, parseProgram } from "../src/index.js";
import {
  COMPONENTS,
  COMPONENT_DOCS,
  DOCUMENT_NOTES,
  TEMPLATES,
  TEMPLATE_NAMES,
  PAGE_SIZES,
  HANDLED_COMPONENTS,
  NAMED_ARGUMENTS,
  renderStandaloneHTML
} from "../src/document/index.js";
import {
  KNOWN_METADATA,
  PAGE_OPTIONS,
  BIBLIOGRAPHY_TYPES
} from "../src/document/build.js";
import { DEFAULT_PAGE } from "../src/document/templates.js";
import {
  FIELD_DOCS,
  FIELD_SCOPE_ORDER,
  groupFieldsByScope
} from "../src/docs/index.js";
import { DOCUMENT_EXAMPLES, DEFAULT_DOCUMENT_SOURCE } from "../ui/document-examples.js";
import { prepareSnippet, lineIndent } from "../ui/snippets.js";

function messages(result) {
  return result.diagnostics.map((entry) => `${entry.severity} ${entry.category}: ${entry.message}`);
}

function errors(result) {
  return result.diagnostics.filter((entry) => entry.severity !== "warning");
}

// A document with the given statements, plus the usual preamble.
function documentWith(...statements) {
  return [
    'document = Document(type="article", title="A Note", author="A")',
    ...statements
  ].join("\n");
}

const FULL_DOCUMENT = `document = Document(type="report", title="Summation Identities", author="A. Author", abstract="We collect standard finite-sum identities.")
document.page(size="A4", columns=1)
main = document.section("Introduction")
main.paragraph("The series ", inline(sum(i, 1, n, i)), " is quadratic in ", n, ".")
main.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
main.paragraph("See ", ref("eq:series"), " and ", cite("smith2024"), ".")
main.bullets(["First item", "Second item"])
main.table(["Name", "Score"], [["Alice", 90], ["Bob", 85]], caption="Exam scores", label="tab:scores")
th = main.theorem("Pythagoras", content="In a right triangle, ", label="thm:pyth")
main.proof(content="Expand both sides and collect terms.")
refs = document.bibliography()
refs.article("smith2024", author="J. Smith", title="On series", journal="J. Math.", year=2024)`;

test("the lexer reads strings, escapes, and block comments", () => {
  const { tokens, diagnostics } = tokenize('paragraph("a \\"quoted\\" value\\nnext") /* comment */ 42');
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

test("a program of statements parses into statements", () => {
  const { statements, diagnostics } = parseProgram(
    'document = Document(type="article", title="Hi")\nmain = document.section("Introduction")\nmain.paragraph("x")'
  );
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(
    statements.map((statement) => statement.kind),
    ["Binding", "Binding", "MethodCall"]
  );
  assert.equal(statements[0].name, "document");
  assert.equal(statements[1].call.method, "section");
  assert.equal(statements[2].method, "paragraph");
});

test("a string in a mathematical expression is a type error", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.equation(sqrt("hello"), number=true)')
  );
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
  const result = compileDocument(
    documentWith(
      'one = document.section("One")',
      'sub = one.subsection("One point one")',
      'sub.paragraph("Body.")',
      'one.equation(x = 1, number=true)',
      'one.equation(x = 2, number=true)',
      'two = document.section("Two")',
      'two.paragraph("Body.")',
      'figA = document.figure(caption="A plot")',
      'figA.image("plot.png")',
      'figB = document.figure(caption="Another plot")',
      'figB.image("plot.png")'
    )
  );
  assert.deepEqual(messages(result), []);
  const html = result.html;
  assert.ok(html.includes('<span class="ms-section-number">1</span>'));
  assert.ok(html.includes('<span class="ms-section-number">1.1</span>'));
  assert.ok(html.includes('<span class="ms-section-number">2</span>'));
  assert.ok(html.includes("(1)") && html.includes("(2)"), "equations are numbered in order");
  assert.ok(html.includes("Figure 1") && html.includes("Figure 2"), "figures are numbered in order");
});

test("references resolve forward and backwards", () => {
  const result = compileDocument(
    documentWith(
      'first = document.section("First")',
      'first.paragraph("See ", ref("eq:later"), ".")',
      'first.equation(x = 1, number=true, label="eq:later")',
      'first.paragraph("And ", ref("sec:second"), ".")',
      'document.section("Second", label="sec:second")'
    )
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes(">(1)</a>"));
  assert.ok(result.html.includes(">2</a>"));
});

test("broken references, duplicate labels, and unnumbered labels are diagnostics", () => {
  const missing = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("See ", ref("nope"), ".")')
  );
  assert.ok(messages(missing).some((entry) => entry.includes("Unresolved reference 'nope'")));
  assert.ok((missing.html ?? "").includes("??") || missing.html === null);

  const duplicate = compileDocument(
    documentWith(
      'main = document.section("Results")',
      'main.equation(x = 1, number=true, label="eq:same")',
      'main.equation(x = 2, number=true, label="eq:same")'
    )
  );
  assert.ok(messages(duplicate).some((entry) => entry.includes("Duplicate label 'eq:same'")));

  const unnumbered = compileDocument(
    documentWith('main = document.section("Results")', 'main.equation(x = 1, label="eq:loose")')
  );
  assert.ok(messages(unnumbered).some((entry) => entry.includes("add number=true")));
});

test("metadata is validated with helpful diagnostics", () => {
  const badType = compileDocument('document = Document(type="paper", title="T", author="A")');
  assert.ok(messages(badType).some((entry) => entry.includes("Unknown document type 'paper'")));

  const missingTitle = compileDocument('document = Document(type="article")');
  assert.ok(messages(missingTitle).some((entry) => entry.startsWith("warning document: This document has no title")));

  const unknown = compileDocument('document = Document(type="article", title="T", author="A", nope=1)');
  assert.ok(
    messages(unknown).some((entry) => entry.includes("Unknown named argument 'nope'")),
    messages(unknown).join("\n")
  );
  assert.equal(unknown.html, null, "an unknown named argument stops the rendering");

  const warned = compileDocument('document = Document(type="article")');
  assert.ok(warned.html, "warnings do not stop rendering");
});

test("unknown methods are named with suggestions", () => {
  const result = compileDocument(documentWith('main = document.chapter("T")'));
  const all = messages(result).join("\n");
  assert.ok(all.includes("Unknown method 'chapter'"), all);
  assert.ok(all.includes("section"), all);
});

test("method argument rules are enforced", () => {
  const arity = compileDocument(documentWith('main = document.section("S")', "main.paragraph()"));
  assert.ok(messages(arity).some((entry) => entry.includes("paragraph() expects at least one")));

  const badInline = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("See ", section("x"), ".")')
  );
  assert.ok(messages(badInline).some((entry) => entry.includes("block component")));

  const namedAfterPositional = compileDocument(
    documentWith(
      'main = document.section("S")',
      'main.equation(x = 1, label="eq:a", number=true)'
    )
  );
  assert.deepEqual(messages(namedAfterPositional), [], "named arguments in any order are fine");

  const misplaced = compileDocument(
    documentWith('main = document.section("S")', "main.equation(number=true, x = 1)")
  );
  assert.ok(
    messages(misplaced).some((entry) =>
      entry.includes("The named argument 'number' of equation() comes after the positional arguments")
    ),
    messages(misplaced).join("\n")
  );
});

test("tables validate their shape", () => {
  const ragged = compileDocument(
    documentWith('main = document.section("S")', 'main.table(["A", "B"], [["1"]])')
  );
  assert.ok(messages(ragged).some((entry) => entry.includes("same number of cells")));

  const empty = compileDocument(documentWith('main = document.section("S")', "main.table([])"));
  assert.ok(messages(empty).some((entry) => entry.includes("at least one row")));

  const badAlign = compileDocument(
    documentWith('main = document.section("S")', 'main.table(["A"], [["1"]], align="middle")')
  );
  assert.ok(messages(badAlign).some((entry) => entry.includes("Alignment must be")));
});

test("aligned() requires relations", () => {
  const bad = compileDocument(documentWith('main = document.section("S")', "main.aligned([x + y])"));
  assert.ok(messages(bad).some((entry) => entry.includes("must be a relation")));

  const good = compileDocument(
    documentWith(
      'main = document.section("S")',
      "main.aligned([x + y = 5, x - y = 1], number=true)"
    )
  );
  assert.deepEqual(messages(good), []);
  assert.ok(good.latex.includes("\\begin{aligned}"));
  assert.ok(good.html.includes("ms-aligned-table"));
});

test("bibliography entries are validated and citations resolve", () => {
  const missingField = compileDocument(
    documentWith(
      'refs = document.bibliography()',
      'refs.article("a", author="A", year=2024)',
      'main = document.section("S")',
      'main.paragraph("See ", cite("a"), ".")'
    )
  );
  assert.ok(messages(missingField).some((entry) => entry.includes("missing the required field 'title'")));

  const duplicate = compileDocument(
    documentWith(
      'refs = document.bibliography()',
      'refs.misc("a", author="A", title="T", year=1)',
      'refs.misc("a", author="B", title="U", year=2)'
    )
  );
  assert.ok(messages(duplicate).some((entry) => entry.includes("Duplicate bibliography key 'a'")));

  const unknownKey = compileDocument(
    documentWith(
      'main = document.section("S")',
      'main.paragraph("See ", cite("ghost"), ".")'
    )
  );
  assert.ok(messages(unknownKey).some((entry) => entry.includes("No bibliography entry with the key 'ghost'")));

  const auto = compileDocument(
    documentWith(
      'refs = document.bibliography()',
      'refs.book("b", author="A", title="T", year=2001, publisher="P")',
      'main = document.section("S")',
      'main.paragraph("See ", cite("b"), ".")'
    )
  );
  assert.deepEqual(messages(auto), []);
  assert.ok(auto.html.includes("References"));
});

test("templates change numbering and table of contents", () => {
  const report = compileDocument(
    'document = Document(type="report", title="R", author="A")\ndocument.section("One")\ndocument.section("Two")'
  );
  assert.deepEqual(messages(report), []);
  assert.ok(report.html.includes('class="ms-toc"'));
  assert.ok(report.latex.includes("\\tableofcontents"));

  const letter = compileDocument(
    'document = Document(type="letter", title="Dear reader", author="A")\nmain = document.section("Subject")\nmain.paragraph("Hello.")'
  );
  assert.deepEqual(errors(letter), []);
  assert.ok(!letter.html.includes("ms-section-number"), "letters are unnumbered");
  assert.ok(!letter.html.includes("ms-toc"));
  assert.ok(messages(letter).every((entry) => !entry.includes("no title")));
  assert.ok(messages(letter).some((entry) => entry.includes("letter template exports as a standard article")));
});

test("page configuration is validated and exported", () => {
  const landscape = compileDocument(
    'document = Document(type="presentation", title="S", author="A")\ndocument.paragraph("Slide content.")'
  );
  assert.deepEqual(errors(landscape), []);
  assert.equal(landscape.document.page.orientation, "landscape");
  assert.ok(messages(landscape).some((entry) => entry.includes("presentation template exports as a landscape article")));

  const columns = compileDocument(
    documentWith(
      'document.page(size="A5", columns=2, margin="10mm")',
      'main = document.section("S")',
      'main.paragraph("Two columns.")'
    )
  );
  assert.deepEqual(messages(columns), []);
  assert.equal(columns.document.page.size, "A5");
  assert.ok(columns.html.includes("--ms-columns: 2"));
  assert.ok(columns.latex.includes("\\begin{multicols}{2}"));
  assert.ok(columns.latex.includes("margin=10.00mm"));

  const badSize = compileDocument(documentWith('document.page(size="B5")'));
  assert.ok(messages(badSize).some((entry) => entry.includes("Unknown page size 'B5'")));

  const badMargin = compileDocument(documentWith('document.page(margin="big")'));
  assert.ok(messages(badMargin).some((entry) => entry.includes("not a valid length")));

  const badColumns = compileDocument(documentWith("document.page(columns=0)"));
  assert.ok(messages(badColumns).some((entry) => entry.includes("between 1 and 3")));
});

test("images validate their source and dimensions", () => {
  const badScheme = compileDocument(
    documentWith('fig = document.figure()', 'fig.image("javascript:alert(1)")')
  );
  assert.ok(messages(badScheme).some((entry) => entry.includes("unsupported scheme")));

  const badWidth = compileDocument(
    documentWith('fig = document.figure()', 'fig.image("plot.png", width="wide")')
  );
  assert.ok(messages(badWidth).some((entry) => entry.includes("not a valid length")));

  const ok = compileDocument(
    documentWith(
      'fig = document.figure(caption="A plot")',
      'fig.image("https://example.com/p.png", width="80%", alt="Plot")'
    )
  );
  assert.deepEqual(messages(ok), []);
  assert.ok(ok.html.includes('src="https://example.com/p.png"'));
  assert.ok(ok.html.includes("width: 80%"));
  assert.ok(ok.latex.includes("width=0.8\\textwidth"));
});

test("text escapes HTML and LaTeX special characters", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("50% of {a} & b_1 # x")')
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("50% of {a} &amp; b_1 # x"));
  assert.ok(result.latex.includes("50\\% of \\{a\\} \\& b\\_1 \\# x"));
});

test("code listings carry captions and languages", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("S")',
      'main.listing("const x = 1;", language="javascript", caption="A listing", label="lst:one")'
    )
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("Listing 1"));
  assert.ok(result.latex.includes("\\usepackage{listings}"));
  assert.ok(result.latex.includes("language=JavaScript"));
  assert.ok(result.latex.includes("label={lst:one}"));
});

test("page_break renders a separator and a newpage", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("S")',
      'main.paragraph("One.")',
      "main.page_break()",
      'main.paragraph("Two.")'
    )
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("ms-page-break"));
  assert.ok(result.latex.includes("\\newpage"));
});

test("a source without a Document call is not a document", () => {
  const result = compileDocument('main = document.section("Introduction")\nmain.paragraph("Hello.")');
  assert.ok(messages(result).some((entry) => entry.includes("needs a Document")));
  assert.equal(result.document, null);
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
    assert.ok(doc.signature.startsWith(`${doc.name}(`), `${doc.name} signature`);
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
    if (trimmed.startsWith("document = Document(")) return trimmed;
    return [
      'document = Document(type="article", title="Example", author="Docs")',
      'main = document.section("Example")',
      'refs = document.bibliography()',
      trimmed
    ].join("\n");
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

// A snippet is a statement, so it needs a document, a section, a figure, and
// a reference list to stand on.
const SNIPPET_PREAMBLE = [
  'document = Document(type="article", title="Snippet", author="Docs")',
  'main = document.section("Outer")',
  'fig = main.figure()',
  'refs = document.bibliography()'
].join("\n");

function wrapSnippet(name, source) {
  if (name === "Document") return source;
  return `${SNIPPET_PREAMBLE}\n${source}`;
}

test("component snippets are valid starter documents", () => {
  const snippets = COMPONENT_DOCS.filter((doc) => doc.snippet);
  assert.ok(snippets.length >= 10, "several components offer a starter snippet");

  for (const doc of snippets) {
    const markers = doc.snippet.match(/\$0/g) ?? [];
    assert.ok(markers.length <= 1, `${doc.name} snippet has more than one caret marker`);

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
  const prepared = prepareSnippet(COMPONENTS.Document.snippet);
  const result = compileDocument(prepared.text);
  assert.deepEqual(messages(result), [], "the scaffold compiles without diagnostics");
  assert.ok(result.document, "the scaffold builds a document");
});

test("snippet insertion indents continuation lines and places the caret", () => {
  const prepared = prepareSnippet('main.paragraph("",\n  "")', "  ");
  assert.equal(prepared.text, 'main.paragraph("",\n    "")');
  assert.equal(prepared.caret, prepared.text.length);

  const plain = prepareSnippet("main.page_break()");
  assert.equal(plain.text, "main.page_break()");
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

test("enumerated field values list every available option", () => {
  const byName = new Map(FIELD_DOCS.map((field) => [field.name, field]));

  for (const field of FIELD_DOCS) {
    const groups = field.valueGroups ?? (field.values ? [{ label: "Values", values: field.values }] : []);
    for (const group of groups) {
      assert.ok(group.label, `'${field.name}' value group needs a label`);
      assert.ok(group.values.length > 0, `'${field.name}' value group is empty`);
      for (const value of group.values) {
        assert.equal(typeof value, "string");
        assert.ok(value.length > 0, `'${field.name}' has an empty option`);
      }
    }
  }

  const type = byName.get("type");
  const groups = Object.fromEntries(type.valueGroups.map((group) => [group.label, group.values]));
  assert.deepEqual(groups["Document templates"], TEMPLATE_NAMES);
  assert.deepEqual(groups["Reference types"], Object.keys(BIBLIOGRAPHY_TYPES));

  assert.deepEqual(byName.get("size").values.map((value) => value.toUpperCase()).sort(), Object.keys(PAGE_SIZES).sort());
  assert.deepEqual(byName.get("orientation").values, ["portrait", "landscape"]);
  assert.deepEqual(byName.get("align").values, ["left", "center", "right"]);
  assert.deepEqual(byName.get("columns").values, ["1", "2", "3"]);
  assert.deepEqual(byName.get("number").values, ["true", "false"]);
});

test("field defaults name one of their own options and match the engine", () => {
  const byName = new Map(FIELD_DOCS.map((field) => [field.name, field]));

  for (const field of FIELD_DOCS) {
    const groups = field.valueGroups ?? (field.values ? [{ label: "Values", values: field.values }] : []);
    for (const group of groups) {
      if (group.defaultValue === undefined) continue;
      assert.ok(
        group.values.includes(group.defaultValue),
        `'${field.name}' default '${group.defaultValue}' is not one of its options`
      );
    }
    if (field.defaultValue === undefined) continue;
    const options = groups.flatMap((group) => group.values);
    if (options.length === 0) continue; // A free-form field lists no options.
    assert.ok(
      options.includes(field.defaultValue),
      `'${field.name}' default '${field.defaultValue}' is not one of its options`
    );
  }

  assert.equal(byName.get("size").defaultValue, DEFAULT_PAGE.size);
  assert.equal(byName.get("orientation").defaultValue, DEFAULT_PAGE.orientation);
  assert.equal(byName.get("columns").defaultValue, String(DEFAULT_PAGE.columns));
  for (const side of ["margin_top", "margin_right", "margin_bottom", "margin_left"]) {
    const key = side.slice("margin_".length);
    assert.equal(byName.get(side).defaultValue, DEFAULT_PAGE.margins[key]);
  }
  assert.equal(byName.get("align").defaultValue, "left");
  assert.equal(byName.get("number").defaultValue, "false");

  const typeGroups = Object.fromEntries(
    byName.get("type").valueGroups.map((group) => [group.label, group])
  );
  assert.equal(typeGroups["Document templates"].defaultValue, "article");
  assert.equal(typeGroups["Reference types"].defaultValue, "misc");
});

test("every bibliography type documents its required and optional fields", () => {
  const documented = new Set(FIELD_DOCS.map((field) => field.name));
  for (const [type, spec] of Object.entries(BIBLIOGRAPHY_TYPES)) {
    assert.ok(spec.required.length > 0, `${type} needs required fields`);
    for (const name of [...spec.required, ...spec.fields]) {
      assert.ok(documented.has(name), `${type} field '${name}' is not documented`);
    }
    for (const name of spec.required) {
      assert.ok(spec.fields.includes(name), `${type} required field '${name}' is not in its field list`);
    }
  }
  assert.deepEqual(Object.keys(BIBLIOGRAPHY_TYPES).sort(), [
    "article",
    "book",
    "inproceedings",
    "misc",
    "techreport",
    "website"
  ]);
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
