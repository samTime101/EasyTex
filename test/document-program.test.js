import test from "node:test";
import assert from "node:assert/strict";
import { compileDocument } from "../src/engine.js";
import { parseProgram } from "../src/parser.js";
import { COMPONENTS } from "../src/document/components.js";

function messages(result) {
  return result.diagnostics.map((entry) => `${entry.severity} ${entry.category}: ${entry.message}`);
}

function errors(result) {
  return result.diagnostics.filter((entry) => entry.severity !== "warning");
}

function kinds(result) {
  return result.document?.blocks.map((block) => block.kind) ?? [];
}

// A document with the given statements, plus the usual preamble.
function documentWith(...statements) {
  return [
    'document = Document(type="article", title="A Note", author="A")',
    ...statements
  ].join("\n");
}

// ------------------------------------------------------------------ parsing

test("the parser reads the four statement shapes", () => {
  const { statements, diagnostics } = parseProgram(`document = Document(type="article")
main = document.section("Introduction")
main.paragraph("Hello")
refs = document.bibliography()
refs.book("euler1748", author="L. Euler", year=1748)`);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(
    statements.map((statement) => statement.kind),
    ["Binding", "Binding", "MethodCall", "Binding", "MethodCall"]
  );
  assert.equal(statements[0].name, "document");
  assert.equal(statements[1].name, "main");
  assert.equal(statements[2].target, "main");
  assert.equal(statements[2].method, "paragraph");
  assert.equal(statements[4].method, "book");
});

test("a statement ends at a newline when the brackets are balanced", () => {
  const { statements } = parseProgram(`main.paragraph("one",
                "two")`);
  assert.equal(statements.length, 1);
  assert.equal(statements[0].arguments.length, 2);
});

test("a trailing comma is allowed", () => {
  const { statements, diagnostics } = parseProgram(`main.paragraph("one",)`);
  assert.deepEqual(diagnostics, []);
  assert.equal(statements[0].arguments.length, 1);
});

test("an expression on its own is not a document", () => {
  const { diagnostics } = parseProgram("sum(i, 1, n, i^2)");
  assert.match(diagnostics[0].message, /Document\(\.\.\.\)/);
});

test("a document call must be bound to a name", () => {
  const result = compileDocument('Document(type="article", title="T")');
  assert.match(messages(result).join(" "), /must be bound to a name/);
});

test("a document needs a Document call", () => {
  const result = compileDocument('main = document.section("S")');
  assert.match(messages(result).join(" "), /needs a Document/);
});

test("a name may only stand for a document or a block", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("hi")')
  );
  assert.deepEqual(messages(result), []);
  const unknown = compileDocument('main.paragraph("hi")');
  assert.match(messages(unknown).join(" "), /Unknown name 'main'/);
});

test("a name is never an assignment", () => {
  const result = compileDocument('document = Document(type="article", title="T")\nn = 5');
  assert.match(messages(result).join(" "), /not a statement|binding|Document/);
});

// ----------------------------------------------------------------- building

test("a document compiles, renders, and exports", () => {
  const result = compileDocument(documentWith('main = document.section("Introduction")', 'main.paragraph("Hello ", n, ".")'));
  assert.deepEqual(messages(result), []);
  assert.ok(result.document);
  assert.ok(result.html.includes('class="ms-sheet"'));
  assert.ok(result.html.includes("<math") || result.html.includes("Hello"));
  assert.ok(result.latex.startsWith("\\documentclass"));
});

test("the metadata of Document becomes the document metadata", () => {
  const result = compileDocument(
    'document = Document(type="report", title="T", subtitle="S", author="A", date="2026", language="en", keywords=["k"], abstract="An abstract.", affiliations="Somewhere")'
  );
  assert.deepEqual(messages(result), []);
  const metadata = result.document.metadata;
  assert.equal(metadata.title[0].value, "T");
  assert.equal(metadata.subtitle[0].value, "S");
  assert.deepEqual(metadata.author, ["A"]);
  assert.equal(metadata.date, "2026");
  assert.equal(metadata.language, "en");
  assert.deepEqual(metadata.keywords, ["k"]);
  assert.equal(metadata.abstract[0].value, "An abstract.");
  assert.deepEqual(metadata.affiliations, ["Somewhere"]);
});

test("the template of Document is applied", () => {
  const result = compileDocument('document = Document(type="thesis", title="T")');
  assert.equal(result.document.template.name, "thesis");
});

test("an unknown document type is a diagnostic", () => {
  const result = compileDocument('document = Document(type="novel", title="T")');
  assert.match(messages(result).join(" "), /Unknown document type 'novel'/);
});

test("a document without a title or an author warns", () => {
  const result = compileDocument('document = Document(type="article")');
  const warnings = result.diagnostics.filter((entry) => entry.severity === "warning");
  assert.equal(warnings.length, 2);
  assert.match(warnings[0].message, /no title/);
  assert.match(warnings[1].message, /no author/);
});

test("blocks are appended to the container they are called on", () => {
  const result = compileDocument(
    documentWith('main = document.section("One")', 'main.paragraph("a")', 'main.paragraph("b")')
  );
  assert.deepEqual(messages(result), []);
  assert.equal(kinds(result).length, 1);
  assert.equal(result.document.blocks[0].blocks.length, 2);
});

test("a section may hold a subsection, and a subsection a subsubsection", () => {
  const result = compileDocument(
    documentWith(
      'one = document.section("One")',
      'two = one.subsection("One one")',
      'three = two.subsubsection("One one one")',
      'three.paragraph("deep")'
    )
  );
  assert.deepEqual(messages(result), []);
  const section = result.document.blocks[0];
  assert.equal(section.blocks[0].kind, "section");
  assert.equal(section.blocks[0].blocks[0].level, 3);
});

test("a subsection outside a section is a diagnostic", () => {
  const result = compileDocument(documentWith('main = document.subsection("One")'));
  assert.match(messages(result).join(" "), /subsection/);
});

test("a theorem holds its statement and a proof", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("Results")',
      'th = main.theorem("Convergence", content="The sequence is bounded.", label="thm:conv")',
      'pr = main.proof(content="By comparison.")',
      'main.paragraph("Theorem ", ref("thm:conv"), " settles it.")'
    )
  );
  assert.deepEqual(messages(result), []);
  const blocks = result.document.blocks[0].blocks;
  assert.deepEqual(blocks.map((block) => block.kind), ["theorem", "proof", "paragraph"]);
  assert.equal(blocks[0].number, "1");
  assert.equal(blocks[0].label, "thm:conv");
});

test("a label is registered on the block that carries it", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("Results")',
      'main.equation(x = 1, number=true, label="eq:one")',
      'main.paragraph("See ", ref("eq:one"), ".")'
    )
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes('href="#ms-eq-one"'));
});

test("a duplicate label is a diagnostic", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("Results")',
      'main.equation(x = 1, number=true, label="eq:one")',
      'main.equation(x = 2, number=true, label="eq:one")'
    )
  );
  assert.match(messages(result).join(" "), /Duplicate label/);
});

test("an unresolved reference is a diagnostic", () => {
  const result = compileDocument(documentWith('main = document.section("S")', 'main.paragraph("See ", ref("eq:missing"), ".")'));
  assert.match(messages(result).join(" "), /Unresolved reference 'eq:missing'/);
});

test("a reference may point forward", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("Results")',
      'main.paragraph("See ", ref("eq:later"), ".")',
      'main.equation(x = 1, number=true, label="eq:later")'
    )
  );
  assert.deepEqual(messages(result), []);
});

test("a figure holds its image", () => {
  const result = compileDocument(
    documentWith(
      'main = document.section("Results")',
      'fig = main.figure(caption="A plot", label="fig:plot")',
      'fig.image("assets/plot.svg", width="70%", alt="A plot")',
      'main.paragraph("Figure ", ref("fig:plot"), ".")'
    )
  );
  assert.deepEqual(messages(result), []);
  const figure = result.document.blocks[0].blocks[0];
  assert.equal(figure.kind, "figure");
  assert.equal(figure.image.src, "assets/plot.svg");
  assert.equal(figure.image.width, "70%");
  assert.equal(figure.caption[0].value, "A plot");
});

// ------------------------------------------------------- arguments and names

test("the position of an argument decides what it is", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.equation(x = 1, number=true, label="eq:one")')
  );
  assert.deepEqual(messages(result), []);
  const equation = result.document.blocks[0].blocks[0];
  assert.equal(equation.expr.kind, "Relation", "the first argument is the relation");
  assert.equal(equation.number, "1", "the equation is numbered");
  assert.equal(equation.label, "eq:one");
});

test("an unknown named argument lists the valid ones", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.equation(x = 1, numbered=true)')
  );
  const message = messages(result).join(" ");
  assert.match(message, /Unknown named argument 'numbered'/);
  assert.match(message, /expected number, label/);
});

test("a named argument is given twice is a diagnostic", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.equation(x = 1, number=true, number=false)')
  );
  assert.match(messages(result).join(" "), /given more than once/);
});

test("a variadic method takes no named arguments", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("a", n, "b", label="x")')
  );
  assert.match(messages(result).join(" "), /paragraph\(\) takes no named arguments/);
});

test("an unknown method lists the valid ones", () => {
  const result = compileDocument(documentWith('main = document.chapter("One")'));
  const message = messages(result).join(" ");
  assert.match(message, /Unknown method 'chapter'/);
  assert.match(message, /expected/);
});

test("a method may not be used on the wrong container", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'fig = main.figure()', 'fig.image("x.svg")')
  );
  assert.deepEqual(messages(result), []);
  const wrong = compileDocument(documentWith('main = document.section("S")', 'main.image("x.svg")'));
  assert.match(messages(wrong).join(" "), /cannot be used on a section/);
});

test("every method declares its containers, its arity, and its names", () => {
  for (const [name, method] of Object.entries(COMPONENTS)) {
    assert.ok(Array.isArray(method.positional), `${name} declares its positional arguments`);
    assert.ok(Array.isArray(method.named), `${name} declares its named arguments`);
    assert.ok(Array.isArray(method.containers), `${name} declares its containers`);
    assert.ok(method.summary.length > 0, `${name} has a summary`);
  }
});

// -------------------------------------------------------------- page and refs

test("the page call configures the geometry", () => {
  const result = compileDocument(
    documentWith('document.page(size="A5", orientation="landscape", columns=2, margin="18mm")', 'main = document.section("S")')
  );
  assert.deepEqual(messages(result), []);
  assert.equal(result.document.page.size, "A5");
  assert.equal(result.document.page.orientation, "landscape");
  assert.equal(result.document.page.columns, 2);
  assert.equal(result.document.page.margins.top, "18mm");
});

test("a margin may be set on one side only", () => {
  const result = compileDocument(
    documentWith('document.page(margin="20mm", margin_top="30mm")', 'main = document.section("S")')
  );
  assert.deepEqual(messages(result), []);
  assert.equal(result.document.page.margins.top, "30mm");
  assert.equal(result.document.page.margins.left, "20mm");
});

test("an unknown page option is a diagnostic", () => {
  const result = compileDocument(documentWith('document.page(paper="A4")', 'main = document.section("S")'));
  assert.match(messages(result).join(" "), /named argument/);
});

test("a bibliography holds typed entries", () => {
  const result = compileDocument(
    documentWith(
      'refs = document.bibliography()',
      'refs.book("euler1748", author="L. Euler", title="Introductio", publisher="Bousquet", year=1748)',
      'refs.article("smith2024", author="J. Smith", title="On series", journal="J. Math.", year=2024)',
      'main = document.section("Text")',
      'main.paragraph("Following ", cite("smith2024"), " and ", cite("euler1748"), ".")'
    )
  );
  assert.deepEqual(messages(result), []);
  assert.equal(result.document.bibliography.length, 2);
  assert.equal(result.document.bibliography[0].type, "book");
  assert.ok(result.html.includes('href="#bib-smith2024"'));
});

test("a reference entry needs the fields of its type", () => {
  const result = compileDocument(
    documentWith('refs = document.bibliography()', 'refs.article("smith2024", author="J. Smith", title="On series", year=2024)')
  );
  assert.match(messages(result).join(" "), /missing the required field 'journal'/);
});

test("a reference entry needs a key", () => {
  const result = compileDocument(
    documentWith('refs = document.bibliography()', 'refs.book(author="L. Euler", title="Introductio", publisher="Bousquet", year=1748)')
  );
  assert.match(messages(result).join(" "), /only positional argument|key/);
});

test("a duplicate reference key is a diagnostic", () => {
  const result = compileDocument(
    documentWith(
      'refs = document.bibliography()',
      'refs.book("key", author="A", title="T", publisher="P", year=2000)',
      'refs.book("key", author="B", title="U", publisher="Q", year=2001)'
    )
  );
  assert.match(messages(result).join(" "), /Duplicate bibliography key/);
});

test("a citation of a missing entry is a diagnostic", () => {
  const result = compileDocument(
    documentWith('refs = document.bibliography()', 'main = document.section("S")', 'main.paragraph("See ", cite("missing"), ".")')
  );
  assert.match(messages(result).join(" "), /No bibliography entry with the key 'missing'/);
});

test("a reference entry is not a block", () => {
  const result = compileDocument(
    documentWith('refs = document.bibliography()', 'main = document.section("S")', 'main.book("k", author="A", title="T", publisher="P", year=2000)')
  );
  assert.match(messages(result).join(" "), /'book' cannot be used on a section/);
});

// ------------------------------------------------------------------ the list

test("a list of items is a list block", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.bullets(["One", "Two"])', 'main.numbered(["Three"])')
  );
  assert.deepEqual(messages(result), []);
  const blocks = result.document.blocks[0].blocks;
  assert.equal(blocks[0].kind, "list");
  assert.equal(blocks[0].items.length, 2);
  assert.equal(blocks[1].ordered, true);
});

test("a table takes a header and rows", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.table(["A", "B"], [[1, 2]], caption="A table", label="tab:one", align=["left", "right"])')
  );
  assert.deepEqual(messages(result), []);
  const table = result.document.blocks[0].blocks[0];
  assert.equal(table.kind, "table");
  assert.equal(table.rows.length, 1);
  assert.equal(table.caption[0].value, "A table");
});

test("a table with a ragged row is a diagnostic", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.table(["A", "B"], [[1]])')
  );
  assert.ok(messages(result).length > 0);
});

test("aligned takes a list of relations", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.aligned([x + y = 5, x - y = 1], number=true)')
  );
  assert.deepEqual(messages(result), []);
  const aligned = result.document.blocks[0].blocks[0];
  assert.equal(aligned.kind, "aligned");
  assert.equal(aligned.number, "1");
});

test("aligned rejects a row that is not a relation", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.aligned([x + y])')
  );
  assert.ok(messages(result).length > 0);
});

test("a listing carries its language and caption", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.listing("let x = 1;", language="javascript", caption="A listing")')
  );
  assert.deepEqual(messages(result), []);
  const listing = result.document.blocks[0].blocks[0];
  assert.equal(listing.kind, "listing");
  assert.equal(listing.language, "javascript");
});

test("a page break is a block", () => {
  const result = compileDocument(documentWith('main = document.section("S")', "main.page_break()"));
  assert.deepEqual(messages(result), []);
  assert.equal(result.document.blocks[0].blocks[0].kind, "page_break");
});

test("inline components are only inline", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("Prose ", bold("bold"), " and ", inline(sum(i, 1, n, i^2)), ".")')
  );
  assert.deepEqual(messages(result), []);
  const paragraph = result.document.blocks[0].blocks[0];
  assert.equal(paragraph.kind, "paragraph");
  assert.equal(paragraph.content.length, 5);
});

test("a block component may not be used as inline content", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("See ", section("x"), ".")')
  );
  assert.ok(messages(result).length > 0);
});

test("a string in a mathematical expression is a type error", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.equation("text", number=true)')
  );
  assert.ok(messages(result).length > 0);
});

test("text escapes HTML and LaTeX special characters", () => {
  const result = compileDocument(
    documentWith('main = document.section("S")', 'main.paragraph("A & B < C, 100% of $5.")')
  );
  assert.deepEqual(messages(result), []);
  assert.ok(result.html.includes("&amp;"));
  assert.ok(result.latex.includes("\\&"));
});
