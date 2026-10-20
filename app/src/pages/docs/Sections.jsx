import { memo, useMemo } from "react";
import {
  BIBLIOGRAPHY_TYPES,
  DOCUMENT_NOTES,
  GREEK_DOCS,
  LATEX_DOCS,
  PAGE_SIZES,
  PRECEDENCE_EXAMPLES,
  SYMBOL_DOCS,
  SYNTAX_NOTES,
  TEMPLATES,
  TEMPLATE_NAMES,
  compile,
  compileDocument,
  groupComponentsByCategory,
  groupConstantsByCategory,
  groupFieldsByScope,
  groupFunctionsByCategory,
  groupLatexBySection,
  groupOperatorsByCategory,
  resolveImageSources
} from "../../lib/engine.js";
import { copyText } from "../../lib/copy.js";
import { HighlightedCode } from "../../components/HighlightedCode.jsx";
import { ComponentCard, FunctionCard } from "./Cards.jsx";
import { Example } from "./Example.jsx";

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useMatcher(query) {
  const needle = query.trim().toLowerCase();
  return useMemo(() => {
    const matcher = (haystack) => needle === "" || String(haystack).toLowerCase().includes(needle);
    matcher.active = needle !== "";
    return matcher;
  }, [needle]);
}

function Section({ id, title, count, children, hidden = false }) {
  return (
    <section className="docs-section" id={id} hidden={hidden}>
      <h2>
        {title}
        {typeof count === "number" ? (
          <span className="section-count">{`${count} ${count === 1 ? "entry" : "entries"}`}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

const HERO_SOURCE = "x = frac(-b + sqrt(b^2 - 4*a*c), 2*a)";

export const DOCUMENT_SAMPLE = `document = Document(type="article", title="Summing Squares", author="Ada Lovelace", abstract="A one-page note on sum(i, 1, n, i^2).")
main = document.section("The closed form")
main.paragraph("The sum of the first ", n, " squares is ", inline(sum(i, 1, n, i^2)), ".")
main.equation(sum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6), number=true, label="eq:series")
main.paragraph("See ", ref("eq:series"), " for the closed form.")`;

export function Hero() {
  const result = compile(HERO_SOURCE);
  return (
    <section className="docs-hero" id="about-easytex">
      <p className="docs-eyebrow">EasyTeX · MathScript 0.1-draft</p>
      <h2>EasyTeX &amp; MathScript</h2>
      <p>
        EasyTeX is the application. MathScript is the function-based language it reads. This
        reference documents both, from the syntax rules and built-ins to every document component
        and metadata field.
      </p>
      <div className="about-grid">
        <article className="about-card">
          <p className="about-card-label">The application</p>
          <h3>EasyTeX</h3>
          <p>
            A local, zero-dependency editor and document writer for mathematics. It validates
            MathScript, renders native MathML, exports LaTeX or standalone HTML, and prints to PDF.
            Nothing is sent to a server, and MathScript source is parsed as data — never executed.
          </p>
        </article>
        <article className="about-card">
          <p className="about-card-label">The language</p>
          <h3>MathScript</h3>
          <p>
            A function-based mathematical notation: write <code>frac(a, b)</code> or{" "}
            <code>sum(i, 1, n, i^2)</code> instead of backslash commands. “=” means equality,
            free applications such as f(x) are valid, and there is no implicit multiplication. It is
            not LaTeX.
          </p>
        </article>
      </div>
      <div className="docs-hero-example">
        <div className="docs-hero-example-head">
          <span>MathScript in</span>
          <span>Typeset out</span>
        </div>
        <HighlightedCode as="code" className="docs-hero-code" source={HERO_SOURCE} />
        <div
          className="docs-hero-preview"
          dangerouslySetInnerHTML={{ __html: result.mathml ?? "" }}
        />
      </div>
    </section>
  );
}

export function FunctionsSection({ query }) {
  const matches = useMatcher(query);
  const groups = groupFunctionsByCategory();
  return groups.map((group) => {
    const items = group.items.filter((doc) =>
      matches([doc.name, doc.signature, doc.summary, doc.category].join(" "))
    );
    return (
      <Section
        key={group.category}
        id={`functions-${slugify(group.category)}`}
        title={group.category}
        count={group.items.length}
        hidden={matches.active && items.length === 0}
      >
        {items.map((doc) => (
          <FunctionCard doc={doc} key={doc.name} />
        ))}
      </Section>
    );
  });
}

export function ConstantsSection({ query }) {
  const matches = useMatcher(query);
  const groups = groupConstantsByCategory();
  return groups.map((group) => {
    const items = group.items.filter((doc) =>
      matches([doc.name, doc.signature, doc.summary, doc.category].join(" "))
    );
    return (
      <Section
        key={group.category}
        id={`constants-${slugify(group.category)}`}
        title={group.category}
        count={group.items.length}
        hidden={matches.active && items.length === 0}
      >
        {items.map((doc) => (
          <FunctionCard doc={doc} key={doc.name} />
        ))}
      </Section>
    );
  });
}

export function GreekSection({ query }) {
  const matches = useMatcher(query);
  const rows = GREEK_DOCS.filter((doc) =>
    matches(`${doc.name} greek letter ${doc.symbol} ${doc.latex} ${doc.note}`)
  );
  return (
    <Section id="greek-letters" title="Greek letters" count={GREEK_DOCS.length} hidden={matches.active && rows.length === 0}>
      <p className="docs-lede">
        Greek names are ordinary identifiers: write alpha, beta, sigma, and friends and they render
        as the matching Greek letter in the preview and in the LaTeX export. Variant forms such as
        varepsilon and varphi, and uppercase commands such as Gamma and Omega, use the same
        mechanism. They stay free variables, so they can be bound by sum(...), integral(...), and the
        other binder functions. LaTeX has no \omicron command; the ordinary Latin o is the
        conventional input.
      </p>
      <table className="operator-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Symbol</th>
            <th>LaTeX</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.name}>
              <td className="operator-example">{doc.name}</td>
              <td className="greek-symbol">{doc.symbol}</td>
              <td className="operator-example">{doc.latex}</td>
              <td>{doc.constant ? "Also the numeric constant π." : doc.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

export function SymbolsSection({ query }) {
  const matches = useMatcher(query);
  const rows = SYMBOL_DOCS.filter((doc) =>
    matches(`${doc.name} named symbol ${doc.symbol} ${doc.latex} ${doc.note}`)
  );
  return (
    <Section id="named-symbols" title="Named symbols" count={SYMBOL_DOCS.length} hidden={matches.active && rows.length === 0}>
      <p className="docs-lede">
        Ordinary mathematical symbols are ordinary identifiers too. Write aleph, hbar, emptyset,
        forall, or ell and the renderers display the matching glyph; the name stays a free variable
        and can be bound by a summation or integral. Operators, relations, arrows, and accents are
        separate constructs and are not part of this table.
      </p>
      <table className="operator-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Symbol</th>
            <th>LaTeX</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.name}>
              <td className="operator-example">{doc.name}</td>
              <td className="symbol-glyph">{doc.symbol}</td>
              <td className="operator-example">{doc.latex}</td>
              <td>{doc.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

export function OperatorsSection({ query }) {
  const matches = useMatcher(query);
  const groups = groupOperatorsByCategory();
  return groups.map((group) => {
    const items = group.items.filter((operator) =>
      matches(`${operator.symbol} ${operator.meaning} ${operator.example}`)
    );
    return (
      <Section
        key={group.category}
        id={`operators-${slugify(group.category)}`}
        title={group.category}
        count={group.items.length}
        hidden={matches.active && items.length === 0}
      >
        <table className="operator-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Meaning</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            {items.map((operator) => (
              <tr key={operator.symbol}>
                <td className="operator-symbol">{operator.symbol}</td>
                <td>{operator.meaning}</td>
                <td className="operator-example">{operator.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    );
  });
}

const LATEX_STATUS_LABELS = {
  native: "native",
  approximate: "approximate",
  none: "no equivalent"
};

const LATEX_STATUS_EXPLANATIONS = {
  native: "Exact MathScript construct.",
  approximate: "Same meaning, with a different spelling or rendering.",
  none: "No native construct in this version; the note explains the gap."
};

const LatexTable = memo(function LatexTable({ rows }) {
  return (
    <table className="operator-table latex-table">
      <thead>
        <tr>
          <th>LaTeX</th>
          <th>MathScript</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((doc) => (
          <tr key={`${doc.category}-${doc.latex}`}>
            <td className="operator-example latex-command">{doc.latex}</td>
            <td className="latex-source">
              {doc.mathscript ? (
                <HighlightedCode as="code" className="docs-inline-code" source={doc.mathscript} />
              ) : (
                <span className="latex-none">—</span>
              )}
            </td>
            <td>
              <span className={`badge latex-status-${doc.status}`}>
                {LATEX_STATUS_LABELS[doc.status] ?? doc.status}
              </span>
            </td>
            <td className="latex-note">{doc.note || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

export function LatexSection({ query }) {
  const matches = useMatcher(query);
  const sections = groupLatexBySection();
  const counts = LATEX_DOCS.reduce((total, doc) => {
    total[doc.status] += 1;
    return total;
  }, { native: 0, approximate: 0, none: 0 });

  return (
    <>
      <Section id="latex-reference" title="LaTeX → MathScript" count={LATEX_DOCS.length}>
        <p className="docs-lede">
          The Comprehensive LaTeX Symbol List is a 604-page font and package catalog, not a list of
          language constructs. This reference covers the standard LaTeX/AMS mathematical
          vocabulary: functions, structures, constants, Greek letters, operators, relations, arrows,
          delimiters, big operators, accents, ordinary symbols, and document constructs. A free
          predicate such as related(a, b) is often the closest MathScript expression for a relation
          with no native operator; a free function can name an operation but cannot reproduce an
          arbitrary glyph. Package-specific fonts, emoji, phonetics, and decorative text glyphs are
          outside MathScript's font-free model.
        </p>
        <div className="latex-summary">
          {["native", "approximate", "none"].map((status) => (
            <div className="latex-summary-item" key={status}>
              <span className={`badge latex-status-${status}`}>{LATEX_STATUS_LABELS[status]}</span>
              <span className="latex-summary-count">{counts[status]}</span>
              <span className="latex-summary-text">{LATEX_STATUS_EXPLANATIONS[status]}</span>
            </div>
          ))}
        </div>
        <p className="docs-caption">
          Use the search box to filter by command, symbol name, category, or meaning. The table covers
          every function, constant, Greek name, operator, and named symbol in the language, plus the
          wider standard notation catalog; it deliberately marks gaps instead of pretending every
          LaTeX package glyph has an equivalent.
        </p>
      </Section>
      {sections.map((sectionSpec) => {
        const rows = sectionSpec.groups.flatMap((group) => group.items);
        const visible = rows.filter((doc) =>
          matches(
            [
              "latex mathscript",
              doc.category,
              doc.latex,
              doc.mathscript ?? "",
              doc.status,
              LATEX_STATUS_LABELS[doc.status] ?? "",
              doc.note
            ].join(" ")
          )
        );
        return (
          <Section
            key={sectionSpec.id}
            id={sectionSpec.id}
            title={sectionSpec.title}
            count={sectionSpec.items.length}
            hidden={matches.active && visible.length === 0}
          >
            {sectionSpec.groups.length > 1
              ? sectionSpec.groups.map((group) => {
                  const groupRows = group.items.filter((doc) =>
                    matches(
                      [
                        "latex mathscript",
                        doc.category,
                        doc.latex,
                        doc.mathscript ?? "",
                        doc.status,
                        LATEX_STATUS_LABELS[doc.status] ?? "",
                        doc.note
                      ].join(" ")
                    )
                  );
                  return (
                    <div key={group.category}>
                      <h3 className="docs-subhead">{group.category}</h3>
                      <LatexTable rows={groupRows} />
                    </div>
                  );
                })
              : <LatexTable rows={visible} />}
          </Section>
        );
      })}
    </>
  );
}

export function SyntaxSection({ query }) {
  const matches = useMatcher(query);
  const notes = SYNTAX_NOTES.filter((note) => matches(`${note.title} ${note.body} ${note.example}`));
  const precedence = PRECEDENCE_EXAMPLES.filter((item) => matches(`${item.source} ${item.meaning}`));

  return (
    <>
      <Section id="syntax-rules" title="Syntax rules" count={SYNTAX_NOTES.length}>
        <div className="syntax-grid">
          {notes.map((note) => (
            <div className="syntax-note" key={note.title}>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
              <HighlightedCode as="code" className="docs-inline-code" source={note.example} />
            </div>
          ))}
        </div>
      </Section>
      <Section
        id="precedence-examples"
        title="Precedence examples"
        count={PRECEDENCE_EXAMPLES.length}
        hidden={matches.active && precedence.length === 0}
      >
        <table className="precedence-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {precedence.map((item) => (
              <tr key={item.source}>
                <td className="operator-example">
                  <HighlightedCode as="code" className="docs-inline-code" source={item.source} />
                </td>
                <td>{item.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

export function DocumentAuthoringSection() {
  const result = compileDocument(DOCUMENT_SAMPLE);
  return (
    <Section id="document-authoring" title="Document authoring">
      <p className="docs-lede">
        A document is a <strong>program of statements</strong>. The first statement creates the
        document and binds it to a name; every other statement is a method call on a bound name, and
        the blocks appear in the order their statements stand. A name stands for a document or a
        block, never for a value, so there is no assignment in the language. The named arguments of
        {"Document(...)"} choose the template and the metadata, {"document.page(...)"} sets the
        geometry, and section, paragraph, equation, table, figure, theorem, and friends build the
        body. Mathematics inside paragraph(...) and inline(...) is ordinary MathScript, checked by
        the same validator as the expression editor.
      </p>
      <div className="docs-doc-actions">
        <a
          className="mini-button"
          href={`/document#src=${encodeURIComponent(DOCUMENT_SAMPLE)}`}
        >
          Open this document in the writer
        </a>
        <button
          type="button"
          className="mini-button"
          onClick={() => copyText(DOCUMENT_SAMPLE, "Document copied")}
        >
          Copy the source
        </button>
      </div>
      <div className="docs-sheet-frame" ref={(node) => node && resolveImageSources(node)}>
        {result.html ? (
          <div dangerouslySetInnerHTML={{ __html: result.html }} />
        ) : (
          <span className="example-error">{result.diagnostics[0]?.message ?? "Render error"}</span>
        )}
      </div>
      <p className="docs-caption">
        The sheet above is rendered by the same engine as the writer preview and the standalone HTML
        download; this card shows the top of the page.
      </p>
      <div className="syntax-grid">
        {DOCUMENT_NOTES.map((note) => (
          <div className="syntax-note" key={note.title}>
            <h3>{note.title}</h3>
            <p>{note.body}</p>
            <HighlightedCode as="code" className="docs-inline-code" source={note.example} />
          </div>
        ))}
      </div>
      <p className="docs-lede">
        Methods are the vocabulary of a document, and inline components are the vocabulary inside a
        paragraph. Each method names the containers it may be called on, and takes the positional
        arguments listed on its card; the named arguments (content, label, number, caption, width,
        and so on) follow them. Every method below is implemented and exercised by the test suite.
      </p>
    </Section>
  );
}

export function TemplatesSection() {
  const notes = TEMPLATE_NAMES.map((name) => TEMPLATES[name]).filter((template) => template.note);
  return (
    <Section id="document-templates" title="Templates" count={TEMPLATE_NAMES.length}>
      <p className="docs-lede">
        The type field selects a template. A template sets heading numbering, whether a table of
        contents and abstract are shown, and the LaTeX document class. Numbering, labels, and
        references keep their meaning across templates.
      </p>
      <table className="operator-table">
        <thead>
          <tr>
            <th>type</th>
            <th>Template</th>
            <th>Description</th>
            <th>Headings</th>
            <th>LaTeX class</th>
          </tr>
        </thead>
        <tbody>
          {TEMPLATE_NAMES.map((name) => {
            const template = TEMPLATES[name];
            return (
              <tr key={name}>
                <td className="operator-symbol">{name}</td>
                <td>{template.label}</td>
                <td>{template.summary}</td>
                <td className="operator-example">{template.numbered ? "numbered" : "unnumbered"}</td>
                <td className="operator-example">{template.latexClass}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {notes.length > 0 ? (
        <div className="syntax-grid">
          {notes.map((template) => (
            <div className="syntax-note" key={template.name}>
              <h3>{`${template.label} export`}</h3>
              <p>{template.note}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

export function PageSection() {
  return (
    <Section id="document-page" title="Page layout">
      <p className="docs-lede">
        Page configuration is declarative and optional. Without a page(...) block a document uses A4,
        portrait, 25 mm margins, and one column. Lengths accept mm, cm, in, pt, and px; the writer
        applies the same geometry to the browser's print layout.
      </p>
      <table className="operator-table">
        <thead>
          <tr>
            <th>size</th>
            <th>Dimensions</th>
            <th>LaTeX option</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(PAGE_SIZES).map(([name, size]) => (
            <tr key={name}>
              <td className="operator-symbol">{name}</td>
              <td>{`${size.width} × ${size.height} mm`}</td>
              <td className="operator-example">{size.latex}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <HighlightedCode
        as="pre"
        className="example-source docs-code-block"
        source={'page({\n  size: "A4",\n  orientation: "portrait",\n  margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" },\n  columns: 2\n})'}
        options={{ fields: true }}
      />
    </Section>
  );
}

function FieldsTable({ fields }) {
  return (
    <table className="args-table">
      <tbody>
        {fields.map((field) => {
          const groups = field.valueGroups?.length
            ? field.valueGroups
            : field.values?.length
              ? [{ label: "Values", values: field.values }]
              : [];
          return (
            <tr key={field.name}>
              <td>
                <code>{field.name}</code>
              </td>
              <td className="arg-type">{field.type ?? ""}</td>
              <td>
                {field.summary}
                {field.description ? ` ${field.description}` : ""}
                {groups.map((group) => (
                  <span key={group.label}>
                    {` ${group.label}${group.defaultValue ? ` (default ${group.defaultValue})` : ""}: ${group.values.join(", ")}.`}
                  </span>
                ))}
                {field.defaultValue ? ` Default: ${field.defaultValue}.` : ""}
                {field.example ? (
                  <HighlightedCode
                    as="code"
                    className="field-example"
                    source={field.example}
                    options={{ fields: true }}
                  />
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function FieldsSection() {
  const groups = groupFieldsByScope();
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <Section id="document-fields" title="Metadata and option fields" count={total}>
      <p className="docs-lede">
        The names that appear inside objects and named arguments: document metadata, page(...)
        options, per-side margins, component named arguments, and bibliography entry fields. The
        writer offers the relevant fields inside each object, and typing &quot;&quot; in a field with
        allowed values or a default opens the value list with the default marked. Hovering a field
        name shows the same notes.
      </p>
      {groups.map((group) => (
        <div key={group.scope}>
          <h3 className="docs-subhead">{group.label}</h3>
          <FieldsTable fields={group.items} />
        </div>
      ))}
      <h3 className="docs-subhead">Reference types</h3>
      <p className="docs-lede">
        Every bibliography entry needs a unique key, an author, a title, and a year. type (default
        &quot;misc&quot;) selects the reference type; the table shows the extra required field and the
        optional fields for each type.
      </p>
      <table className="operator-table">
        <thead>
          <tr>
            <th>type</th>
            <th>Required fields</th>
            <th>Optional fields</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(BIBLIOGRAPHY_TYPES).map(([name, spec]) => {
            const optional = spec.fields.filter((field) => !spec.required.includes(field));
            return (
              <tr key={name}>
                <td className="operator-example">{name}</td>
                <td className="operator-example">{spec.required.join(", ")}</td>
                <td className="operator-example">{optional.length > 0 ? optional.join(", ") : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

export function ComponentsSection({ query }) {
  const matches = useMatcher(query);
  const groups = groupComponentsByCategory();
  return groups.map((group) => {
    const items = group.items.filter((doc) =>
      matches(
        [
          doc.name,
          doc.signature,
          doc.summary,
          doc.category,
          doc.role,
          ...(doc.args ?? []).map((arg) => arg.name),
          ...(doc.named ?? []).map((arg) => arg.name)
        ].join(" ")
      )
    );
    return (
      <Section
        key={group.category}
        id={`components-${slugify(group.category)}`}
        title={group.category}
        count={group.items.length}
        hidden={matches.active && items.length === 0}
      >
        {items.map((doc) => (
          <ComponentCard doc={doc} key={doc.name} />
        ))}
      </Section>
    );
  });
}

export function ExampleList({ examples }) {
  return (
    <div className="example-list">
      {examples.map((example) => (
        <Example example={example} key={example.source} />
      ))}
    </div>
  );
}
