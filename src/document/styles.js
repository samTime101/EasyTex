// Styles for the rendered document sheet. The same stylesheet is injected
// into the Document Writer preview and embedded in standalone HTML exports,
// so what you see while writing is what you download.

export const SHEET_CSS = `
.ms-sheet {
  --ms-ink: #22252b;
  --ms-muted: #5f6672;
  --ms-faint: #8a909b;
  --ms-rule: #d8d6d0;
  --ms-rule-strong: #b9b5ab;
  --ms-accent: #2f4f8f;
  --ms-accent-soft: #eef2f9;
  --ms-code-bg: #f5f5f2;
  --ms-page-width: 794px;
  --ms-page-height: 1123px;
  --ms-margin-top: 90px;
  --ms-margin-right: 90px;
  --ms-margin-bottom: 90px;
  --ms-margin-left: 90px;
  --ms-columns: 1;
  width: var(--ms-page-width);
  max-width: 100%;
  min-height: var(--ms-page-height);
  margin: 0 auto;
  padding: var(--ms-margin-top) var(--ms-margin-right) var(--ms-margin-bottom) var(--ms-margin-left);
  box-sizing: border-box;
  background: #fffefb;
  color: var(--ms-ink);
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif;
  font-size: 16px;
  line-height: 1.62;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  box-shadow: 0 1px 2px rgba(20, 24, 33, 0.12), 0 18px 48px rgba(20, 24, 33, 0.18);
}

.ms-sheet *,
.ms-sheet *::before,
.ms-sheet *::after {
  box-sizing: border-box;
}

.ms-doc {
  min-width: 0;
}

/* ------------------------------------------------------------- title page */

.ms-titleblock {
  margin: 0 0 34px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--ms-rule);
  text-align: center;
}

.ms-title {
  margin: 0;
  font-size: 1.95em;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.ms-subtitle {
  margin: 0.45em 0 0;
  font-size: 1.12em;
  color: var(--ms-muted);
  font-style: italic;
}

.ms-author {
  margin: 1.15em 0 0;
  font-size: 1em;
}

.ms-affiliations,
.ms-date,
.ms-keywords {
  margin: 0.35em 0 0;
  color: var(--ms-muted);
  font-size: 0.86em;
}

.ms-keywords {
  margin-top: 1em;
}

.ms-keywords-label {
  font-variant: small-caps;
  letter-spacing: 0.04em;
}

.ms-titleblock-letter {
  text-align: left;
  border-bottom: 0;
  padding-bottom: 0;
}

.ms-titleblock-letter .ms-title {
  font-size: 1.25em;
  text-align: left;
}

.ms-abstract {
  margin: 0 0 30px;
  padding: 16px 20px;
  background: var(--ms-accent-soft);
  border-left: 3px solid var(--ms-accent);
  border-radius: 2px;
}

.ms-abstract-title {
  margin: 0 0 6px;
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ms-accent);
}

.ms-abstract p {
  margin: 0;
  font-size: 0.94em;
  color: #333944;
}

.ms-toc {
  margin: 0 0 34px;
  padding: 14px 0 16px;
  border-top: 1px solid var(--ms-rule);
  border-bottom: 1px solid var(--ms-rule);
}

.ms-toc-heading {
  margin: 0 0 10px;
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ms-muted);
}

.ms-toc-row {
  display: flex;
  gap: 0.8em;
  align-items: baseline;
  padding: 2px 0;
  color: var(--ms-ink);
  text-decoration: none;
  font-size: 0.92em;
}

.ms-toc-row:hover .ms-toc-title {
  text-decoration: underline;
}

.ms-toc-level-2 {
  padding-left: 1.6em;
  font-size: 0.88em;
  color: var(--ms-muted);
}

.ms-toc-level-3 {
  padding-left: 3.2em;
  font-size: 0.85em;
  color: var(--ms-muted);
}

.ms-toc-number {
  min-width: 1.8em;
  font-variant-numeric: tabular-nums;
  color: var(--ms-muted);
}

.ms-toc-title {
  flex: 1;
}

/* --------------------------------------------------------------- headings */

.ms-section {
  margin: 0;
}

.ms-level-1 {
  margin-top: 0.6em;
}

.ms-heading {
  margin: 1.45em 0 0.65em;
  line-height: 1.25;
  font-weight: 700;
  break-after: avoid;
}

.ms-level-1 > .ms-heading {
  font-size: 1.42em;
}

.ms-level-2 > .ms-heading {
  font-size: 1.16em;
}

.ms-level-3 > .ms-heading {
  font-size: 1em;
  font-style: italic;
}

.ms-section-number {
  display: inline-block;
  min-width: 1.6em;
  margin-right: 0.35em;
  color: var(--ms-muted);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.ms-paragraph {
  margin: 0 0 0.85em;
  text-align: justify;
  hyphens: auto;
}

.ms-paragraph:last-child {
  margin-bottom: 0;
}

/* ----------------------------------------------------------------- maths */

.ms-equation {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8em;
  margin: 1.2em 0;
  break-inside: avoid;
}

.ms-equation-body {
  min-width: 0;
  overflow-x: auto;
  text-align: center;
  padding: 2px 0;
}

.ms-equation math[display="block"] {
  font-size: 1.16em;
}

.ms-equation-number {
  color: var(--ms-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.92em;
  align-self: center;
  padding-top: 0.15em;
}

.ms-aligned-table {
  display: inline-grid;
  grid-template-columns: auto auto auto;
  column-gap: 0.55em;
  row-gap: 0.32em;
  text-align: left;
}

.ms-aligned-left {
  justify-self: end;
}

.ms-aligned-op {
  justify-self: center;
  color: var(--ms-muted);
}

.ms-aligned-right {
  justify-self: start;
}

.ms-inline-math math {
  font-size: 1.02em;
}

.ms-inline-math {
  white-space: nowrap;
}

/* ----------------------------------------------------------------- lists */

.ms-list {
  margin: 0.8em 0 1em;
  padding-left: 1.6em;
}

.ms-list li {
  margin: 0.3em 0;
}

.ms-list .ms-paragraph {
  margin: 0;
  text-align: left;
}

.ms-list .ms-list {
  margin: 0.3em 0 0.2em;
}

/* -------------------------------------------------------- tables, figures */

.ms-table-block,
.ms-figure,
.ms-listing {
  margin: 1.4em 0;
  break-inside: avoid;
}

.ms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.93em;
}

.ms-table th {
  border-top: 1.6px solid var(--ms-ink);
  border-bottom: 1.1px solid var(--ms-rule-strong);
  padding: 0.5em 0.7em;
  font-weight: 700;
  text-align: left;
}

.ms-table td {
  border-bottom: 1px solid var(--ms-rule);
  padding: 0.45em 0.7em;
  vertical-align: top;
}

.ms-table tbody tr:last-child td {
  border-bottom: 1.4px solid var(--ms-ink);
}

.ms-figure,
.ms-table-block {
  text-align: center;
}

.ms-image {
  max-width: 100%;
  height: auto;
  border-radius: 2px;
}

.ms-image-missing {
  display: inline-grid;
  place-items: center;
  min-width: 46%;
  min-height: 120px;
  padding: 18px;
  border: 1px dashed var(--ms-rule-strong);
  border-radius: 4px;
  background: #f7f7f4;
  color: var(--ms-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78em;
  text-align: center;
}

.ms-caption {
  margin: 0.7em auto 0;
  max-width: 92%;
  color: var(--ms-muted);
  font-size: 0.84em;
  line-height: 1.45;
  text-align: center;
}

.ms-caption-number {
  font-weight: 700;
  color: var(--ms-ink);
}

.ms-listing-code {
  position: relative;
  margin: 0;
  padding: 14px 16px;
  background: var(--ms-code-bg);
  border: 1px solid var(--ms-rule);
  border-radius: 4px;
  overflow-x: auto;
  font-family: "SFMono-Regular", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace;
  font-size: 0.78em;
  line-height: 1.55;
  text-align: left;
  white-space: pre-wrap;
}

.ms-listing-language {
  position: absolute;
  top: 6px;
  right: 8px;
  color: var(--ms-faint);
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ms-quote {
  margin: 1.2em 0;
  padding: 0.1em 0 0.1em 1.1em;
  border-left: 3px solid var(--ms-rule-strong);
  color: #4a505c;
  font-style: italic;
}

.ms-quote .ms-paragraph {
  text-align: left;
}

/* ---------------------------------------------------- theorems and proofs */

.ms-theorem {
  margin: 1.2em 0;
  padding: 0.8em 1.05em;
  background: #f8f9fb;
  border-left: 3px solid var(--ms-accent);
  border-radius: 2px;
  break-inside: avoid;
}

.ms-theorem-head {
  margin: 0 0 0.35em;
}

.ms-theorem-label {
  font-weight: 700;
}

.ms-theorem-title {
  font-style: italic;
  color: var(--ms-muted);
}

.ms-theorem .ms-paragraph {
  text-align: left;
}

.ms-proof {
  margin: 1em 0 1.2em;
}

.ms-proof-head {
  margin: 0 0 0.3em;
  font-style: italic;
  font-weight: 600;
}

.ms-proof-end {
  margin: 0.2em 0 0;
  text-align: right;
  color: var(--ms-muted);
}

/* ----------------------------------------------------------- bibliography */

.ms-bibliography {
  margin-top: 2.2em;
  padding-top: 1.2em;
  border-top: 1px solid var(--ms-rule);
}

.ms-bibliography-heading {
  margin-top: 0;
  font-size: 1.15em;
}

.ms-bib-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ms-bib-entry {
  margin: 0.45em 0;
  padding-left: 2.4em;
  text-indent: -2.4em;
  font-size: 0.88em;
  line-height: 1.5;
}

.ms-bib-number {
  display: inline-block;
  min-width: 1.9em;
  color: var(--ms-muted);
  font-variant-numeric: tabular-nums;
}

/* -------------------------------------------------- references and links */

.ms-ref,
.ms-cite {
  color: var(--ms-accent);
  text-decoration: none;
  border-bottom: 1px dotted color-mix(in srgb, var(--ms-accent) 55%, transparent);
}

.ms-ref:hover,
.ms-cite:hover {
  border-bottom-style: solid;
}

.ms-ref-broken,
.ms-cite-broken {
  color: #b42318;
  background: #fef3f2;
  border-radius: 3px;
  padding: 0 3px;
  font-weight: 700;
}

.ms-code-text {
  font-family: "SFMono-Regular", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace;
  font-size: 0.86em;
  background: var(--ms-code-bg);
  border: 1px solid var(--ms-rule);
  border-radius: 3px;
  padding: 0.05em 0.3em;
}

.ms-emphasis {
  font-style: italic;
}

/* ------------------------------------------------------------- page break */

.ms-page-break {
  position: relative;
  margin: 2.4em 0;
  border-top: 2px dashed #c4c8d0;
  break-after: page;
}

.ms-page-break::after {
  content: "page break";
  position: absolute;
  right: 0;
  top: -0.72em;
  padding: 0 0.5em;
  background: #fffefb;
  color: var(--ms-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.62em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ------------------------------------------------------------ multi-column */

.ms-doc.ms-multicolumn {
  column-count: var(--ms-columns);
  column-gap: 2.2em;
}

.ms-multicolumn .ms-equation,
.ms-multicolumn .ms-figure,
.ms-multicolumn .ms-table-block,
.ms-multicolumn .ms-theorem,
.ms-multicolumn .ms-listing {
  break-inside: avoid;
}

/* ------------------------------------------------------------------ print */

@media print {
  .ms-sheet {
    width: 100%;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
    background: #fff;
  }

  .ms-page-break {
    border: 0;
    margin: 0;
  }

  .ms-page-break::after {
    display: none;
  }
}
`;
