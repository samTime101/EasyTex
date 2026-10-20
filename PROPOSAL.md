# PROPOSAL — the statement syntax for documents

**Status:** proposal. Nothing in this file is implemented yet.
**Decision:** approve, or amend, before any code is written.

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

document.bibliography(type="book", key="euler1748", author="L. Euler",
                      title="Introductio in analysin infinitorum",
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
program     ::= statement*
statement  ::= binding | method-call
binding    ::= NAME "=" method-call
method-call::= target "." NAME "(" arguments ")"
arguments  ::= ( argument ( "," argument )* )?
argument   ::= expression | NAME "=" expression
```

That is the complete list. There is no other kind of statement.

### 2.2 The four statements that exist

| Statement | Meaning |
| --- | --- |
| `name = Document(…)` | creates the document and binds `name` to it |
| `name = target.method(…)` | appends a block to `target` and binds `name` to the new block |
| `target.method(…)` | appends a block to `target` |
| `name = expression` | binds a name to any expression (a value, not a block) |

`Document(…)` is the only way to create a document, and it must be bound.

### 2.3 Containers and leaves

A **container** holds blocks. A **leaf** holds content.

| Container | Holds |
| --- | --- |
| the document | every block |
| `section`, `subsection`, `subsubsection` | blocks, and a title |
| `theorem`, `lemma`, `definition`, `corollary` | blocks, and a title |
| `proof` | blocks, and an optional title |
| `quote` | blocks |

| Leaf | Holds |
| --- | --- |
| `paragraph` | strings and inline expressions |
| `equation` | one expression |
| `aligned` | a list of relations |
| `table` | a header list, a row list, and optional named arguments |
| `listing` | a source string |
| `label` | a label name |
| `page_break` | nothing |

A method may only be called on a container, and only with a name that container accepts.

### 2.4 `=` means two different things, in two different places

| Where | `=` means |
| --- | --- |
| at the start of a statement | **binding**: `main = document.section("…")` |
| inside an argument list | **the equality relation**, when the name is not one of the callee's named arguments |
| inside an argument list, with a name the callee declares | **a named argument**: `number=true` |

The rules that keep this unambiguous, exactly as today:

1. **Positional arguments come first.** After the first named argument, every argument must be
   named. `equation(x, number=true, label="eq:a")` ✓; `equation(number=true, x)` is an error.
2. **A named argument is a name the callee declares.** Anything else is the equality relation.
3. **Inside an argument, the equality relation still needs its operands to be relations**:
   `e^(i*pi) + 1 = 0` is a relation ✓, and `a = b` inside a call is a *named argument attempt*,
   which is an error unless `a` is declared ✓ (the same rule as today).

### 2.5 Strictness: one name for one thing

| Thing | The one spelling | Rejected |
| --- | --- | --- |
| the document constructor | `Document(…)` | `document(…)` |
| the equation number flag | `number=true` | `numbered=true` |
| booleans | `true`, `false` | `True`, `False` |
| the prose block | `paragraph(…)` | `text(…)` as a block |
| the section | `section(…)` | `chapter(…)`, `heading(…)` |
| margins | `document.margins(top=…, right=…, bottom=…, left=…)` | `margins={…}` |

An unknown name, method, or named argument is an error that **lists the valid ones**:

```
error: unknown named argument 'numbered' for equation; expected number, label
error: unknown method 'chapter' on a document; expected section, subsection, …
error: 'document' is not a name; a document is created with Document(…)
```

### 2.6 What is deliberately absent

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
| `document.bibliography(type="book", key="k", …)` | one reference entry on the document |
| `document.page(size="A4", columns=2)` | the page configuration |
| `document.margins(top="25mm", …)` | the page margins |

So the renderer, the LaTeX exporter, the standalone HTML export, the label and reference
validation, the bibliography validation, the manifest, and the command-line host are **untouched**.

---

## 4. The complete method catalogue

### 4.1 On the document

| Method | Positional arguments | Named arguments |
| --- | --- | --- |
| `Document` | — | `type`, `title`, `subtitle`, `author`, `date`, `language`, `keywords`, `abstract`, `affiliations` |
| `section` | `title` | `label` |
| `subsection` | `title` | `label` |
| `subsubsection` | `title` | `label` |
| `paragraph` | content (strings and inline expressions) | — |
| `equation` | one expression | `number`, `label` |
| `aligned` | a list of relations | `number`, `label` |
| `table` | a header list, a list of rows | `caption`, `label`, `align` |
| `figure` | — | `caption`, `label` |
| `listing` | the source text | `language`, `caption`, `label` |
| `label` | the label name | — |
| `page_break` | — | — |
| `page` | — | `size`, `orientation`, `columns` |
| `margins` | — | `top`, `right`, `bottom`, `left` |
| `bibliography` | — | `type`, `key`, `author`, `title`, `year`, `journal`, `volume`, `issue`, `pages`, `publisher`, `edition`, `address`, `booktitle`, `institution`, `note`, `doi`, `url` |

### 4.2 On a section (and on every other container)

| Method | Positional arguments | Named arguments |
| --- | --- | --- |
| `section`, `subsection`, `subsubsection` | `title` | `label` |
| `paragraph` | content | — |
| `equation` | one expression | `number`, `label` |
| `aligned` | a list of relations | `number`, `label` |
| `table` | a header list, a list of rows | `caption`, `label`, `align` |
| `figure` | — | `caption`, `label` |
| `listing` | the source text | `language`, `caption`, `label` |
| `theorem`, `lemma`, `definition`, `corollary` | `title` | `label` |
| `proof` | — | `title` |
| `quote` | — | — |
| `bullets`, `numbered` | a list of items | — |
| `label` | the label name | — |
| `page_break` | — | — |

### 4.3 On a figure

| Method | Positional arguments | Named arguments |
| --- | --- | --- |
| `image` | the source path | `width`, `height`, `alt` |

### 4.4 Inline expressions (unchanged — they are expressions, not statements)

`bold`, `italic`, `underline`, `emphasis`, `code_text`, `inline`, `ref`, `cite` are called
exactly as they are today, inside a paragraph or another expression:

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
| `label("eq:x")` | `main.label("eq:x")` |
| `page_break()` | `main.page_break()` |
| `page({ size: "A4", columns: 2, margins: {…} })` | `document.page(size="A4", columns=2)` and `document.margins(top="25mm", …)` |
| `quote([text("…")])` | `q = main.quote()` then `q.paragraph("…")` |
| `bullets([…])` | `main.bullets([…])` |
| `numbered([…])` | `main.numbered([…])` |
| `theorem("T", [ … ])` | `th = main.theorem("T")`, then `th.…` |
| `lemma`, `definition`, `corollary` | the same shape as `theorem` |
| `proof([ … ])` | `pr = main.proof()`, then `pr.…` |
| `bibliography([{ … }])` | `document.bibliography(type="book", key="…", …)`, one call per entry |

**Not one object literal and not one list of blocks is needed anywhere in a document.** The only
lists left are lists of *values* — the rows of an `aligned` block, the cells of a `table`, the
items of a `bullets` block.

---

## 6. The examples, rewritten

### 6.1 The default document

```mathscript
document = Document(type="article", title="Summing Squares", author="Ada Lovelace", date="1842",
                    abstract="A short note on the closed form of sum(i, 1, n, i^2).")

document.page(size="A4")
document.margins(top="24mm", right="24mm", bottom="24mm", left="24mm")

intro = document.section("Introduction")
intro.paragraph("The sum of the first ", n, " squares is written ", inline(sum(i, 1, n, i^2)),
                 ". Its growth is cubic in ", n, ", as ", ref("fig:growth"), " suggests and ",
                 ref("eq:series"), " states exactly.")

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
remarks.bullets(["The formula is a polynomial in ", n, " of degree three.",
                  "The same argument gives the sum of cubes.",
                  "The identity is used in least-squares fitting."])
remarks.aligned([2*x + y = 5, x - y = 1], number=true, label="eq:system")
remarks.paragraph("The related system ", ref("eq:system"), " is solved by elimination.")
```

### 6.2 A report, with a listing and a quotation

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
q = notes.quote()
q.paragraph("The purpose of computing is insight, not numbers.")
```

### 6.3 An academic note, with theorems and a proof

```mathscript
document = Document(type="academic_report", title="On the Convergence of a Sequence",
                    author="Emmy Noether",
                    abstract="We define the partial sums of the reciprocal squares and show the sequence is bounded above.")

defs = document.section("Definitions and results")
d = defs.definition("Partial sums")
d.paragraph("For ", inline(n), " a positive integer, write ", inline(a_n = sum(i, 1, n, frac(1, i^2))), ".")
lem = defs.lemma("Bounded terms")
lem.paragraph("Each term of the sum is at most ", inline(frac(1, i^2)), ".")
t = defs.theorem("Convergence")
t.paragraph("The sequence defined in ", ref("def:partial"), " increases and stays below ", 2, ".")
p = defs.proof()
p.paragraph("Compare the series with the telescoping series ", inline(sum(i, 1, n, frac(1, i*(i + 1)))),
             " and note that every term is smaller.")

discussion = document.section("Discussion")
discussion.paragraph("The bound is not sharp; a sharper bound follows from ", ref("thm:conv"),
                      " together with a comparison with the integral.")
```

### 6.4 Citations and a bibliography

```mathscript
document = Document(type="academic_report", title="A Note with Sources", author="Nicolas Bourbaki",
                    abstract="We cite two references and point at a labelled equation.")

main = document.section("Main Text")
main.paragraph("The classical treatment is ", cite("euler1748"), "; a modern account is ",
               cite("hardy2008", "smith2024"), ".")
main.equation(e^(i*pi) + 1 = 0, number=true, label="eq:euler")
main.paragraph("Equation ", ref("eq:euler"), " is Euler's identity.")

document.bibliography(type="book", key="euler1748", author="L. Euler",
                      title="Introductio in analysin infinitorum", publisher="Bousquet", year=1748)
document.bibliography(type="book", key="hardy2008", author="G. H. Hardy and E. M. Wright",
                      title="An Introduction to the Theory of Numbers",
                      publisher="Oxford University Press", year=2008)
document.bibliography(type="article", key="smith2024", author="J. Smith",
                      title="On a series identity", journal="Journal of Examples", volume=12,
                      pages="34-56", year=2024, doi="10.1000/example")
```

### 6.5 A letter, a handout, a presentation, a book, a thesis

The remaining seven examples — the letter, the technical document, the two-column note, the
handout, the presentation, the book, and the thesis — follow the same shape, and are rewritten in
full in the commit that implements this proposal.

---

## 7. What happens to the old syntax

**It keeps working.** The current data form is a program with one statement, so it is *not* a
second grammar — it is a case of the first:

```mathscript
document({ type: "article", content: [ … ] })   ← one expression statement
```

Decision needed: after this lands, should the data form be

- **(a) a documented peer** — both forms are taught in the reference, or
- **(b) a compatibility form** — the reference teaches the statement form only, and the data form
  keeps parsing (and keeps its tests) but is not advertised.

I recommend **(b)**: one form in the documentation, one form to read, and the old one keeps working
for anything already written. The specification would describe the program, and would mention the
data form as the single-expression case.

---

## 8. How it is built, if you approve

1. **The contract** — this file, agreed.
2. **The parser** — `parseProgram()` beside `parse()`: statements plus the unchanged expression
   grammar, reusing today's named-argument rule.
3. **The desugarer** — statements to tree. Total, side-effect free, about 150 lines.
4. **The builder** — split into the shared core (metadata, blocks, all the validation) and two
   front ends. The tree, the renderer, the exporter, and the manifest do not change.
5. **The writer** — the examples rewritten, the formatter taught the statement shape, the
   completion taught the method names and the named arguments of each.
6. **The reference and the specification** — the statement form documented; the data form described
   as the one-expression case.
7. **The tests** — the parser, the desugarer, the diagnostics, and the key one: *both forms produce
   the same tree*.

The work is additive: nothing is removed, so every commit is shippable and the site keeps working
throughout.

---

## 9. What I need from you

1. **Approve or amend the four rules in §2** (the grammar, the containers and leaves, the two
   meanings of `=`, and the strictness list).
2. **Choose (a) or (b) in §7** — is the data form still taught?
3. **Confirm the renames**: `text(…)` becomes `paragraph(…)`; `Document(…)` is capital and
   `document(…)` is gone; `numbered=` is gone in favour of `number=`.
4. **Tell me if you want the surface to be stricter still** — for instance, whether
   `main.paragraph("…")` should require the content in one argument, or whether
   `document.bibliography(…)` should take a list of entries instead of one call per entry.

Nothing is written until you say so.
