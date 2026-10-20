# PROPOSAL — the statement syntax for documents

**Status:** **implemented**. The document layer now speaks this syntax, and the old data form is
gone. The decisions taken while implementing are recorded in the amendment note below.

**Amendment note (implementation).** The proposal was approved with three changes:

1. the old data form is **removed**, not kept as a compatibility case — the statement syntax is the
   only document syntax that exists;
2. the content of a container is a **named argument** (`content="…"`), not a second positional
   argument: the position rule of §2.4 needs an exact arity per method, and an optional positional
   argument would make the boundary between the positional and the named arguments ambiguous;
3. the container of a heading keeps its level, so a subsection is not a section, and a
   subsubsection may only be called on a subsection.

**Revision note.** The first draft was wrong in three places, and all three are fixed below:

1. the rule for `=` contradicted itself — it is now decided by **position**, not by name;
2. the grammar did not match the prose, and `name = expression` is **gone**;
3. the examples contained mistakes the validator would reject — they are corrected, and all
   eleven are now written out.

---

## 1. Why

The document language today is a value:

```mathscript
document({
  type: "academic_report",
  title: "A Note with Sources",
  content: [
    section("Main Text", [
      text("The classical treatment is ", cite("euler1748"), "."),
      equation(e^(i*pi) + 1 = 0, number=true, label="eq:euler")
    ])
  ]
})
```

It is unambiguous, safe, and easy to implement — and it is **hard to read**. The blocks are buried
in brackets, every closing bracket arrives at the end, and the reader has to hold a stack of
`])])` in their head to know where they are.

The proposal keeps everything that makes the language safe, and replaces the surface syntax with
one that reads like the thing it describes:

```mathscript
document = Document(type="academic_report", title="A Note with Sources")

main = document.section("Main Text")

main.paragraph("The classical treatment is ", cite("euler1748"), "; a modern account is ",
               cite("hardy2008", "smith2024"), ".")
main.equation(e^(i*pi) + 1 = 0, number=true, label="eq:euler")
main.paragraph("Equation ", ref("eq:euler"), " is Euler's identity.")

refs = document.bibliography()
refs.book("euler1748", author="L. Euler", title="Introductio in analysin infinitorum",
          publisher="Bousquet", year=1748)
```

**The document layer keeps its tree.** The statements above are *desugared* into exactly the tree
the current syntax produces. Nothing is executed: there is no evaluator, no evaluation order, and
no user-defined behaviour. The guarantee "your source is parsed as data and never executed" stays
literally true.

---

## 2. The rules

### 2.1 The whole grammar of a document

```
program       ::= statement*
statement    ::= binding | method-call | expression
binding      ::= NAME "=" (document-call | method-call)
method-call  ::= target "." NAME "(" arguments ")"
document-call::= "Document" "(" arguments ")"
arguments    ::= ( argument ( "," argument )* )?
argument     ::= expression | NAME "=" expression
```

`target` is a name that was bound by an earlier statement. `expression` is the ordinary
MathScript expression grammar, unchanged.

A statement that is a bare expression is the **old data form** — the one-expression case:

```mathscript
document({ type: "article", content: [ … ] })
```

Any other bare expression is an error: an expression on its own does not make a document.

### 2.2 The statements that exist

| Statement | Meaning |
| --- | --- |
| `name = Document(…)` | creates the document and binds `name` to it |
| `name = target.method(…)` | appends a block to `target` and binds `name` to the new block |
| `target.method(…)` | appends a block to `target` |
| `name = expression` | **removed** — see below |

**Why `name = expression` is gone.** If a binding could hold a value, then `n = 5` would look like
an assignment, and a section named `e` or `i` would collide with the constants and with ordinary
mathematical variables. So a binding may only name **a document or a block**, and a bound name may
only be used as the target of a method call. A name that appears before a dot is a block; anywhere
else it is a mathematical variable.

The consequence is a small but important rule: **a statement that begins with `NAME =` is always a
binding**, and its right-hand side must be a call. `n = 5` is therefore not a statement at all:

```
error: only a document or a block can be named; 'n = 5' is not a statement
```

### 2.3 Containers, leaves, and reference lists

A **container** holds blocks. A **leaf** holds content. A **reference list** holds entries.

| Container | Positional arguments | Named arguments | Holds |
| --- | --- | --- | --- |
| the document | — | `type`, `title`, `subtitle`, `author`, `date`, `language`, `keywords`, `abstract`, `affiliations` | every block |
| `section`, `subsection`, `subsubsection` | `title` | `content`, `label` | blocks |
| `theorem`, `lemma`, `definition`, `corollary` | `title` | `content`, `label` | blocks |
| `proof` | — | `content`, `title` | blocks |
| `quote` | — | `content` | blocks |

| Leaf | Positional arguments | Named arguments | Holds |
| --- | --- | --- | --- |
| `paragraph` | content (strings and inline expressions) | — | one paragraph |
| `equation` | one expression | `number`, `label` | one equation |
| `aligned` | a list of relations | `number`, `label` | one aligned block |
| `table` | a header list, a list of rows | `caption`, `label`, `align` | one table |
| `listing` | the source text | `language`, `caption`, `label` | one listing |
| `page_break` | — | — | one page break |
| `figure` | — | `caption`, `label` | images |
| `bullets`, `numbered` | a list of items | — | one list |

| Reference list | Positional arguments | Named arguments | Holds |
| --- | --- | --- | --- |
| `bibliography` | — | — | entries |
| `book`, `article`, `inproceedings`, `website`, `techreport`, `misc` | the key | the fields of that type | one entry |

A **figure** is a container of images:

| Container | Positional arguments | Named arguments | Holds |
| --- | --- | --- | --- |
| `image` | the source path | `width`, `height`, `alt` | one image |

**The content of a container is the named argument `content`.** A container with one piece of prose
takes it there, so it needs no variable of its own:

```mathscript
defs.theorem("Convergence", content="The sequence increases and stays below 2.", label="thm:conv")
defs.proof(content="Compare with the telescoping series.")
notes.quote(content="The purpose of computing is insight, not numbers.")
```

The content is a **string**, which becomes one paragraph. A container with several blocks is bound
and filled by method calls:

```mathscript
closed = document.section("The closed form")
closed.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
closed.paragraph("The identity is proved by induction.")
```

A method may only be called on a container, and only with a name that container accepts.

### 2.4 `=` means two different things, and **position** decides which

| Where | `=` means |
| --- | --- |
| at the start of a statement | **binding** — `main = document.section("…")` |
| inside an argument list, in a **positional** slot | the **equality relation** — `equation(a = b)` |
| inside an argument list, in a **named** slot | a **named argument** — `number=true` |

**Each method declares how many positional arguments it takes.** While those slots are unfilled,
`=` is the equality relation. Once they are filled, every remaining argument must be
`NAME = value`, and the name must be one the method declares.

```mathscript
equation(a = b)                  // the relation, in the positional slot
equation(a = b, label="x")       // the relation, then a named argument
equation(a = b, numbered=true)   // error: unknown named argument 'numbered'
```

A variadic method such as `paragraph` takes no named arguments at all, so `=` inside it is always
the equality relation. The parser therefore needs only one table: the arity of every method.

The two rules that keep this unambiguous, exactly as today:

1. **Positional arguments come first.** After the first named argument, every argument must be
   named.
2. **A named argument is a name the method declares.** Anything else is an error, and the error
   lists the valid names.

### 2.5 Strictness: one name for one thing

| Thing | The one spelling | Rejected |
| --- | --- | --- |
| the document constructor | `Document(…)` | `document(…)` |
| the prose block | `paragraph(…)` | `text(…)` |
| the equation number flag | `number=true` | `numbered=true` |
| booleans | `true`, `false` | `True`, `False` |
| the section | `section(…)` | `chapter(…)`, `heading(…)` |
| the page setup | `document.page(size=…, margin=…)` | a separate `margins(…)` call, `margins={…}` |
| a reference entry | `refs.book(…)`, `refs.article(…)` | `type="book"` as a named argument |
| a label | `label="eq:x"` as a named argument | a `label("eq:x")` method |

`paragraph` is renamed in **both** forms. The data form uses `paragraph(…)` too, so there is one
name for the block in either syntax.

An unknown name, method, or named argument is an error that **lists the valid ones**:

```
error: unknown named argument 'numbered' for equation; expected number, label
error: unknown method 'chapter' on a document; expected section, subsection, …
error: 'document' is not a name; a document is created with Document(…)
```

### 2.6 Where a statement ends

- A statement ends at a **newline**, when the brackets are balanced. A statement may also end at
  the end of the source.
- **Trailing commas are allowed**, so a call may be spread over several lines.
- A line that continues inside an open bracket, a string, or a comment is part of the same
  statement.

```mathscript
main.paragraph("The classical treatment is ", cite("euler1748"),
               "; a modern account is ", cite("hardy2008", "smith2024"), ".")
```

### 2.7 What is deliberately absent

No loops. No conditionals. No variables beyond the ones a statement binds. No functions. No
expressions with side effects. The surface is a *notation for a document*, not a program.

This is the line that keeps the project honest. The moment `for` exists, people expect a language;
the moment a language exists, the "parsed as data, never executed" promise is gone, and the engine
stops being portable to another language without becoming a runtime.

---

## 3. The tree does not change

Every statement desugars into the tree that exists today.

| Statement | Tree |
| --- | --- |
| `document = Document(type="article", title="T")` | the document, with that metadata and no blocks yet |
| `main = document.section("Main Text")` | a section appended to the document, `main` bound to it |
| `main.paragraph("…")` | a paragraph appended to the section |
| `main.equation(e, number=true, label="eq:x")` | an equation, numbered, labelled `eq:x` |
| `refs = document.bibliography()` | the reference list of the document |
| `refs.book("k", author="…", year=1748)` | one book entry on that list |
| `document.page(size="A4", columns=2, margin="25mm")` | the page configuration |
| `defs.theorem("T", content="…", label="thm:t")` | a theorem with one paragraph |

So the renderer, the LaTeX exporter, the standalone HTML export, the label and reference
validation, the bibliography validation, the manifest, and the command-line host are **untouched**.

---

## 4. The complete method catalogue

### 4.1 On the document

| Method | Positional | Named |
| --- | --- | --- |
| `Document` | — | `type`, `title`, `subtitle`, `author`, `date`, `language`, `keywords`, `abstract`, `affiliations` |
| `section`, `subsection`, `subsubsection` | `title`, content? | `label` |
| `paragraph` | content | — |
| `equation` | expression | `number`, `label` |
| `aligned` | list | `number`, `label` |
| `table` | header list, row list | `caption`, `label`, `align` |
| `figure` | — | `caption`, `label` |
| `listing` | source | `language`, `caption`, `label` |
| `theorem`, `lemma`, `definition`, `corollary` | `title`, content? | `label` |
| `proof` | content? | `title` |
| `quote` | content? | — |
| `bullets`, `numbered` | list | — |
| `page_break` | — | — |
| `page` | — | `size`, `orientation`, `columns`, `margin`, `margin_top`, `margin_right`, `margin_bottom`, `margin_left` |
| `bibliography` | — | — |

### 4.2 On a container

The same list as §4.1, minus `Document`, `page`, and `bibliography`.

### 4.3 On a figure

| Method | Positional | Named |
| --- | --- | --- |
| `image` | source | `width`, `height`, `alt` |

### 4.4 On a reference list

One method per reference type. The key is the first positional argument; the rest are that type's
fields.

| Method | Positional | Named |
| --- | --- | --- |
| `book` | key | `author`, `title`, `year`, `publisher`, `edition`, `address`, `doi`, `url` |
| `article` | key | `author`, `title`, `year`, `journal`, `volume`, `issue`, `pages`, `doi`, `url` |
| `inproceedings` | key | `author`, `title`, `year`, `booktitle`, `pages`, `publisher`, `doi`, `url` |
| `website` | key | `author`, `title`, `year`, `url`, `note` |
| `techreport` | key | `author`, `title`, `year`, `institution`, `number`, `url` |
| `misc` | key | `author`, `title`, `year`, `note`, `url` |

The validator already knows which fields each type requires, so the errors are specific:

```
error: an article reference requires 'journal'
error: a book reference requires 'publisher'
```

### 4.5 Inline expressions (unchanged — they are expressions, not statements)

`bold`, `italic`, `underline`, `emphasis`, `code_text`, `inline`, `ref`, `cite` are called exactly
as they are today, inside a paragraph or another expression:

```mathscript
main.paragraph("Prose can be ", bold("bold"), ", ", italic("italic"), ", or ", code_text("code_text"), ".")
main.paragraph("See ", ref("eq:euler"), " and ", cite("euler1748"), ".")
```

---

## 5. Every old construct, rewritten

| Today | Proposed |
| --- | --- |
| `document({ … })` | `document = Document(…)` |
| `content: [ … ]` | the blocks are appended to their container |
| `section("T", [ … ])` | `main = document.section("T")`, then `main.…` |
| `subsection("T", [ … ])` | `sub = main.subsection("T")`, then `sub.…` |
| `subsubsection("T", [ … ])` | `sub = main.subsubsection("T")`, then `sub.…` |
| `text("…", x, "…")` | `main.paragraph("…", x, "…")` |
| `equation(e, number=true, label="eq:x")` | `main.equation(e, number=true, label="eq:x")` |
| `aligned([…], number=true)` | `main.aligned([…], number=true)` |
| `table([h…], [r…], caption="…", label="…", align=[…])` | `main.table([h…], [r…], caption="…", label="…", align=[…])` |
| `figure(image("x.svg", width="70%"), caption="…", label="…")` | `fig = main.figure(caption="…", label="…")` then `fig.image("x.svg", width="70%")` |
| `listing("src", language="js", caption="…")` | `main.listing("src", language="js", caption="…")` |
| `label("eq:x")` | **removed** — use `label="eq:x"` on the block |
| `page_break()` | `main.page_break()` |
| `page({ size: "A4", columns: 2, margins: {…} })` | `document.page(size="A4", columns=2, margin="25mm")` |
| `quote([text("…")])` | `notes.quote(content="…")` |
| `bullets([…])` | `main.bullets([…])` |
| `numbered([…])` | `main.numbered([…])` |
| `theorem("T", [ … ])` | `defs.theorem("T", content="…", label="thm:t")` |
| `lemma`, `definition`, `corollary` | the same shape as `theorem` |
| `proof([ … ])` | `defs.proof(content="…")` |
| `bibliography([{ … }])` | `refs = document.bibliography()` then `refs.book("k", …)`, one call per entry |

**Not one object literal and not one list of blocks is needed anywhere in a document.** The only
lists left are lists of *values* — the rows of an `aligned` block, the cells of a `table`, the items
of a `bullets` block.

---

## 6. All eleven examples, rewritten

### 6.1 Article: summing squares

```mathscript
document = Document(type="article", title="Summing Squares", author="Ada Lovelace", date="1842",
                    abstract="A short note on the closed form of sum(i, 1, n, i^2).")

document.page(size="A4", margin="24mm")

intro = document.section("Introduction")
intro.paragraph("The sum of the first ", n, " squares is written ", inline(sum(i, 1, n, i^2)),
                ". Its growth is cubic in ", n, ", as ", ref("fig:growth"),
                " suggests and ", ref("eq:series"), " states exactly.")

closed = document.section("The closed form")
closed.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
closed.paragraph("The identity is proved by induction. The first few values are")
closed.table(["n", "sum(i, 1, n, i^2)"], [[1, 1], [2, 5], [3, 14], [4, 30]],
             caption="Small values of the sum of squares", label="tab:values",
             align=["center", "right"])

fig = closed.figure(caption="The sum of squares grows like the integral of the square function",
                    label="fig:growth")
fig.image("assets/sum-of-squares.svg", width="70%", alt="Growth of the sum of squares")

remarks = document.section("Remarks")
remarks.bullets(["The formula is a polynomial of degree three in n.",
                  "The same argument gives the sum of cubes.",
                  "The identity is used in least-squares fitting."])
remarks.aligned([2*x + y = 5, x - y = 1], number=true, label="eq:system")
remarks.paragraph("The related system ", ref("eq:system"), " is solved by elimination.")
```

### 6.2 Report: subtitles, contents, and code

```mathscript
document = Document(type="report", title="Numerical Methods: A Short Report", subtitle="Draft 0.1",
                    author="Grace Hopper", affiliations="EasyTeX Working Group",
                    date="2026-02-14", keywords=["numerics", "convergence", "series"],
                    abstract="We compare the sum of squares with its integral and quantify the error.")

series = document.section("Numerical series")
series.paragraph("Consider the partial sums ", inline(sum(i, 1, n, i^2)), " and the integral ",
                 inline(integral(x, 0, n, x^2)), ".")
series.equation(integral(x, 0, n, x^2) = frac(n^3, 3), number=true, label="eq:integral")

convergence = series.subsection("Convergence")
convergence.paragraph("Equation ", ref("eq:integral"), " shows the cubic behaviour.")
convergence.aligned([limit(n, infinity, frac(sum(i, 1, n, i^2), n^3)) = frac(1, 3)],
                    number=true, label="eq:limit")

implementation = document.section("Implementation")
implementation.paragraph("The check is three lines of code:")
implementation.listing("let total = 0;\nfor (let i = 1; i <= n; i += 1) total += i * i;",
                        language="javascript", caption="Summing squares in linear time",
                        label="lst:sum")

notes = document.section("Notes")
notes.quote(content="The purpose of computing is insight, not numbers.")
```

### 6.3 Academic note: theorems and proofs

```mathscript
document = Document(type="academic_report", title="On the Convergence of a Sequence",
                    author="Emmy Noether",
                    abstract="We define the partial sums of the reciprocal squares and show the sequence is bounded above.")

defs = document.section("Definitions and results")
partial = defs.definition("Partial sums", label="def:partial")
partial.paragraph("For ", inline(n), " a positive integer, write ",
                  inline(S(n) = sum(i, 1, n, frac(1, i^2))), ".")
terms = defs.lemma("Bounded terms")
terms.paragraph("Each term of the sum is at most ", inline(frac(1, i^2)), ".")
convergence = defs.theorem("Convergence", label="thm:conv")
convergence.paragraph("The sequence defined in ", ref("def:partial"),
                      " increases and stays below ", 2, ".")
argument = defs.proof()
argument.paragraph("Compare the series with the telescoping series ",
                    inline(sum(i, 1, n, frac(1, i*(i + 1)))),
                    " and note that every term is smaller.")

discussion = document.section("Discussion")
discussion.paragraph("The bound is not sharp; a sharper bound follows from ", ref("thm:conv"),
                      " together with a comparison with the integral.")
```

### 6.4 Technical document: two columns

```mathscript
document = Document(type="technical_document", title="EasyTeX Formatting Reference",
                    author="The EasyTeX Team")

document.page(size="A4", columns=2, margin="18mm")

styles = document.section("Inline styles")
styles.paragraph("Use ", bold("bold"), ", ", italic("italic"), ", ", underline("underline"), ", ",
                 emphasis("emphasis"), ", and ", code_text("code_text"),
                 " to style prose. Mathematics such as ", inline(frac(a, b)), " sits inline.")
styles.bullets(["Paragraphs are just paragraph(...)", "Lists accept strings or blocks",
                 "Blocks nest freely"])

display = document.section("Display content")
display.aligned([x + y = 5, 2*x - y = 4], number=true, label="eq:lin")
display.paragraph("See ", ref("eq:lin"), " for the system.")
display.listing("sum(i, 1, n, i^2)", language="mathscript", caption="A summation")
```

### 6.5 Citations and bibliography

```mathscript
document = Document(type="academic_report", title="A Note with Sources", author="Nicolas Bourbaki",
                    abstract="We cite two references and point at a labelled equation.")

main = document.section("Main Text")
main.paragraph("The classical treatment is ", cite("euler1748"), "; a modern account is ",
               cite("hardy2008", "smith2024"), ".")
main.equation(e^(i*pi) + 1 = 0, number=true, label="eq:euler")
main.paragraph("Equation ", ref("eq:euler"), " is Euler's identity.")

refs = document.bibliography()
refs.book("euler1748", author="L. Euler", title="Introductio in analysin infinitorum",
          publisher="Bousquet", year=1748)
refs.book("hardy2008", author="G. H. Hardy and E. M. Wright",
          title="An Introduction to the Theory of Numbers",
          publisher="Oxford University Press", year=2008)
refs.article("smith2024", author="J. Smith", title="On a series identity",
             journal="Journal of Examples", volume=12, pages="34-56", year=2024,
             doi="10.1000/example")
```

### 6.6 Letter

```mathscript
document = Document(type="letter", title="Regarding the new notation", author="Ada Lovelace",
                    date="14 February 2026")

document.paragraph("Dear colleague,")
document.paragraph("The document model keeps mathematics in function form, so ", inline(frac(1, 2)),
                    " reads the same in the source and in the output.")
document.bullets(["Numbering is automatic.", "References are checked.", "Exports are plain LaTeX."])
document.paragraph("Yours sincerely, ", bold("Ada Lovelace"))
```

### 6.7 Book: a chapter and a quotation

```mathscript
document = Document(type="book", title="Notes on the Summation of Series", author="Ada Lovelace",
                    date="1843")

one = document.section("Chapter I: On partial sums")
one.paragraph("Let ", inline(S(n) = sum(i, 1, n, i^2)), " denote the partial sum of the squares. ",
              "The difference of two consecutive partial sums is")
one.equation(S(n) - S(n - 1) = n^2, number=true, label="eq:difference")
one.paragraph("Equation ", ref("eq:difference"), " is the whole of the recurrence.")
one.quote(content="The purpose of computing is insight, not numbers.")

two = document.section("Chapter II: The closed form")
two.paragraph("Summing the recurrence gives")
two.equation(S(n) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:closed")
two.numbered(["The identity holds for n = 1.",
              "The right-hand side is a polynomial of degree three.",
              "The formula is used in least-squares fitting."])
```

### 6.8 Thesis: an abstract and a long structure

```mathscript
document = Document(type="thesis", title="Bounds for Partial Sums of Reciprocal Squares",
                    author="Emmy Noether", date="2026",
                    abstract="We show that the partial sums of the reciprocal squares are bounded above by two, and that the bound is approached slowly.",
                    keywords=["series", "bounds", "analysis"])

intro = document.section("Introduction")
intro.paragraph("The partial sums ", inline(S(n) = sum(i, 1, n, frac(1, i^2))),
                " grow without bound but very slowly.")
statement = intro.subsection("The statement")
statement.paragraph("There is a constant ", inline(c), " such that ", inline(S(n) < c),
                    " for every ", inline(n), ".")

proof = document.section("Proof of the bound")
comparison = proof.lemma("Termwise comparison")
comparison.paragraph("For every ", inline(i >= 1), ", ",
                     inline(frac(1, i^2) < frac(1, i*(i - 1))), ".")
bound = proof.theorem("The bound", content="The partial sums are bounded by two.", label="thm:bound")
telescoping = proof.proof()
telescoping.paragraph("Compare the series with the telescoping series ",
                       inline(sum(i, 2, n, frac(1, i*(i - 1)))), ".")
```

### 6.9 Presentation: a landscape page

```mathscript
document = Document(type="presentation", title="Writing Mathematics Without Backslashes",
                    author="The EasyTeX Team")

document.page(size="A4", orientation="landscape", margin="18mm")

idea = document.section("The idea")
idea.paragraph("MathScript writes ", inline(frac(a, b)), " where LaTeX writes a command with a backslash.")
idea.bullets(["Calls instead of commands", "Objects for metadata", "One parser for both layers"])

pipeline = document.section("The pipeline")
pipeline.aligned([x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)], number=true, label="eq:roots")
pipeline.paragraph("The preview and the export come from the same tree.")
```

### 6.10 Handout: a small page with a table

```mathscript
document = Document(type="article", title="A One-Page Handout", author="The EasyTeX Team")

document.page(size="A5", margin="15mm")

reference = document.section("Reference")
reference.table(["Name", "Meaning"],
                [["frac(a, b)", "A fraction"], ["sum(i, 1, n, i^2)", "A sum of squares"]],
                caption="The most used calls", label="tab:calls", align=["left", "left"])
reference.paragraph("Every call takes its arguments in parentheses.")
```

### 6.11 Article: inline styles and mathematical symbols

```mathscript
document = Document(type="article", title="Symbols in Running Text", author="The EasyTeX Team",
                    abstract="Greek names, named symbols, and inline styles all read naturally in the source.")

styles = document.section("Styles")
styles.paragraph("Prose can be ", bold("bold"), ", ", italic("italic"), ", ",
                 underline("underlined"), ", ", emphasis("emphasised"), ", or ",
                 code_text("monospaced"), ".")
styles.paragraph("Mathematics sits inline, as in ", inline(alpha + beta = gamma),
                 ", and symbols such as ", inline(forall), ", ", inline(emptyset), ", and ",
                 inline(aleph), " keep their glyphs.")

display = document.section("A short display")
display.equation(integral(x, 0, infinity, exp(-x^2)*dx) = frac(sqrt(pi), 2), number=true,
                label="eq:gauss")
display.paragraph("Equation ", ref("eq:gauss"), " is the Gaussian integral.")
```

### 6.12 Errors: what diagnostics look like

```mathscript
document = Document(type="article", title="What Errors Look Like", author="EasyTeX")

main = document.section("A broken reference")
main.paragraph("See ", ref("eq:missing"), " for details.")

main.sectoin("A misspelled method", "The suggestion points at section().")

main.equation(x = 1, number=true, label="eq:first")
main.equation(x = 2, number=true, label="eq:first")

main.table(["A", "B"], [["1"]], caption="A ragged table")
```

---

## 7. What happens to the old syntax

**It is removed.** The data form is gone: there is one document syntax, it is the statement syntax,
and it is the only one the reference, the completion, the highlighting, and the examples teach.

A source that still uses the old form is refused with a readable diagnostic rather than a silent
misreading:

```mathscript
document({ type: "article", content: [ text("Hello") ] })
→ error document: A document is created with Document(...) and built with statements;
  an expression on its own is not a document
```

Nothing was lost with it: the old form was a way of building the same tree, and the tree, the
renderer, the exporters, and the manifest are unchanged.

---

## 8. Two bugs this rewrite exposes in the current examples

Both are in the **shipped** examples, not only in this proposal, and both are fixed by the change:

1. `bullets(["The formula is a polynomial in ", n, " of degree three.", …])` makes **three**
   bullets, not one with a variable inside it — a list element is one item. The examples now use
   one string per bullet.
2. `a_n` is a valid identifier, but it renders as the literal text `a_n`, not as a subscript.
   The examples now use `S(n)` for the partial sums, as the book and thesis examples already did.

---

## 9. How it is built, if you approve

1. **The contract** — this file, agreed.
2. **The parser** — `parseProgram()` beside `parse()`: statements plus the unchanged expression
   grammar, with the arity table that decides positional from named arguments.
3. **The desugarer** — statements to tree. Total, side-effect free, about 150 lines.
4. **The builder** — split into the shared core (metadata, blocks, all the validation) and two
   front ends. The tree, the renderer, the exporter, and the manifest do not change.
5. **The writer** — the examples rewritten, the formatter taught the statement shape, the
   completion taught the method names and the named arguments of each, and the two example bugs
   above fixed.
6. **The reference and the specification** — the statement form documented; the data form described
   as the one-expression case.
7. **The tests** — the parser, the desugarer, the diagnostics, and the key one: *both forms produce
   the same tree*.

The work is additive: nothing is removed, so every commit is shippable and the site keeps working
throughout.

---

## 10. What was decided

1. **§2 approved** — the grammar, the containers and leaves, the two meanings of `=`, the
   strictness list, and the newline rule are the ones written above.
2. **§7 decided: the data form is removed.** One syntax, taught everywhere.
3. **The renames and removals confirmed**: `text` → `paragraph`; `Document` capital only;
   `numbered=` gone; the `label(…)` method gone; the page setup is one call; the reference types
   are methods.
4. **Stricter, in three places**: the content of a container is the named argument `content`; a
   heading keeps its level, so a subsubsection needs a subsection; and a method that may not be
   called on a container is refused with the list of methods that may.
