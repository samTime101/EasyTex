// Example documents for the Document Writer.
//
// The test suite imports this module and compiles every example that is
// marked valid, so examples cannot drift away from the language.

export const DEFAULT_DOCUMENT_SOURCE = `document({
  type: "article",
  title: "Summing Squares",
  author: "Ada Lovelace",
  date: "1842",
  abstract: "A short note on the closed form of sum(i, 1, n, i^2).",
  content: [
    page({ size: "A4", margins: { top: "24mm", right: "24mm", bottom: "24mm", left: "24mm" } }),
    section("Introduction", [
      text("The sum of the first ", n, " squares is written ", inline(sum(i, 1, n, i^2)), ". Its growth is cubic in ", n, ", as ", ref("fig:growth"), " suggests and ", ref("eq:series"), " states exactly.")
    ]),
    section("The closed form", [
      equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series"),
      text("The identity is proved by induction. The first few values are"),
      table(["n", "sum(i, 1, n, i^2)"], [[1, 1], [2, 5], [3, 14], [4, 30]], caption="Small values of the sum of squares", label="tab:values", align=["center", "right"]),
      figure(image("assets/sum-of-squares.svg", width="70%", alt="Growth of the sum of squares"), caption="The sum of squares grows like the integral of the square function", label="fig:growth")
    ]),
    section("Remarks", [
      bullets(["The formula is a polynomial in ", n, " of degree three.", "The same argument gives the sum of cubes.", "The identity is used in least-squares fitting."]),
      aligned([2*x + y = 5, x - y = 1], number=true, label="eq:system"),
      text("The related system ", ref("eq:system"), " is solved by elimination.")
    ])
  ]
})`;

export const DOCUMENT_EXAMPLES = [
  {
    label: "Article: summing squares",
    valid: true,
    source: DEFAULT_DOCUMENT_SOURCE
  },
  {
    label: "Report: subtitles, contents, and code",
    valid: true,
    source: `document({
  type: "report",
  title: "Numerical Methods: A Short Report",
  subtitle: "Draft 0.1",
  author: "Grace Hopper",
  affiliations: "EasyTeX Working Group",
  date: "2026-02-14",
  keywords: ["numerics", "convergence", "series"],
  abstract: "We compare the sum of squares with its integral and quantify the error.",
  content: [
    section("Numerical series", [
      text("Consider the partial sums ", inline(sum(i, 1, n, i^2)), " and the integral ", inline(integral(x, 0, n, x^2)), "."),
      equation(integral(x, 0, n, x^2) = frac(n^3, 3), number=true, label="eq:integral"),
      subsection("Convergence", [
        text("Equation ", ref("eq:integral"), " shows the cubic behaviour."),
        aligned([limit(n, infinity, frac(sum(i, 1, n, i^2), n^3)) = frac(1, 3)], number=true, label="eq:limit")
      ])
    ]),
    section("Implementation", [
      text("The check is three lines of code:"),
      listing("let total = 0;\\nfor (let i = 1; i <= n; i += 1) total += i * i;", language="javascript", caption="Summing squares in linear time", label="lst:sum")
    ]),
    section("Notes", [
      quote([text("The purpose of computing is insight, not numbers.")])
    ])
  ]
})`
  },
  {
    label: "Academic note: theorems and proofs",
    valid: true,
    source: `document({
  type: "academic_report",
  title: "On the Convergence of a Sequence",
  author: "Emmy Noether",
  abstract: "We define the partial sums of the reciprocal squares and show the sequence is bounded above.",
  content: [
    section("Definitions and results", [
      definition("Partial sums", [text("For ", inline(n), " a positive integer, write ", inline(a_n = sum(i, 1, n, frac(1, i^2))), ".")], label="def:partial"),
      lemma("Bounded terms", [text("Each term of the sum is at most ", inline(frac(1, i^2)), ".")]),
      theorem("Convergence", [text("The sequence defined in ", ref("def:partial"), " increases and stays below ", 2, ".")], label="thm:conv"),
      proof([text("Compare the series with the telescoping series ", inline(sum(i, 1, n, frac(1, i*(i + 1)))), " and note that every term is smaller.")])
    ]),
    section("Discussion", [
      text("The bound is not sharp; a sharper bound follows from ", ref("thm:conv"), " together with a comparison with the integral.")
    ])
  ]
})`
  },
  {
    label: "Technical document: two columns",
    valid: true,
    source: `document({
  type: "technical_document",
  title: "EasyTeX Formatting Reference",
  author: "The EasyTeX Team",
  content: [
    page({ size: "A4", columns: 2, margins: { top: "18mm", right: "18mm", bottom: "18mm", left: "18mm" } }),
    section("Inline styles", [
      text("Use ", bold("bold"), ", ", italic("italic"), ", ", underline("underline"), ", ", emphasis("emphasis"), ", and ", code_text("code_text"), " to style prose. Mathematics such as ", inline(frac(a, b)), " sits inline."),
      bullets(["Paragraphs are just text(...)", "Lists accept strings or blocks", "Blocks nest freely"])
    ]),
    section("Display content", [
      aligned([x + y = 5, 2*x - y = 4], number=true, label="eq:lin"),
      text("See ", ref("eq:lin"), " for the system."),
      listing("sum(i, 1, n, i^2)", language="mathscript", caption="A summation")
    ])
  ]
})`
  },
  {
    label: "Citations and bibliography",
    valid: true,
    source: `document({
  type: "academic_report",
  title: "A Note with Sources",
  author: "Nicolas Bourbaki",
  abstract: "We cite two references and point at a labelled equation.",
  content: [
    section("Main text", [
      text("The classical treatment is ", cite("euler1748"), "; a modern account is ", cite("hardy2008", "smith2024"), "."),
      equation(e^(i*pi) + 1 = 0, number=true, label="eq:euler"),
      text("Equation ", ref("eq:euler"), " is Euler's identity.")
    ]),
    bibliography([
      { key: "euler1748", type: "book", author: "L. Euler", title: "Introductio in analysin infinitorum", publisher: "Bousquet", year: 1748 },
      { key: "hardy2008", type: "book", author: "G. H. Hardy and E. M. Wright", title: "An Introduction to the Theory of Numbers", publisher: "Oxford University Press", year: 2008 },
      { key: "smith2024", type: "article", author: "J. Smith", title: "On a series identity", journal: "Journal of Examples", volume: 12, pages: "34-56", year: 2024, doi: "10.1000/example" }
    ])
  ]
})`
  },
  {
    label: "Letter",
    valid: true,
    source: `document({
  type: "letter",
  title: "Regarding the new notation",
  author: "Ada Lovelace",
  date: "14 February 2026",
  content: [
    text("Dear colleague,"),
    text("The document model keeps mathematics in function form, so ", inline(frac(1, 2)), " reads the same in the source and in the output."),
    bullets(["Numbering is automatic.", "References are checked.", "Exports are plain LaTeX."]),
    text("Yours sincerely, ", bold("Ada Lovelace"))
  ]
})`
  },
  {
    label: "Errors: what diagnostics look like",
    valid: false,
    source: `document({
  type: "article",
  title: "What Errors Look Like",
  author: "EasyTeX",
  content: [
    section("A broken reference", [
      text("See ", ref("eq:missing"), " for details.")
    ]),
    sectoin("A misspelled component", [text("The suggestion points at section().")]),
    equation(x = 1, number=true, label="eq:first"),
    equation(x = 2, number=true, label="eq:first"),
    table(["A", "B"], [["1"]], caption="A ragged table")
  ]
})`
  }
];
