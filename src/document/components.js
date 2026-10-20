// The document method catalogue.
//
// This catalogue is the shared source of truth for the document builder, the
// reference page, hover help, and editor completion. Every entry in
// COMPONENTS must be interpreted by src/document/build.js; the test suite
// enforces that they do not drift apart.
//
// A document is a program of statements:
//
//   document = Document(type="article", title="…")
//   main = document.section("Introduction")
//   main.paragraph("The sum is ", inline(sum(i, 1, n, i^2)), ".")
//
// A method belongs to the containers listed in `containers`, takes the number
// of positional arguments listed in `positional`, and accepts the named
// arguments listed in `named`. The `containers` and `positional` fields are
// what let the parser decide, by position, whether an `=` is the equality
// relation or a named argument.
//
// Entries may carry a `snippet`: the starter source inserted when the method
// is accepted from autocomplete. A snippet may contain one "$0" marker; the
// editor removes it and places the caret there. Every snippet is a valid
// fragment of a document, checked by the test suite.

export const COMPONENT_CATEGORY_ORDER = [
  "Document",
  "Document structure",
  "Prose",
  "Mathematics blocks",
  "Tables and figures",
  "Academic structures",
  "References"
];

// The kinds of node a method may be called on.
export const CONTAINER_KINDS = {
  document: "the document",
  section: "a section",
  subsection: "a subsection",
  subsubsection: "a subsubsection",
  theorem: "a theorem",
  proof: "a proof",
  quote: "a quotation",
  figure: "a figure",
  references: "a reference list"
};

const EVERY_CONTAINER = ["document", "section", "subsection", "subsubsection"];
const PROSE_CONTAINERS = [
  "document",
  "section",
  "subsection",
  "subsubsection",
  "theorem",
  "proof",
  "quote"
];

export const COMPONENTS = {
  Document: {
    name: "Document",
    category: "Document",
    role: "document",
    containers: [],
    positional: [0],
    signature: 'Document(type="article", title="…", author="…")',
    summary: "The top-level declaration of a document: metadata plus ordered content blocks.",
    description:
      "Every MathScript document is one Document(...) call, bound to a name. The metadata is written as named arguments; the blocks are appended to the document with methods.",
    args: [],
    named: [
      { name: "type", type: "string", description: "The template: article, report, academic_report, thesis, book, presentation, technical_document, or letter." },
      { name: "title", type: "string", description: "The document title." },
      { name: "subtitle", type: "string", description: "A subtitle, shown under the title." },
      { name: "author", type: "string", description: "An author. Give it more than once for several authors." },
      { name: "date", type: "string", description: "The date, written as you want it to read." },
      { name: "language", type: "string", description: "The document language, used by the HTML and LaTeX exports." },
      { name: "keywords", type: "list of strings", description: "Keywords, for the metadata of the export." },
      { name: "abstract", type: "string", description: "The abstract. Give it more than once for several paragraphs." },
      { name: "affiliations", type: "string", description: "An affiliation. Give it more than once for several." }
    ],
    snippet: 'document = Document(type="article", title="Untitled document", author="Your Name")',
    examples: [
      {
        note: "A document with metadata",
        source: 'document = Document(type="article", title="A Short Note", author="Example Author")'
      }
    ],
    status: "implemented"
  },

  page: {
    name: "page",
    category: "Document",
    role: "setting",
    containers: ["document"],
    positional: [0],
    signature: 'page(size="A4", orientation="portrait", columns=1, margin="25mm")',
    summary: "Page geometry for the whole document.",
    description:
      "Document layout is declarative. Page configuration appears on the document; the defaults are usable without any configuration. Layout never changes the mathematical meaning of an expression.",
    args: [],
    named: [
      { name: "size", type: "string", description: "The paper size: A3, A4, A5, Letter, or Legal." },
      { name: "orientation", type: "string", description: "portrait or landscape." },
      { name: "columns", type: "number", description: "The number of text columns, from 1 to 3." },
      { name: "margin", type: "string", description: "The margin on every side, written as a length such as \"25mm\"." },
      { name: "margin_top", type: "string", description: "The top margin, when it differs from the others." },
      { name: "margin_right", type: "string", description: "The right margin, when it differs from the others." },
      { name: "margin_bottom", type: "string", description: "The bottom margin, when it differs from the others." },
      { name: "margin_left", type: "string", description: "The left margin, when it differs from the others." }
    ],
    snippet: 'document.page(size="A4", orientation="portrait", margin="25mm")',
    examples: [
      {
        note: "A4 with wide margins",
        source: 'document.page(size="A4", margin="30mm")'
      }
    ],
    status: "implemented"
  },

  section: {
    name: "section",
    category: "Document structure",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'section("Introduction", content="…")',
    summary: "A numbered section of the document.",
    description:
      "Sections are numbered by the engine and collected in the table of contents. A section may hold a paragraph of prose as its content, or be filled with blocks afterwards.",
    args: [
      { name: "title", type: "string", description: "The section title." },
      { name: "content", type: "string", description: "The opening paragraph of the section." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the section." },
      { name: "label", type: "string", description: "A stable name, so the section can be referenced." }
    ],
    snippet: 'main = document.section("Section title")',
    examples: [
      {
        note: "A section with an opening paragraph",
        source: 'main = document.section("Introduction")\nmain.paragraph("The sum of the first ", n, " squares is written ", inline(sum(i, 1, n, i^2)), ".")'
      }
    ],
    status: "implemented"
  },

  subsection: {
    name: "subsection",
    category: "Document structure",
    role: "block",
    containers: ["section"],
    positional: [1],
    signature: 'subsection("Title", content="…")',
    summary: "A numbered subsection of a section.",
    description:
      "Subsections are numbered under their section and collected in the table of contents. Never type numbers into a heading; the template manages the counters.",
    args: [
      { name: "title", type: "string", description: "The subsection title." },
      { name: "content", type: "string", description: "The opening paragraph of the subsection." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the subsection." },
      { name: "label", type: "string", description: "A stable name, so the subsection can be referenced." }
    ],
    snippet: 'sub = main.subsection("Subsection title")',
    examples: [
      {
        note: "A subsection",
        source: 'sub = main.subsection("Convergence")\nsub.equation(integral(x, 0, n, x^2) = frac(n^3, 3), number=true, label="eq:integral")\nsub.paragraph("Equation ", ref("eq:integral"), " shows the cubic behaviour.")'
      }
    ],
    status: "implemented"
  },

  subsubsection: {
    name: "subsubsection",
    category: "Document structure",
    role: "block",
    containers: ["subsection"],
    positional: [1],
    signature: 'subsubsection("Title", content="…")',
    summary: "A numbered subsubsection of a subsection.",
    description:
      "Subsubsections are the third level of the heading hierarchy. The template manages the numbering.",
    args: [
      { name: "title", type: "string", description: "The subsubsection title." },
      { name: "content", type: "string", description: "The opening paragraph of the subsubsection." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the subsubsection." },
      { name: "label", type: "string", description: "A stable name, so the subsubsection can be referenced." }
    ],
    snippet: 'sub = main.subsection("Inner")\ndeep = sub.subsubsection("Subsubsection title")',
    examples: [
      {
        note: "A subsubsection",
        source: 'sub = main.subsection("Inner")\ndeep = sub.subsubsection("Details")\ndeep.paragraph("The details follow.")'
      }
    ],
    status: "implemented"
  },

  paragraph: {
    name: "paragraph",
    category: "Prose",
    role: "block",
    containers: PROSE_CONTAINERS,
    positional: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    variadic: true,
    signature: 'paragraph("…", inline(x), "…")',
    summary: "A paragraph of prose, with mathematics mixed in.",
    description:
      "A paragraph takes any number of pieces: text strings and inline expressions, in the order they should read. It takes no named arguments.",
    args: [
      {
        name: "content",
        type: "string, inline component, or expression",
        description: "The pieces of the paragraph, in reading order."
      }
    ],
    named: [],
    snippet: 'main.paragraph("")',
    examples: [
      {
        note: "Prose with mathematics",
        source: 'main.paragraph("The series ", inline(sum(i, 1, n, i^2)), " grows cubically.")'
      }
    ],
    status: "implemented"
  },

  equation: {
    name: "equation",
    category: "Mathematics blocks",
    role: "block",
    containers: PROSE_CONTAINERS,
    positional: [1],
    signature: "equation(expression, number=true, label=\"eq:…\")",
    summary: "A display equation.",
    description:
      "An equation is numbered by the engine. Never type a number into it; the template manages the counter, and a label gives the equation a name that ref(...) can point at.",
    args: [{ name: "expression", type: "expression", description: "The mathematics, which may be a relation such as a = b." }],
    named: [
      { name: "number", type: "boolean", description: "Number the equation (default false)." },
      { name: "label", type: "string", description: "A stable name, so the equation can be referenced." }
    ],
    snippet: 'main.equation(x = 1, number=true)',
    examples: [
      {
        note: "A numbered equation",
        source: 'main.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")'
      }
    ],
    status: "implemented"
  },

  aligned: {
    name: "aligned",
    category: "Mathematics blocks",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'aligned([a = b, c = d], number=true)',
    summary: "Several equations, aligned on their relation signs.",
    description:
      "Every row of an aligned block must be a relation. The renderer aligns the rows on the relation signs.",
    args: [{ name: "rows", type: "list of relations", description: "The equations of the block." }],
    named: [
      { name: "number", type: "boolean", description: "Number the block (default false)." },
      { name: "label", type: "string", description: "A stable name, so the block can be referenced." }
    ],
    snippet: 'main.aligned([x + y = 5, x - y = 1], number=true)',
    examples: [
      {
        note: "A system of equations",
        source: 'main.aligned([x + y = 5, 2*x - y = 4], number=true, label="eq:lin")'
      }
    ],
    status: "implemented"
  },

  table: {
    name: "table",
    category: "Tables and figures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [2],
    signature: 'table(["A", "B"], [[1, 2]], caption="…")',
    summary: "A table with a header row.",
    description:
      "A table takes a header list and a list of rows. Cells may be strings or mathematical expressions.",
    args: [
      { name: "header", type: "list of cells", description: "The header row." },
      { name: "rows", type: "list of rows", description: "The body of the table." }
    ],
    named: [
      { name: "caption", type: "string", description: "The caption under the table." },
      { name: "label", type: "string", description: "A stable name, so the table can be referenced." },
      { name: "align", type: "list of strings", description: "The alignment of each column: left, center, or right." }
    ],
    snippet: 'main.table(["A", "B"], [[1, 2]], caption="A table")',
    examples: [
      {
        note: "A small table",
        source: 'main.table(["n", "sum(i, 1, n, i^2)"], [[1, 1], [2, 5]], caption="Small values", label="tab:values", align=["center", "right"])'
      }
    ],
    status: "implemented"
  },

  figure: {
    name: "figure",
    category: "Tables and figures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [0],
    signature: 'figure(caption="…", label="fig:…")',
    summary: "A figure, holding one image.",
    description:
      "A figure is a container: bind it, then add its image with the image method.",
    args: [],
    named: [
      { name: "caption", type: "string", description: "The caption under the figure." },
      { name: "label", type: "string", description: "A stable name, so the figure can be referenced." }
    ],
    snippet: 'fig = main.figure(caption="A figure")',
    examples: [
      {
        note: "A figure with an image",
        source: 'fig = main.figure(caption="Growth of the sum of squares", label="fig:growth")\nfig.image("assets/sum-of-squares.svg", width="70%", alt="Growth of the sum of squares")'
      }
    ],
    status: "implemented"
  },

  image: {
    name: "image",
    category: "Tables and figures",
    role: "block",
    containers: ["figure"],
    positional: [1],
    signature: 'image("assets/plot.svg", width="70%", alt="…")',
    summary: "An image inside a figure.",
    description:
      "The path is relative to the page that holds it. A missing image is reported as a readable placeholder instead of a broken icon.",
    args: [{ name: "src", type: "string", description: "The path of the image." }],
    named: [
      { name: "width", type: "string", description: "The width, for example \"70%\"." },
      { name: "height", type: "string", description: "The height, for example \"4cm\"." },
      { name: "alt", type: "string", description: "The description of the image for anyone who cannot see it." }
    ],
    snippet: 'fig.image("assets/plot.svg", alt="A plot")',
    examples: [
      {
        note: "An image with a caption",
        source: 'fig = main.figure(caption="Growth", label="fig:growth")\nfig.image("assets/sum-of-squares.svg", width="70%", alt="Growth of the sum of squares")'
      }
    ],
    status: "implemented"
  },

  listing: {
    name: "listing",
    category: "Mathematics blocks",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'listing("code", language="javascript", caption="…")',
    summary: "A block of code.",
    description:
      "The source is written as a string, with \\n for a line break. The language is only used to label the block.",
    args: [{ name: "source", type: "string", description: "The code, with \\n for a line break." }],
    named: [
      { name: "language", type: "string", description: "The language of the code, for the caption." },
      { name: "caption", type: "string", description: "The caption under the listing." },
      { name: "label", type: "string", description: "A stable name, so the listing can be referenced." }
    ],
    snippet: 'main.listing("")',
    examples: [
      {
        note: "A listing of code",
        source: 'main.listing("let total = 0;\\nfor (let i = 1; i <= n; i += 1) total += i * i;", language="javascript", caption="Summing squares in linear time", label="lst:sum")'
      }
    ],
    status: "implemented"
  },

  theorem: {
    name: "theorem",
    category: "Academic structures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'theorem("Title", content="…", label="thm:…")',
    summary: "A numbered theorem.",
    description:
      "A theorem is a container: bind it, then add its paragraphs and equations. The environment is numbered by the engine.",
    args: [
      { name: "title", type: "string", description: "The title of the theorem." },
      { name: "content", type: "string", description: "The statement of the theorem." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the theorem." },
      { name: "label", type: "string", description: "A stable name, so the theorem can be referenced." }
    ],
    snippet: 'th = main.theorem("Title")',
    examples: [
      {
        note: "A theorem with a proof",
        source: 'th = main.theorem("Convergence", content="The sequence is bounded above.", label="thm:conv")\npr = main.proof(content="Compare with the telescoping series.")\nmain.paragraph("Theorem ", ref("thm:conv"), " settles the question.")'
      }
    ],
    status: "implemented"
  },

  lemma: {
    name: "lemma",
    category: "Academic structures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'lemma("Title", content="…", label="lem:…")',
    summary: "A numbered lemma.",
    description:
      "A lemma is numbered in its own sequence, separately from the theorems.",
    args: [
      { name: "title", type: "string", description: "The title of the lemma." },
      { name: "content", type: "string", description: "The statement of the lemma." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the lemma." },
      { name: "label", type: "string", description: "A stable name, so the lemma can be referenced." }
    ],
    snippet: 'lem = main.lemma("Title")',
    examples: [
      {
        note: "A lemma",
        source: 'lem = main.lemma("Bounded terms", content="Each term of the sum is at most the reciprocal square.")'
      }
    ],
    status: "implemented"
  },

  definition: {
    name: "definition",
    category: "Academic structures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'definition("Title", content="…", label="def:…")',
    summary: "A numbered definition.",
    description:
      "A definition is numbered in its own sequence, separately from the theorems.",
    args: [
      { name: "title", type: "string", description: "The title of the definition." },
      { name: "content", type: "string", description: "The statement of the definition." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the definition." },
      { name: "label", type: "string", description: "A stable name, so the definition can be referenced." }
    ],
    snippet: 'd = main.definition("Title")',
    examples: [
      {
        note: "A definition",
        source: 'd = main.definition("Partial sums", content="For a positive integer n, write S(n) for the partial sum of the reciprocal squares.")'
      }
    ],
    status: "implemented"
  },

  corollary: {
    name: "corollary",
    category: "Academic structures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'corollary("Title", content="…", label="cor:…")',
    summary: "A numbered corollary.",
    description:
      "A corollary is numbered in its own sequence, separately from the theorems.",
    args: [
      { name: "title", type: "string", description: "The title of the corollary." },
      { name: "content", type: "string", description: "The statement of the corollary." }
    ],
    named: [
      { name: "content", type: "string", description: "The opening paragraph of the corollary." },
      { name: "label", type: "string", description: "A stable name, so the corollary can be referenced." }
    ],
    snippet: 'c = main.corollary("Title")',
    examples: [
      {
        note: "A corollary",
        source: 'c = main.corollary("A consequence", content="The bound follows from the theorem.")'
      }
    ],
    status: "implemented"
  },

  proof: {
    name: "proof",
    category: "Academic structures",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [0],
    signature: 'proof(content="…", title="Proof")',
    summary: "The proof of a theorem.",
    description:
      "A proof is a container: bind it, then add its steps. It takes an optional opening paragraph of prose.",
    args: [{ name: "content", type: "string", description: "The opening line of the proof." }],
    named: [
      { name: "content", type: "string", description: "The opening line of the proof." },
      { name: "title", type: "string", description: "The heading of the proof, for example \"Proof by induction\"." }
    ],
    snippet: 'pr = main.proof()',
    examples: [
      {
        note: "A proof",
        source: 'pr = main.proof(content="Compare the series with a telescoping one, whose terms are smaller.")'
      }
    ],
    status: "implemented"
  },

  quote: {
    name: "quote",
    category: "Prose",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [0],
    signature: 'quote(content="…")',
    summary: "A quotation, set apart from the prose.",
    description:
      "A quote is a container: bind it, then add its paragraphs.",
    args: [],
    named: [{ name: "content", type: "string", description: "The quoted text." }],
    snippet: 'q = main.quote()',
    examples: [
      {
        note: "A quotation",
        source: 'q = main.quote()\nq.paragraph("The purpose of computing is insight, not numbers.")'
      }
    ],
    status: "implemented"
  },

  bullets: {
    name: "bullets",
    category: "Prose",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'bullets(["First item", "Second item"])',
    summary: "A list of bullet points.",
    description:
      "Each item of the list is one piece of prose. A list item that mixes prose and mathematics is a paragraph, not a list item.",
    args: [{ name: "items", type: "list of strings", description: "The items of the list." }],
    named: [],
    snippet: 'main.bullets(["First item"])',
    examples: [
      {
        note: "A bullet list",
        source: 'main.bullets(["Numbering is automatic.", "References are checked.", "Exports are plain LaTeX."])'
      }
    ],
    status: "implemented"
  },

  numbered: {
    name: "numbered",
    category: "Prose",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [1],
    signature: 'numbered(["First item", "Second item"])',
    summary: "A list numbered by the engine.",
    description:
      "Each item of the list is one piece of prose. The engine numbers the items.",
    args: [{ name: "items", type: "list of strings", description: "The items of the list." }],
    named: [],
    snippet: 'main.numbered(["First item"])',
    examples: [
      {
        note: "A numbered list",
        source: 'main.numbered(["The identity holds for n = 1.", "The right-hand side is a polynomial of degree three."])'
      }
    ],
    status: "implemented"
  },

  page_break: {
    name: "page_break",
    category: "Document structure",
    role: "block",
    containers: EVERY_CONTAINER,
    positional: [0],
    signature: "page_break()",
    summary: "A page break.",
    description:
      "The break is placed where the statement stands. It takes no arguments.",
    args: [],
    named: [],
    snippet: "main.page_break()",
    examples: [
      {
        note: "A page break",
        source: 'main.page_break()\nmain.paragraph("The appendix starts here.")'
      }
    ],
    status: "implemented"
  },

  bibliography: {
    name: "bibliography",
    category: "References",
    role: "setting",
    containers: ["document"],
    positional: [0],
    signature: 'bibliography()',
    summary: "The reference list of the document.",
    description:
      "A bibliography is a container: bind it, then add one entry per reference, with the method named after the type.",
    args: [],
    named: [],
    snippet: 'refs = document.bibliography()',
    examples: [
      {
        note: "A bibliography with two entries",
        source: 'refs = document.bibliography()\nrefs.book("euler1748", author="L. Euler", title="Introductio in analysin infinitorum", publisher="Bousquet", year=1748)\nrefs.article("smith2024", author="J. Smith", title="On a series identity", journal="Journal of Examples", volume=12, pages="34-56", year=2024)'
      }
    ],
    status: "implemented"
  },

  book: {
    name: "book",
    category: "References",
    role: "reference",
    containers: ["references"],
    positional: [1],
    signature: 'book("key", author="…", title="…", publisher="…", year=…)',
    summary: "A book in the reference list.",
    description:
      "The key is the name cite(...) uses. A book needs an author, a title, a year, and a publisher.",
    args: [{ name: "key", type: "string", description: "The name of the entry, used by cite(...). It must be unique." }],
    named: [
      { name: "author", type: "string", description: "The author of the book." },
      { name: "title", type: "string", description: "The title of the book." },
      { name: "year", type: "number", description: "The year of publication." },
      { name: "publisher", type: "string", description: "The publisher." },
      { name: "edition", type: "string", description: "The edition." },
      { name: "address", type: "string", description: "The place of publication." },
      { name: "doi", type: "string", description: "The digital object identifier." },
      { name: "url", type: "string", description: "A link to the book." }
    ],
    snippet: 'refs.book("key", author="…", title="…", publisher="…", year=2026)',
    examples: [
      {
        note: "A book",
        source: 'refs.book("euler1748", author="L. Euler", title="Introductio in analysin infinitorum", publisher="Bousquet", year=1748)'
      }
    ],
    status: "implemented"
  },

  article: {
    name: "article",
    category: "References",
    role: "reference",
    containers: ["references"],
    positional: [1],
    signature: 'article("key", author="…", title="…", journal="…", year=…)',
    summary: "A journal article in the reference list.",
    description:
      "The key is the name cite(...) uses. An article needs an author, a title, a year, and a journal.",
    args: [{ name: "key", type: "string", description: "The name of the entry, used by cite(...). It must be unique." }],
    named: [
      { name: "author", type: "string", description: "The author of the article." },
      { name: "title", type: "string", description: "The title of the article." },
      { name: "year", type: "number", description: "The year of publication." },
      { name: "journal", type: "string", description: "The journal the article appeared in." },
      { name: "volume", type: "number", description: "The volume of the journal." },
      { name: "issue", type: "number", description: "The issue of the volume." },
      { name: "pages", type: "string", description: "The page range." },
      { name: "doi", type: "string", description: "The digital object identifier." },
      { name: "url", type: "string", description: "A link to the article." }
    ],
    snippet: 'refs.article("key", author="…", title="…", journal="…", year=2026)',
    examples: [
      {
        note: "An article",
        source: 'refs.article("smith2024", author="J. Smith", title="On a series identity", journal="Journal of Examples", volume=12, pages="34-56", year=2024)'
      }
    ],
    status: "implemented"
  },

  inproceedings: {
    name: "inproceedings",
    category: "References",
    role: "reference",
    containers: ["references"],
    positional: [1],
    signature: 'inproceedings("key", author="…", title="…", booktitle="…", year=…)',
    summary: "A conference paper in the reference list.",
    description:
      "The key is the name cite(...) uses. A conference paper needs an author, a title, a year, and the proceedings it appeared in.",
    args: [{ name: "key", type: "string", description: "The name of the entry, used by cite(...). It must be unique." }],
    named: [
      { name: "author", type: "string", description: "The author of the paper." },
      { name: "title", type: "string", description: "The title of the paper." },
      { name: "year", type: "number", description: "The year of the conference." },
      { name: "booktitle", type: "string", description: "The proceedings the paper appeared in." },
      { name: "pages", type: "string", description: "The page range." },
      { name: "publisher", type: "string", description: "The publisher of the proceedings." },
      { name: "doi", type: "string", description: "The digital object identifier." },
      { name: "url", type: "string", description: "A link to the paper." }
    ],
    snippet: 'refs.inproceedings("key", author="…", title="…", booktitle="…", year=2026)',
    examples: [
      {
        note: "A conference paper",
        source: 'refs.inproceedings("knuth1984", author="D. E. Knuth", title="Literate programming", booktitle="The Computer Modern Typesetter", year=1984)'
      }
    ],
    status: "implemented"
  },

  website: {
    name: "website",
    category: "References",
    role: "reference",
    containers: ["references"],
    positional: [1],
    signature: 'website("key", author="…", title="…", url="…", year=…)',
    summary: "A website in the reference list.",
    description:
      "The key is the name cite(...) uses. A website needs an author, a title, a year, and a link.",
    args: [{ name: "key", type: "string", description: "The name of the entry, used by cite(...). It must be unique." }],
    named: [
      { name: "author", type: "string", description: "The author of the page." },
      { name: "title", type: "string", description: "The title of the page." },
      { name: "year", type: "number", description: "The year of publication." },
      { name: "url", type: "string", description: "The address of the page." },
      { name: "note", type: "string", description: "A note about the entry." }
    ],
    snippet: 'refs.website("key", author="…", title="…", url="…", year=2026)',
    examples: [
      {
        note: "A website",
        source: 'refs.website("spec", author="The EasyTeX Team", title="The MathScript specification", url="https://example.org", year=2026)'
      }
    ],
    status: "implemented"
  },

  techreport: {
    name: "techreport",
    category: "References",
    role: "reference",
    containers: ["references"],
    positional: [1],
    signature: 'techreport("key", author="…", title="…", institution="…", year=…)',
    summary: "A technical report in the reference list.",
    description:
      "The key is the name cite(...) uses. A report needs an author, a title, a year, and the institution that published it.",
    args: [{ name: "key", type: "string", description: "The name of the entry, used by cite(...). It must be unique." }],
    named: [
      { name: "author", type: "string", description: "The author of the report." },
      { name: "title", type: "string", description: "The title of the report." },
      { name: "year", type: "number", description: "The year of the report." },
      { name: "institution", type: "string", description: "The institution that published the report." },
      { name: "number", type: "string", description: "The report number." },
      { name: "url", type: "string", description: "A link to the report." }
    ],
    snippet: 'refs.techreport("key", author="…", title="…", institution="…", year=2026)',
    examples: [
      {
        note: "A technical report",
        source: 'refs.techreport("knuth1984", author="D. E. Knuth", title="Literate programming", institution="Stanford University", number="CS-104", year=1984)'
      }
    ],
    status: "implemented"
  },

  misc: {
    name: "misc",
    category: "References",
    role: "reference",
    containers: ["references"],
    positional: [1],
    signature: 'misc("key", author="…", title="…", year=…)',
    summary: "A reference that fits no other type.",
    description:
      "The key is the name cite(...) uses. A miscellaneous reference needs an author, a title, and a year.",
    args: [{ name: "key", type: "string", description: "The name of the entry, used by cite(...). It must be unique." }],
    named: [
      { name: "author", type: "string", description: "The author of the work." },
      { name: "title", type: "string", description: "The title of the work." },
      { name: "year", type: "number", description: "The year of the work." },
      { name: "note", type: "string", description: "A note about the entry." },
      { name: "url", type: "string", description: "A link to the work." }
    ],
    snippet: 'refs.misc("key", author="…", title="…", year=2026)',
    examples: [
      {
        note: "A miscellaneous reference",
        source: 'refs.misc("notes", author="The EasyTeX Team", title="Working notes", year=2026, note="Unpublished")'
      }
    ],
    status: "implemented"
  },

  bold: {
    name: "bold",
    category: "Prose",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'bold("text")',
    summary: "Bold text.",
    description: "Inline content, written as a string or as another inline expression.",
    args: [{ name: "content", type: "string or inline content", description: "The text to embolden." }],
    named: [],
    snippet: 'main.paragraph("Prose can be ", bold("text"), ".")',
    examples: [{ note: "Bold text", source: 'main.paragraph("Prose can be ", bold("bold"), ".")' }],
    status: "implemented"
  },

  italic: {
    name: "italic",
    category: "Prose",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'italic("text")',
    summary: "Italic text.",
    description: "Inline content, written as a string or as another inline expression.",
    args: [{ name: "content", type: "string or inline content", description: "The text to italicise." }],
    named: [],
    snippet: 'main.paragraph("Prose can be ", italic("text"), ".")',
    examples: [{ note: "Italic text", source: 'main.paragraph("Prose can be ", italic("italic"), ".")' }],
    status: "implemented"
  },

  underline: {
    name: "underline",
    category: "Prose",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'underline("text")',
    summary: "Underlined text.",
    description: "Inline content, written as a string or as another inline expression.",
    args: [{ name: "content", type: "string or inline content", description: "The text to underline." }],
    named: [],
    snippet: 'main.paragraph("Prose can be ", underline("text"), ".")',
    examples: [{ note: "Underlined text", source: 'main.paragraph("Prose can be ", underline("underline"), ".")' }],
    status: "implemented"
  },

  emphasis: {
    name: "emphasis",
    category: "Prose",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'emphasis("text")',
    summary: "Emphasised text.",
    description: "Inline content, written as a string or as another inline expression.",
    args: [{ name: "content", type: "string or inline content", description: "The text to emphasise." }],
    named: [],
    snippet: 'main.paragraph("Prose can be ", emphasis("text"), ".")',
    examples: [{ note: "Emphasised text", source: 'main.paragraph("Prose can be ", emphasis("emphasis"), ".")' }],
    status: "implemented"
  },

  code_text: {
    name: "code_text",
    category: "Prose",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'code_text("text")',
    summary: "Text in a monospaced face.",
    description: "Use it for a name, a path, or a short piece of code inside a sentence.",
    args: [{ name: "content", type: "string or inline content", description: "The text to show as code." }],
    named: [],
    snippet: 'main.paragraph("Use ", code_text("code_text"), ".")',
    examples: [{ note: "Code in a sentence", source: 'main.paragraph("Use ", code_text("code_text"), " for a name.")' }],
    status: "implemented"
  },

  inline: {
    name: "inline",
    category: "Mathematics blocks",
    role: "inline",
    containers: [],
    positional: [1],
    signature: "inline(expression)",
    summary: "Mathematics inside a sentence.",
    description:
      "The expression is typeset in the line of the text, at the size of the text. Use a display equation for anything longer.",
    args: [{ name: "expression", type: "expression", description: "The mathematics to set inline." }],
    named: [],
    snippet: 'main.paragraph("Mathematics sits inline, as in ", inline(x), ".")',
    examples: [{ note: "Inline mathematics", source: 'main.paragraph("The series ", inline(sum(i, 1, n, i^2)), " is quadratic.")' }],
    status: "implemented"
  },

  ref: {
    name: "ref",
    category: "Mathematics blocks",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'ref("label")',
    summary: "A reference to a numbered block.",
    description:
      "The label is the name a block carries. The reference is replaced by the number of the block, with the matching noun for figures, tables, and theorems. An unresolved reference is a diagnostic, not a silent blank.",
    args: [{ name: "label", type: "string", description: "The label of the block to point at." }],
    named: [],
    snippet: 'main.equation(x = 1, number=true, label="eq:series")\nmain.paragraph("See ", ref("eq:series"), ".")',
    examples: [
      {
        note: "A reference",
        source: 'main.equation(x = 1, number=true, label="eq:series")\nmain.paragraph("Equation ", ref("eq:series"), " gives the closed form.")'
      }
    ],
    status: "implemented"
  },

  cite: {
    name: "cite",
    category: "References",
    role: "inline",
    containers: [],
    positional: [1],
    signature: 'cite("key")',
    summary: "A citation of a reference.",
    description:
      "The key is the name of an entry in the reference list. Give several keys to cite several works at once.",
    args: [{ name: "keys", type: "string", description: "The key of the entry, or several keys separated by commas." }],
    named: [],
    snippet: 'refs.book("smith2024", author="J. Smith", title="On series", publisher="Examples", year=2024)\nmain.paragraph("Following ", cite("smith2024"), ".")',
    examples: [
      {
        note: "A citation",
        source: 'refs.book("smith2024", author="J. Smith", title="On series", publisher="Examples", year=2024)\nmain.paragraph("Following Smith ", cite("smith2024"), ".")'
      }
    ],
    status: "implemented"
  }
};

export const COMPONENT_DOCS = Object.values(COMPONENTS);

// The kind of block a method produces. A bound name stands for one of these.
export const CONTAINER_OF_METHOD = {
  section: "section",
  subsection: "subsection",
  subsubsection: "subsubsection",
  theorem: "theorem",
  lemma: "theorem",
  definition: "theorem",
  corollary: "theorem",
  proof: "proof",
  quote: "quote",
  figure: "figure",
  bibliography: "references"
};

// The methods that may be called on a container, by the kind of container.
export function methodsFor(kind) {
  return Object.values(COMPONENTS).filter(
    (component) => component.role !== "inline" && component.containers.includes(kind)
  );
}

export const DOCUMENT_NOTES = [
  {
    title: "A document is a program of statements",
    body: "A document is one Document(...) call, bound to a name, followed by the statements that build it. Nothing is executed: the statements are folded into the same document tree the renderer has always used.",
    example: 'document = Document(type="article", title="Note")'
  },
  {
    title: "Blocks and inline content",
    body: "Blocks stand on their own: sections, paragraphs, equations, lists, tables, figures, theorems. Inline components live inside a paragraph: bold, italic, inline mathematics, references, and citations.",
    example: 'main.paragraph("The series ", inline(sum(i, 1, n, i)), " is quadratic.")'
  },
  {
    title: "A name is a block, never a value",
    body: "A name may only stand for a document or a block, and may only be used before a dot. So n = 5 is never an assignment, and a section named e never hides the constant e.",
    example: 'main = document.section("Introduction")\nmain.paragraph("The sum of the first ", n, " squares.")'
  },
  {
    title: "Numbering is automatic",
    body: "Sections, equations, figures, tables, and theorem environments are numbered by the engine. Never type numbers into a heading; the template manages counters and the table of contents.",
    example: 'main.equation(frac(a, b) = c, number=true)'
  },
  {
    title: "Labels and references",
    body: "A label is a stable name for a block, written as a named argument. ref(\"label\") is replaced by the target's number, with the matching noun for figures, tables, and theorems. Unresolved references are diagnostics, not silent blanks.",
    example: 'main.equation(frac(a, b) = c, number=true, label="eq:ratio")\nmain.paragraph("Equation ", ref("eq:ratio"), " gives the ratio.")'
  },
  {
    title: "Citations and references",
    body: "cite(\"key\") refers to an entry in the reference list. Each entry is added with the method named after its type, and the engine checks that the type has the fields it needs.",
    example: 'refs = document.bibliography()\nrefs.article("smith2024", author="J. Smith", title="On series", journal="J. Math.", year=2024)'
  },
  {
    title: "Page layout is declarative",
    body: "page(...) configures paper size, orientation, margins, and columns. Defaults are usable without any configuration. Layout never changes the mathematical meaning of an expression.",
    example: 'document.page(size="A4", margin="25mm")'
  },
  {
    title: "Presentation is separate from meaning",
    body: "The same expression renders as MathML in the preview, LaTeX in the export, or text in a diagnostic. The document tree describes structure; renderers decide appearance.",
    example: 'main.equation(integral(x, 0, 1, x^2) = frac(1, 3), number=true)'
  }
];
