// Example documents for the Document Writer.
//
// A document is a program of statements:
//
//   document = Document(type="article", title="…")
//   main = document.section("Introduction")
//   main.paragraph("…")
//
// The test suite imports this module and compiles every example that is marked
// valid, so examples cannot drift away from the language.

export const DEFAULT_DOCUMENT_SOURCE = `document = Document(type="article", title="Summing Squares", author="Ada Lovelace", date="1842", abstract="A short note on the closed form of sum(i, 1, n, i^2).")

document.page(size="A4", margin="24mm")

intro = document.section("Introduction")
intro.paragraph("The sum of the first ", n, " squares is written ", inline(sum(i, 1, n, i^2)), ". Its growth is cubic in ", n, ", as ", ref("fig:growth"), " suggests and ", ref("eq:series"), " states exactly.")

closed = document.section("The closed form")
closed.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
closed.paragraph("The identity is proved by induction. The first few values are")
closed.table(["n", "sum(i, 1, n, i^2)"], [[1, 1], [2, 5], [3, 14], [4, 30]], caption="Small values of the sum of squares", label="tab:values", align=["center", "right"])

fig = closed.figure(caption="The sum of squares grows like the integral of the square function", label="fig:growth")
fig.image("assets/sum-of-squares.svg", width="70%", alt="Growth of the sum of squares")

remarks = document.section("Remarks")
remarks.bullets(["The formula is a polynomial of degree three in n.", "The same argument gives the sum of cubes.", "The identity is used in least-squares fitting."])
remarks.aligned([2*x + y = 5, x - y = 1], number=true, label="eq:system")
remarks.paragraph("The related system ", ref("eq:system"), " is solved by elimination.")`;

export const DOCUMENT_EXAMPLES = [
  {
    label: "Article: summing squares",
    valid: true,
    source: DEFAULT_DOCUMENT_SOURCE
  },
  {
    label: "Report: subtitles, contents, and code",
    valid: true,
    source: `document = Document(type="report", title="Numerical Methods: A Short Report", subtitle="Draft 0.1", author="Grace Hopper", affiliations="EasyTeX Working Group", date="2026-02-14", keywords=["numerics", "convergence", "series"], abstract="We compare the sum of squares with its integral and quantify the error.")

series = document.section("Numerical series")
series.paragraph("Consider the partial sums ", inline(sum(i, 1, n, i^2)), " and the integral ", inline(integral(x, 0, n, x^2)), ".")
series.equation(integral(x, 0, n, x^2) = frac(n^3, 3), number=true, label="eq:integral")

convergence = series.subsection("Convergence")
convergence.paragraph("Equation ", ref("eq:integral"), " shows the cubic behaviour.")
convergence.aligned([limit(n, infinity, frac(sum(i, 1, n, i^2), n^3)) = frac(1, 3)], number=true, label="eq:limit")

implementation = document.section("Implementation")
implementation.paragraph("The check is three lines of code:")
implementation.listing("let total = 0;\\nfor (let i = 1; i <= n; i += 1) total += i * i;", language="javascript", caption="Summing squares in linear time", label="lst:sum")

notes = document.section("Notes")
notes.quote(content="The purpose of computing is insight, not numbers.")`
  },
  {
    label: "Academic note: theorems and proofs",
    valid: true,
    source: `document = Document(type="academic_report", title="On the Convergence of a Sequence", author="Emmy Noether", abstract="We define the partial sums of the reciprocal squares and show the sequence is bounded above.")

defs = document.section("Definitions and results")
partial = defs.definition("Partial sums", content="The partial sums of the reciprocal squares.", label="def:partial")
partial.paragraph("For ", inline(n), " a positive integer, write ", inline(S(n) = sum(i, 1, n, frac(1, i^2))), ".")
terms = defs.lemma("Bounded terms")
terms.paragraph("Each term of the sum is at most ", inline(frac(1, i^2)), ".")
convergence = defs.theorem("Convergence", content="The sequence increases and stays below two.", label="thm:conv")
convergence.paragraph("The sequence defined in ", ref("def:partial"), " increases and stays below ", 2, ".")
argument = defs.proof(content="The argument is by comparison.")
argument.paragraph("Compare the series with the telescoping series ", inline(sum(i, 1, n, frac(1, i*(i + 1)))), " and note that every term is smaller.")

discussion = document.section("Discussion")
discussion.paragraph("The bound is not sharp; a sharper bound follows from ", ref("thm:conv"), " together with a comparison with the integral.")`
  },
  {
    label: "Technical document: two columns",
    valid: true,
    source: `document = Document(type="technical_document", title="EasyTeX Formatting Reference", author="The EasyTeX Team")

document.page(size="A4", columns=2, margin="18mm")

styles = document.section("Inline styles")
styles.paragraph("Use ", bold("bold"), ", ", italic("italic"), ", ", underline("underline"), ", ", emphasis("emphasis"), ", and ", code_text("code_text"), " to style prose. Mathematics such as ", inline(frac(a, b)), " sits inline.")
styles.bullets(["Paragraphs are just paragraph(...)", "Lists accept strings or blocks", "Blocks nest freely"])

display = document.section("Display content")
display.aligned([x + y = 5, 2*x - y = 4], number=true, label="eq:lin")
display.paragraph("See ", ref("eq:lin"), " for the system.")
display.listing("sum(i, 1, n, i^2)", language="mathscript", caption="A summation")`
  },
  {
    label: "Citations and bibliography",
    valid: true,
    source: `document = Document(type="academic_report", title="A Note with Sources", author="Nicolas Bourbaki", abstract="We cite two references and point at a labelled equation.")

main = document.section("Main Text")
main.paragraph("The classical treatment is ", cite("euler1748"), "; a modern account is ", cite("hardy2008", "smith2024"), ".")
main.equation(e^(i*pi) + 1 = 0, number=true, label="eq:euler")
main.paragraph("Equation ", ref("eq:euler"), " is Euler's identity.")

refs = document.bibliography()
refs.book("euler1748", author="L. Euler", title="Introductio in analysin infinitorum", publisher="Bousquet", year=1748)
refs.book("hardy2008", author="G. H. Hardy and E. M. Wright", title="An Introduction to the Theory of Numbers", publisher="Oxford University Press", year=2008)
refs.article("smith2024", author="J. Smith", title="On a series identity", journal="Journal of Examples", volume=12, pages="34-56", year=2024, doi="10.1000/example")`
  },
  {
    label: "Letter",
    valid: true,
    source: `document = Document(type="letter", title="Regarding the new notation", author="Ada Lovelace", date="14 February 2026")

document.paragraph("Dear colleague,")
document.paragraph("The document model keeps mathematics in function form, so ", inline(frac(1, 2)), " reads the same in the source and in the output.")
document.bullets(["Numbering is automatic.", "References are checked.", "Exports are plain LaTeX."])
document.paragraph("Yours sincerely, ", bold("Ada Lovelace"))`
  },
  {
    label: "Book: a chapter and a quotation",
    valid: true,
    source: `document = Document(type="book", title="Notes on the Summation of Series", author="Ada Lovelace", date="1843")

one = document.section("Chapter I: On partial sums")
one.paragraph("Let ", inline(S(n) = sum(i, 1, n, i^2)), " denote the partial sum of the squares. The difference of two consecutive partial sums is")
one.equation(S(n) - S(n - 1) = n^2, number=true, label="eq:difference")
one.paragraph("Equation ", ref("eq:difference"), " is the whole of the recurrence.")
one.quote(content="The purpose of computing is insight, not numbers.")

two = document.section("Chapter II: The closed form")
two.paragraph("Summing the recurrence gives")
two.equation(S(n) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:closed")
two.numbered(["The identity holds for n = 1.", "The right-hand side is a polynomial of degree three.", "The formula is used in least-squares fitting."])`
  },
  {
    label: "Thesis: an abstract and a long structure",
    valid: true,
    source: `document = Document(type="thesis", title="Bounds for Partial Sums of Reciprocal Squares", author="Emmy Noether", date="2026", abstract="We show that the partial sums of the reciprocal squares are bounded above by two, and that the bound is approached slowly.", keywords=["series", "bounds", "analysis"])

intro = document.section("Introduction")
intro.paragraph("The partial sums ", inline(S(n) = sum(i, 1, n, frac(1, i^2))), " grow without bound but very slowly.")
statement = intro.subsection("The statement")
statement.paragraph("There is a constant ", inline(c), " such that ", inline(S(n) < c), " for every ", inline(n), ".")

proof = document.section("Proof of the bound")
comparison = proof.lemma("Termwise comparison", content="Every term is smaller than the telescoping one.")
comparison.paragraph("For every ", inline(i >= 1), ", ", inline(frac(1, i^2) < frac(1, i*(i - 1))), ".")
bound = proof.theorem("The bound", content="The partial sums are bounded by two.", label="thm:bound")
telescoping = proof.proof(content="Compare the series with a telescoping one.")
telescoping.paragraph("Compare the series with the telescoping series ", inline(sum(i, 2, n, frac(1, i*(i - 1)))), ".")`
  },
  {
    label: "Presentation: a landscape page",
    valid: true,
    source: `document = Document(type="presentation", title="Writing Mathematics Without Backslashes", author="The EasyTeX Team")

document.page(size="A4", orientation="landscape", margin="18mm")

idea = document.section("The idea")
idea.paragraph("MathScript writes ", inline(frac(a, b)), " where LaTeX writes a command with a backslash.")
idea.bullets(["Calls instead of commands", "Objects for metadata", "One parser for both layers"])

pipeline = document.section("The pipeline")
pipeline.aligned([x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)], number=true, label="eq:roots")
pipeline.paragraph("The preview and the export come from the same tree.")`
  },
  {
    label: "Handout: a small page with a table",
    valid: true,
    source: `document = Document(type="article", title="A One-Page Handout", author="The EasyTeX Team")

document.page(size="A5", margin="15mm")

reference = document.section("Reference")
reference.table(["Name", "Meaning"], [["frac(a, b)", "A fraction"], ["sum(i, 1, n, i^2)", "A sum of squares"]], caption="The most used calls", label="tab:calls", align=["left", "left"])
reference.paragraph("Every call takes its arguments in parentheses.")`
  },
  {
    label: "Article: inline styles and mathematical symbols",
    valid: true,
    source: `document = Document(type="article", title="Symbols in Running Text", author="The EasyTeX Team", abstract="Greek names, named symbols, and inline styles all read naturally in the source.")

styles = document.section("Styles")
styles.paragraph("Prose can be ", bold("bold"), ", ", italic("italic"), ", ", underline("underlined"), ", ", emphasis("emphasised"), ", or ", code_text("monospaced"), ".")
styles.paragraph("Mathematics sits inline, as in ", inline(alpha + beta = gamma), ", and symbols such as ", inline(forall), ", ", inline(emptyset), ", and ", inline(aleph), " keep their glyphs.")

display = document.section("A short display")
display.equation(integral(x, 0, infinity, exp(-x^2)*dx) = frac(sqrt(pi), 2), number=true, label="eq:gauss")
display.paragraph("Equation ", ref("eq:gauss"), " is the Gaussian integral.")`
  },
  {
    label: "Errors: what diagnostics look like",
    valid: false,
    source: `document = Document(type="article", title="What Errors Look Like", author="EasyTeX")

main = document.section("A broken reference")
main.paragraph("See ", ref("eq:missing"), " for details.")

main.sectoin("A misspelled method", "The suggestion points at section().")

main.equation(x = 1, number=true, label="eq:first")
main.equation(x = 2, number=true, label="eq:first")

main.table(["A", "B"], [["1"]], caption="A ragged table")`
  }
];
