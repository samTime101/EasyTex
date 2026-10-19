// Document component catalog.
//
// This catalog is the shared source of truth for the document builder, the
// documentation page, hover help, and editor completion. Every entry in
// COMPONENTS must be interpreted by src/document/build.js; the test suite
// enforces that they do not drift apart.
//
// Entries may carry a `snippet`: the starter source inserted when the
// component is accepted from autocomplete. A snippet may contain one "$0"
// marker; the editor removes it and places the caret there. Every snippet is
// a valid fragment of a document, checked by the test suite.

export const COMPONENT_CATEGORY_ORDER = [
  "Document",
  "Document structure",
  "Text and inline",
  "Mathematics blocks",
  "Tables and figures",
  "Academic structures"
];

export const COMPONENTS = {
  document: {
    name: "document",
    category: "Document",
    role: "document",
    signature: "document({ type, title, author, content })",
    summary: "The top-level declaration of a document: metadata plus ordered content blocks.",
    description:
      "Every MathScript document is one document(...) call at the top level. Metadata fields are written as object entries; content is a list of block components.",
    args: [
      {
        name: "metadata",
        type: "object",
        description:
          "Document metadata. Supported fields: type, title, subtitle, author, date, language, keywords, abstract, affiliations, bibliography, content."
      }
    ],
    named: [],
    snippet:
      'document({\n  type: "article",\n  title: "Untitled document",\n  author: "Author",\n  content: [\n    section("Introduction", [\n      text("$0")\n    ])\n  ]\n})',
    examples: [
      {
        note: "Smallest complete document",
        source: 'document({\n  type: "article",\n  title: "A Short Note",\n  author: "Example Author",\n  content: [\n    section("Introduction", [\n      text("MathScript documents are built from content blocks."),\n      equation(sum(i, 1, n, i^2), number=true, label="eq:series")\n    ])\n  ]\n})'
      }
    ],
    status: "implemented"
  },

  page: {
    name: "page",
    category: "Document",
    role: "block",
    signature: 'page({ size, orientation, margins, columns })',
    summary: "Page geometry for the whole document.",
    description:
      "Document layout is declarative. Page configuration should appear as the first content block. Defaults are A4, portrait, 25 mm margins, one column.",
    args: [
      {
        name: "configuration",
        type: "object",
        description: 'Supported fields: size ("A4", "A5", "A3", "Letter", "Legal"), orientation ("portrait", "landscape"), margins ({ top, right, bottom, left } with mm, cm, in, pt, or px units), and columns (1-3).'
      }
    ],
    named: [],
    examples: [
      {
        note: "A two-column A4 report",
        source: 'page({ size: "A4", orientation: "portrait", margins: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" }, columns: 2 })'
      }
    ],
    status: "implemented"
  },

  section: {
    name: "section",
    category: "Document structure",
    role: "block",
    signature: 'section("Title", [blocks])',
    summary: "A numbered top-level section with nested content blocks.",
    args: [
      { name: "title", type: "string or inline content", description: "The heading text." },
      { name: "content", type: "blocks", description: "The blocks of the section, in order." }
    ],
    named: [
      { name: "label", type: "string", description: "A label such as \"sec:introduction\" for cross-references." }
    ],
    snippet: 'section("$0", [\n  text("")\n])',
    examples: [
      {
        note: "A section with a paragraph and an equation",
        source: 'section("Introduction", [\n  text("Calculus studies change and accumulation."),\n  equation(derivative(x, x^2 + 1), number=true)\n])'
      }
    ],
    status: "implemented"
  },

  subsection: {
    name: "subsection",
    category: "Document structure",
    role: "block",
    signature: 'subsection("Title", [blocks])',
    summary: "A second-level heading inside a section.",
    description: "Numbering is automatic: 1, 1.1, 1.1.1. Do not type numbers into headings.",
    args: [
      { name: "title", type: "string or inline content", description: "The heading text." },
      { name: "content", type: "blocks", description: "The blocks of the subsection, in order." }
    ],
    named: [
      { name: "label", type: "string", description: "A label for cross-references." }
    ],
    snippet: 'subsection("$0", [\n  text("")\n])',
    examples: [
      {
        note: "A subsection nested in a section",
        source: 'section("Methods", [\n  subsection("Data", [text("The sample is described by ", mu, " and ", sigma, ".")])\n])'
      }
    ],
    status: "implemented"
  },

  subsubsection: {
    name: "subsubsection",
    category: "Document structure",
    role: "block",
    signature: 'subsubsection("Title", [blocks])',
    summary: "A third-level heading inside a subsection.",
    args: [
      { name: "title", type: "string or inline content", description: "The heading text." },
      { name: "content", type: "blocks", description: "The blocks of the subsubsection, in order." }
    ],
    named: [
      { name: "label", type: "string", description: "A label for cross-references." }
    ],
    snippet: 'subsubsection("$0", [\n  text("")\n])',
    examples: [
      {
        note: "Three heading levels",
        source: 'section("A", [subsection("B", [subsubsection("C", [text("Nested content.")])])])'
      }
    ],
    status: "implemented"
  },

  label: {
    name: "label",
    category: "Document structure",
    role: "block",
    signature: 'label("eq:series")',
    summary: "Attach a stable label to the block before it, or to the enclosing section.",
    description:
      "As the first block of a section, label() names the section itself. Otherwise it names the preceding block. Components that accept a label= argument do not need a separate label() call.",
    args: [
      { name: "name", type: "string", description: "The label text. Labels must be unique in the document." }
    ],
    named: [],
    examples: [
      {
        note: "Labelling the preceding equation",
        source:
          'document({\n  type: "article",\n  title: "Labels",\n  author: "Example",\n  content: [\n    equation(sum(i, 1, n, i), number=true),\n    label("eq:sum")\n  ]\n})'
      }
    ],
    status: "implemented"
  },

  page_break: {
    name: "page_break",
    category: "Document structure",
    role: "block",
    signature: "page_break()",
    summary: "Start a new page at this point.",
    args: [],
    named: [],
    examples: [
      {
        note: "Break before an appendix",
        source:
          'document({\n  type: "article",\n  title: "Breaks",\n  author: "Example",\n  content: [\n    text("Main matter."),\n    page_break(),\n    section("Appendix", [text("Additional material.")])\n  ]\n})'
      }
    ],
    status: "implemented"
  },

  text: {
    name: "text",
    category: "Text and inline",
    role: "block",
    signature: 'text("A paragraph.", inline(x^2), " and more.")',
    summary: "A paragraph of prose, mixing plain text, inline components, and inline mathematics.",
    description:
      "Each argument is a string, an inline component such as bold(...), or a mathematical expression. Strings are plain text; use inline(...) or a bare expression for mathematics.",
    args: [
      { name: "content", type: "string, inline component, or expression", description: "The paragraph content, in order." }
    ],
    named: [],
    snippet: 'text("$0")',
    examples: [
      {
        note: "Prose with inline mathematics",
        source: 'text("The series ", inline(sum(i, 1, n, i)), " grows quadratically with ", n, ".")'
      }
    ],
    status: "implemented"
  },

  bold: {
    name: "bold",
    category: "Text and inline",
    role: "inline",
    signature: 'bold("Important text")',
    summary: "Bold (strong) inline text.",
    args: [{ name: "content", type: "string or inline content", description: "The text to emphasize with weight." }],
    named: [],
    examples: [{ note: "Inside a paragraph", source: 'text("This is ", bold("important"), ".")' }],
    status: "implemented"
  },

  italic: {
    name: "italic",
    category: "Text and inline",
    role: "inline",
    signature: 'italic("Emphasized text")',
    summary: "Italic inline text.",
    args: [{ name: "content", type: "string or inline content", description: "The text to italicize." }],
    named: [],
    examples: [{ note: "Inside a paragraph", source: 'text("The term ", italic("entropy"), " has many meanings.")' }],
    status: "implemented"
  },

  underline: {
    name: "underline",
    category: "Text and inline",
    role: "inline",
    signature: 'underline("Underlined text")',
    summary: "Underlined inline text.",
    args: [{ name: "content", type: "string or inline content", description: "The text to underline." }],
    named: [],
    examples: [{ note: "Inside a paragraph", source: 'text("See ", underline("chapter 2"), " for details.")' }],
    status: "implemented"
  },

  emphasis: {
    name: "emphasis",
    category: "Text and inline",
    role: "inline",
    signature: 'emphasis("Emphasized content")',
    summary: "Semantic emphasis, rendered in italics and exported as an emphasis command.",
    args: [{ name: "content", type: "string or inline content", description: "The emphasized text." }],
    named: [],
    examples: [{ note: "Inside a paragraph", source: 'text("This matters ", emphasis("a great deal"), ".")' }],
    status: "implemented"
  },

  code_text: {
    name: "code_text",
    category: "Text and inline",
    role: "inline",
    signature: 'code_text("source code")',
    summary: "Inline code or literal text in a monospace font.",
    args: [{ name: "content", type: "string or inline content", description: "The literal text." }],
    named: [],
    examples: [{ note: "Inside a paragraph", source: 'text("Call ", code_text("compile()"), " to parse.")' }],
    status: "implemented"
  },

  inline: {
    name: "inline",
    category: "Text and inline",
    role: "inline",
    signature: "inline(sum(i, 1, n, i^2))",
    summary: "Inline mathematics inside a paragraph.",
    description: "A bare mathematical expression inside text() is also rendered inline; inline(...) is explicit.",
    args: [{ name: "expression", type: "expression", description: "The mathematical expression to set inline." }],
    named: [],
    examples: [{ note: "Inside a paragraph", source: 'text("We use ", inline(frac(a, b)), " throughout.")' }],
    status: "implemented"
  },

  ref: {
    name: "ref",
    category: "Text and inline",
    role: "inline",
    signature: 'ref("eq:series")',
    summary: "A cross-reference to a labelled block.",
    description:
      "The renderer replaces the reference with the number of the target: sections by number, equations in parentheses, figures and tables with their label word. Broken references are reported as diagnostics.",
    args: [{ name: "label", type: "string", description: "The label of the target block." }],
    named: [],
    examples: [
      {
        note: "Referring to an equation",
        source:
          'document({\n  type: "article",\n  title: "References",\n  author: "Example",\n  content: [\n    equation(sum(i, 1, n, i^2), number=true, label="eq:series"),\n    text("Equation ", ref("eq:series"), " gives the closed form.")\n  ]\n})'
      }
    ],
    status: "implemented"
  },

  cite: {
    name: "cite",
    category: "Text and inline",
    role: "inline",
    signature: 'cite("smith2024")',
    summary: "A citation of one or more bibliography entries.",
    description: "Several keys may be given: cite(\"smith2024\", \"jones2025\") renders as [1, 2].",
    args: [{ name: "keys", type: "string", description: "One or more bibliography keys." }],
    named: [],
    examples: [
      {
        note: "Citing a source",
        source:
          'document({\n  type: "article",\n  title: "Citations",\n  author: "Example",\n  content: [\n    text("This follows Smith ", cite("smith2024"), "."),\n    bibliography([\n      { key: "smith2024", type: "article", author: "J. Smith", title: "On series", journal: "J. Math.", year: 2024 }\n    ])\n  ]\n})'
      }
    ],
    status: "implemented"
  },

  quote: {
    name: "quote",
    category: "Text and inline",
    role: "block",
    signature: 'quote([text("Quoted words")])',
    summary: "A block quotation.",
    args: [{ name: "content", type: "blocks", description: "The quoted blocks." }],
    named: [],
    examples: [
      {
        note: "A short quotation",
        source: 'quote([text("Mathematics is the queen of the sciences.")])'
      }
    ],
    status: "implemented"
  },

  bullets: {
    name: "bullets",
    category: "Text and inline",
    role: "block",
    signature: 'bullets(["First item", "Second item"])',
    summary: "A bulleted list.",
    description: "Items may be strings or block components. Nested lists are written as nested items.",
    args: [{ name: "items", type: "list", description: "The list items." }],
    named: [],
    snippet: 'bullets([\n  "$0",\n  ""\n])',
    examples: [
      {
        note: "A list with a nested list",
        source: 'bullets([\n  "First item",\n  "Second item",\n  bullets(["Nested item"])\n])'
      }
    ],
    status: "implemented"
  },

  numbered: {
    name: "numbered",
    category: "Text and inline",
    role: "block",
    signature: 'numbered(["First step", "Second step"])',
    summary: "A numbered list.",
    description: "Numbering is automatic. Items may be strings or block components.",
    args: [{ name: "items", type: "list", description: "The list items, in order." }],
    named: [],
    snippet: 'numbered([\n  "$0",\n  ""\n])',
    examples: [
      {
        note: "A numbered list",
        source: 'numbered([\n  "Choose a template",\n  "Write the content",\n  "Export to LaTeX"\n])'
      }
    ],
    status: "implemented"
  },

  equation: {
    name: "equation",
    category: "Mathematics blocks",
    role: "block",
    signature: "equation(expression, number=true, label=\"eq:name\")",
    summary: "A display equation, optionally numbered and labelled.",
    description:
      "Equations are unnumbered unless number=true. A labelled equation must be numbered so that references resolve. A bare expression or relation in content is also rendered as an unnumbered display equation.",
    args: [{ name: "expression", type: "expression", description: "The expression or relation to display." }],
    named: [
      { name: "number", type: "boolean", description: "Number the equation (default false)." },
      { name: "label", type: "string", description: "A label such as \"eq:series\" for cross-references." }
    ],
    examples: [
      {
        note: "A numbered, labelled equation",
        source: 'equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")'
      }
    ],
    status: "implemented"
  },

  aligned: {
    name: "aligned",
    category: "Mathematics blocks",
    role: "block",
    signature: "aligned([x + y = 5, x - y = 1], number=true)",
    summary: "A block of equations aligned at their relation signs.",
    description: "Each row must be a relation. The renderer aligns the rows at the relation operator; no manual spacing is used.",
    args: [
      { name: "rows", type: "list of relations", description: "The rows to align." }
    ],
    named: [
      { name: "number", type: "boolean", description: "Number the block (default false)." },
      { name: "label", type: "string", description: "A label for cross-references." }
    ],
    examples: [
      {
        note: "A system of two equations",
        source: "aligned([\n  x + y = 5,\n  x - y = 1\n], number=true)"
      }
    ],
    status: "implemented"
  },

  table: {
    name: "table",
    category: "Tables and figures",
    role: "block",
    signature: 'table(["Name", "Score"], [[ "Alice", 90 ], [ "Bob", 85 ]], caption="Scores")',
    summary: "A table with an optional header row, caption, and label.",
    description: "Rows must all have the same number of cells as the header. Cells may be strings, numbers, inline components, or mathematical expressions.",
    args: [
      { name: "header", type: "list of cells", description: "Optional header cells. When omitted, the single list argument is the body." },
      { name: "rows", type: "list of rows", description: "The body rows. Every row must match the header width." }
    ],
    named: [
      { name: "caption", type: "string or inline content", description: "The caption shown below the table." },
      { name: "label", type: "string", description: "A label for cross-references." },
      { name: "align", type: "string or list", description: "Column alignment: \"left\", \"center\", or \"right\", for one column or a list per column." }
    ],
    snippet: 'table(\n  ["Column 1", "Column 2"],\n  [\n    ["", ""]\n  ]\n)',
    examples: [
      {
        note: "A table with a caption",
        source: 'table(\n  ["Name", "Score"],\n  [["Alice", 90], ["Bob", 85]],\n  caption="Exam scores",\n  label="tab:scores"\n)'
      }
    ],
    status: "implemented"
  },

  figure: {
    name: "figure",
    category: "Tables and figures",
    role: "block",
    signature: 'figure(image("plot.png", width="80%"), caption="A plot", label="fig:plot")',
    summary: "A captioned, numbered figure.",
    args: [{ name: "image", type: "image", description: "The image to show, written as image(...)." }],
    named: [
      { name: "caption", type: "string or inline content", description: "The caption shown below the figure." },
      { name: "label", type: "string", description: "A label for cross-references." }
    ],
    snippet: 'figure(\n  image("figure.png", width="70%", alt=""),\n  caption="Caption"\n)',
    examples: [
      {
        note: "A captioned figure",
        source: 'figure(\n  image("results.png", width="70%", alt="Convergence plot"),\n  caption="Convergence of the series",\n  label="fig:convergence"\n)'
      }
    ],
    status: "implemented"
  },

  image: {
    name: "image",
    category: "Tables and figures",
    role: "block",
    signature: 'image("results.png", width="80%", alt="Results")',
    summary: "An image asset, normally placed inside figure(...).",
    description:
      "Asset paths must be relative paths or https URLs; other schemes are rejected. Relative paths resolve against the document location.",
    args: [
      { name: "src", type: "string", description: "The image path or https URL." }
    ],
    named: [
      { name: "width", type: "string", description: "A percentage such as \"80%\" or a length such as \"100mm\"." },
      { name: "height", type: "string", description: "A length such as \"60mm\"." },
      { name: "alt", type: "string", description: "Alternative text for accessibility." }
    ],
    examples: [
      {
        note: "Standalone image",
        source: 'image("diagram.svg", width="50%", alt="A block diagram")'
      }
    ],
    status: "implemented"
  },

  listing: {
    name: "listing",
    category: "Tables and figures",
    role: "block",
    signature: 'listing("source code", language="text", caption="A listing")',
    summary: "A code listing block.",
    args: [{ name: "source", type: "string", description: "The literal code text." }],
    named: [
      { name: "language", type: "string", description: "A language name such as \"mathscript\" or \"javascript\"." },
      { name: "caption", type: "string or inline content", description: "The caption for the listing." },
      { name: "label", type: "string", description: "A label for cross-references." }
    ],
    snippet: 'listing("$0", language="text")',
    examples: [
      {
        note: "A short listing",
        source: 'listing("sum(i, 1, n, i^2)", language="mathscript", caption="A summation")'
      }
    ],
    status: "implemented"
  },

  theorem: {
    name: "theorem",
    category: "Academic structures",
    role: "block",
    signature: 'theorem("Title", [blocks])',
    summary: "A numbered theorem environment.",
    description: "Theorems, lemmas, definitions, and corollaries are numbered independently and can be labelled for cross-references.",
    args: [
      { name: "title", type: "string", description: "An optional short title, or the content when no title is needed." },
      { name: "content", type: "blocks or string", description: "The statement." }
    ],
    named: [{ name: "label", type: "string", description: "A label for cross-references." }],
    snippet: 'theorem("$0", [\n  text("")\n])',
    examples: [
      {
        note: "A labelled theorem",
        source: 'theorem("Pythagoras", [text("In a right triangle, ", inline(a^2 + b^2 = c^2), ".")], label="thm:pythagoras")'
      }
    ],
    status: "implemented"
  },

  lemma: {
    name: "lemma",
    category: "Academic structures",
    role: "block",
    signature: 'lemma("Title", [blocks])',
    summary: "A numbered lemma environment.",
    args: [
      { name: "title", type: "string", description: "An optional short title." },
      { name: "content", type: "blocks or string", description: "The statement." }
    ],
    named: [{ name: "label", type: "string", description: "A label for cross-references." }],
    snippet: 'lemma("$0", [\n  text("")\n])',
    examples: [
      { note: "A lemma", source: 'lemma("Monotonicity", [text("The sequence is non-decreasing.")])' }
    ],
    status: "implemented"
  },

  definition: {
    name: "definition",
    category: "Academic structures",
    role: "block",
    signature: 'definition("Title", [blocks])',
    summary: "A numbered definition environment.",
    args: [
      { name: "title", type: "string", description: "An optional short title." },
      { name: "content", type: "blocks or string", description: "The definition." }
    ],
    named: [{ name: "label", type: "string", description: "A label for cross-references." }],
    snippet: 'definition("$0", [\n  text("")\n])',
    examples: [
      {
        note: "A definition",
        source: 'definition("Limit", [text("The value approached by ", inline(sin(x)/x), " as ", inline(x), " tends to ", inline(a), ".")])'
      }
    ],
    status: "implemented"
  },

  corollary: {
    name: "corollary",
    category: "Academic structures",
    role: "block",
    signature: 'corollary("Title", [blocks])',
    summary: "A numbered corollary environment.",
    args: [
      { name: "title", type: "string", description: "An optional short title." },
      { name: "content", type: "blocks or string", description: "The statement." }
    ],
    named: [{ name: "label", type: "string", description: "A label for cross-references." }],
    snippet: 'corollary("$0", [\n  text("")\n])',
    examples: [{ note: "A corollary", source: 'corollary("A consequence", [text("The bound follows immediately.")])' }],
    status: "implemented"
  },

  proof: {
    name: "proof",
    category: "Academic structures",
    role: "block",
    signature: "proof([blocks])",
    summary: "A proof, closed with the end-of-proof symbol.",
    args: [{ name: "content", type: "blocks or string", description: "The proof body." }],
    named: [{ name: "title", type: "string", description: "Alternative title, for example a reference to the result proved." }],
    snippet: 'proof([\n  text("$0")\n])',
    examples: [
      {
        note: "A proof",
        source: 'proof([text("Expand both sides and collect terms.")])'
      }
    ],
    status: "implemented"
  },

  bibliography: {
    name: "bibliography",
    category: "Academic structures",
    role: "block",
    signature: 'bibliography([{ key: "smith2024", type: "article", ... }])',
    summary: "The reference database for citations.",
    description:
      "Entries are structured objects with a required key and type-specific metadata. Supported types: article, book, inproceedings, website, techreport, misc.",
    args: [
      {
        name: "entries",
        type: "list of objects",
        description: "Each entry needs a unique key; author, title, and year are required for every type, plus journal for articles, publisher for books, booktitle for inproceedings, url for websites, and institution for technical reports."
      }
    ],
    named: [],
    snippet:
      'bibliography([\n  {\n    key: "ref1",\n    type: "article",\n    author: "Author",\n    title: "Title",\n    journal: "Journal",\n    year: 2026\n  }\n])',
    examples: [
      {
        note: "One entry and a citation",
        source: 'bibliography([\n  { key: "smith2024", type: "article", author: "J. Smith", title: "On series", journal: "J. Math.", year: 2024 }\n])'
      }
    ],
    status: "implemented"
  }
};

export const COMPONENT_DOCS = Object.values(COMPONENTS);

export const DOCUMENT_NOTES = [
  {
    title: "A document is a function call",
    body: "Every document is one document(...) call. Metadata is an object; content is an ordered list of blocks. A single block on its own is accepted as a shortcut and wrapped in a default article.",
    example: 'document({ type: "article", title: "Note", content: [ text("Hello.") ] })'
  },
  {
    title: "Blocks and inline content",
    body: "Blocks stand on their own: sections, paragraphs, equations, lists, tables, figures, theorems. Inline components live inside text(...): bold, italic, inline mathematics, references, and citations.",
    example: 'text("The series ", inline(sum(i, 1, n, i)), " is quadratic.")'
  },
  {
    title: "Numbering is automatic",
    body: "Sections, equations, figures, tables, and theorem environments are numbered by the engine. Never type numbers into a heading; the template manages counters and the table of contents.",
    example: 'equation(frac(a, b) = c, number=true)'
  },
  {
    title: "Labels and references",
    body: "A label is a stable name for a block. ref(\"label\") is replaced by the target's number, with the matching noun for figures, tables, and theorems. Unresolved references are diagnostics, not silent blanks.",
    example: 'text("See ", ref("eq:series"), " and ", ref("fig:results"), ".")'
  },
  {
    title: "Citations and bibliography",
    body: "cite(\"key\") refers to an entry in the bibliography block. Entries are structured objects; the engine validates required fields for each entry type and reports incomplete entries.",
    example: 'text("Following Smith ", cite("smith2024"), ".")'
  },
  {
    title: "Page layout is declarative",
    body: "page({ ... }) configures paper size, orientation, margins, and columns. Defaults are usable without any configuration. Layout never changes the mathematical meaning of an expression.",
    example: 'page({ size: "A4", margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" } })'
  },
  {
    title: "Presentation is separate from meaning",
    body: "The same expression renders as MathML in the preview, LaTeX in the export, or text in a diagnostic. The document tree describes structure; renderers decide appearance.",
    example: 'integral(x, 0, 1, x^2)'
  }
];
