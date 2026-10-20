// Field documentation: names that appear inside objects and named arguments,
// as opposed to the callable names in functions.js, constants.js, and the
// component catalog.
//
// The document writer resolves hover tips against this list when a name is
// used as an object key or a named argument; the reference page renders the
// same entries as tables. A conformance test in test/document.test.js checks
// that every metadata key, page option, named argument, and bibliography
// field is documented here, and that no stale names remain.

import { PAGE_SIZES, TEMPLATE_NAMES, TEMPLATES, DEFAULT_PAGE } from "../document/templates.js";
import { BIBLIOGRAPHY_TYPES } from "../document/build.js";

// PAGE_SIZES keys are normalized to upper case; sources write "Letter" and
// "Legal" as title case.
const PAGE_SIZE_VALUES = Object.keys(PAGE_SIZES).map(
  (name) => name.charAt(0) + name.slice(1).toLowerCase()
);

const BIBLIOGRAPHY_TYPE_NAMES = Object.keys(BIBLIOGRAPHY_TYPES);

export const FIELD_SCOPE_ORDER = [
  "metadata",
  "page option",
  "margin",
  "argument",
  "reference field"
];

export const FIELD_SCOPE_LABELS = {
  metadata: "Metadata",
  "page option": "Page options",
  margin: "Margins",
  argument: "Named arguments",
  "reference field": "Reference fields"
};

export const FIELD_DOCS = [
  // -------------------------------------------------------------- metadata
  {
    name: "type",
    scope: "metadata",
    type: "string",
    summary: "Selects the document template.",
    description:
      'In a bibliography entry, type instead selects the reference type (default "misc"): "article", "book", "inproceedings", "website", "techreport", or "misc".',
    valueGroups: [
      {
        label: "Document templates",
        values: TEMPLATE_NAMES,
        defaultValue: TEMPLATES.article.name
      },
      { label: "Reference types", values: BIBLIOGRAPHY_TYPE_NAMES, defaultValue: "misc" }
    ],
    example: 'Document(type="article")'
  },
  {
    name: "title",
    scope: "metadata",
    type: "string or inline content",
    summary: "The document title, shown on the title page.",
    description:
      "A document without a title is reported as a warning. Bibliography entries have their own required title, and proof(...) accepts title= to name the result being proved.",
    example: 'Document(title="A Short Note")'
  },
  {
    name: "subtitle",
    scope: "metadata",
    type: "string or inline content",
    summary: "An optional secondary line under the title.",
    example: 'Document(subtitle="A worked example")'
  },
  {
    name: "author",
    scope: "metadata",
    type: "string or list of strings",
    summary: "The author name or names.",
    description:
      "A document without an author is reported as a warning. Bibliography entries also have a required author field.",
    example: 'Document(author=["A. One", "B. Two"])'
  },
  {
    name: "affiliations",
    scope: "metadata",
    type: "string or list of strings",
    summary: "Institution(s) associated with the author(s).",
    example: 'Document(affiliations="University of Example")'
  },
  {
    name: "date",
    scope: "metadata",
    type: "string",
    summary: "A free-form date line such as \"2026\" or \"October 2026\".",
    description: "Defaults to nothing when omitted.",
    example: 'Document(date="2026")'
  },
  {
    name: "language",
    scope: "metadata",
    type: "string",
    summary: 'A language tag such as "en" or "de".',
    description:
      "Sets the document language in the HTML and LaTeX exports. In listing(...), the language named argument instead names the source language of the code.",
    example: 'Document(language="en")'
  },
  {
    name: "keywords",
    scope: "metadata",
    type: "string or list of strings",
    summary: "Keywords describing the document.",
    example: 'Document(keywords=["series", "summation"])'
  },
  {
    name: "abstract",
    scope: "metadata",
    type: "string or inline content",
    summary: "A summary paragraph shown before the first section.",
    description: "Templates decide whether the abstract is displayed.",
    example: 'Document(abstract="We collect standard finite-sum identities.")'
  },
  // ---------------------------------------------------------- page options
  {
    name: "size",
    scope: "page option",
    type: "string",
    summary: "Paper size.",
    description: "Default A4.",
    values: PAGE_SIZE_VALUES,
    defaultValue: DEFAULT_PAGE.size,
    example: 'page(size="A4")'
  },
  {
    name: "orientation",
    scope: "page option",
    type: "string",
    summary: "Orientation of the page.",
    description: "Default portrait.",
    values: ["portrait", "landscape"],
    defaultValue: DEFAULT_PAGE.orientation,
    example: 'page(orientation="landscape")'
  },
  {
    name: "margin",
    scope: "page option",
    type: "string",
    summary: "The margin on every side of the page.",
    description:
      'A length such as "25mm". Units: mm, cm, in, pt, px. Default 25 mm on every side. A single side is changed with margin_top, margin_right, margin_bottom, or margin_left.',
    example: 'page(margin="25mm")'
  },
  {
    name: "columns",
    scope: "page option",
    type: "number",
    summary: "Number of text columns.",
    description: "A whole number from 1 to 3. Default 1.",
    values: ["1", "2", "3"],
    defaultValue: String(DEFAULT_PAGE.columns),
    example: 'page(columns=2)'
  },

  // --------------------------------------------------------------- margins
  {
    name: "margin_top",
    scope: "margin",
    type: "string",
    summary: 'Top margin as a length such as "25mm".',
    defaultValue: DEFAULT_PAGE.margins.top,
    example: 'page(margin_top="20mm")'
  },
  {
    name: "margin_right",
    scope: "margin",
    type: "string",
    summary: 'Right margin as a length such as "25mm".',
    defaultValue: DEFAULT_PAGE.margins.right,
    example: 'page(margin_right="20mm")'
  },
  {
    name: "margin_bottom",
    scope: "margin",
    type: "string",
    summary: 'Bottom margin as a length such as "25mm".',
    defaultValue: DEFAULT_PAGE.margins.bottom,
    example: 'page(margin_bottom="20mm")'
  },
  {
    name: "margin_left",
    scope: "margin",
    type: "string",
    summary: 'Left margin as a length such as "25mm".',
    defaultValue: DEFAULT_PAGE.margins.left,
    example: 'page(margin_left="20mm")'
  },

  // ------------------------------------------------------ named arguments
  {
    name: "label",
    scope: "argument",
    type: "string",
    summary: "A stable label for cross-references.",
    description:
      'Referenced with ref("…"). Labels must be unique in the document. A block that accepts label= registers the target directly, and a label without number=true is an error, because an unnumbered target cannot be referenced.',
    example: 'label="eq:series"'
  },
  {
    name: "content",
    scope: "argument",
    type: "string",
    summary: "The opening paragraph of a container.",
    description:
      "A section, a theorem-like block, a proof, or a quotation takes its first paragraph as content. The paragraphs that follow are added with the paragraph method.",
    example: 'main.theorem("Convergence", content="The sequence is bounded above.")'
  },
  {
    name: "number",
    scope: "argument",
    type: "boolean",
    summary: "Number an equation or aligned block.",
    description:
      "true or false (default false). A label without number=true is an error, because an unnumbered target cannot be referenced. In a techreport bibliography entry, number is the report number instead.",
    values: ["true", "false"],
    defaultValue: "false",
    example: "number=true"
  },
  {
    name: "caption",
    scope: "argument",
    type: "string or inline content",
    summary: "Caption for a table, figure, or listing.",
    description: "A caption or label makes the element numbered automatically.",
    example: 'caption="Exam scores"'
  },
  {
    name: "align",
    scope: "argument",
    type: "string or list",
    summary: "Column alignment for a table.",
    description:
      'One of "left", "center", "right" for every column, or a list with one value per column. Default "left".',
    values: ["left", "center", "right"],
    defaultValue: "left",
    example: 'align="center"'
  },
  {
    name: "width",
    scope: "argument",
    type: "string",
    summary: "Image width.",
    description: 'A percentage of the column such as "80%", or a length such as "100mm".',
    example: 'width="80%"'
  },
  {
    name: "height",
    scope: "argument",
    type: "string",
    summary: 'Image height as a length such as "60mm".',
    description: "When only width is given, the aspect ratio is preserved.",
    example: 'height="60mm"'
  },
  {
    name: "alt",
    scope: "argument",
    type: "string",
    summary: "Alternative text for an image.",
    description: "Shown when the image cannot be loaded, and used by screen readers.",
    example: 'alt="Convergence plot"'
  },

  // ------------------------------------------------------ reference fields
  {
    name: "key",
    scope: "reference field",
    type: "string",
    summary: "A unique citation key.",
    description:
      'cite("key") refers to this entry. The key is the first positional argument of the reference method, and keys must be unique within the document.',
    example: 'refs.article("smith2024", author="J. Smith", title="On series", journal="J. Math.", year=2024)'
  },
  {
    name: "year",
    scope: "reference field",
    type: "number or string",
    summary: "Publication year. Required for every entry.",
    example: "year=2024"
  },
  {
    name: "journal",
    scope: "reference field",
    type: "string",
    summary: 'Journal name; required for type "article".',
    example: 'journal="J. Math."'
  },
  {
    name: "volume",
    scope: "reference field",
    type: "string or number",
    summary: "Journal volume.",
    example: 'volume=12'
  },
  {
    name: "issue",
    scope: "reference field",
    type: "string or number",
    summary: "Journal issue.",
    example: 'issue=3'
  },
  {
    name: "pages",
    scope: "reference field",
    type: "string",
    summary: 'Page range such as "15-42".',
    example: 'pages: "15-42"'
  },
  {
    name: "doi",
    scope: "reference field",
    type: "string",
    summary: 'Digital object identifier such as "10.1000/xyz".',
    example: 'doi: "10.1000/xyz"'
  },
  {
    name: "url",
    scope: "reference field",
    type: "string",
    summary: 'URL of the resource; required for type "website".',
    example: 'url="https://example.org"'
  },
  {
    name: "publisher",
    scope: "reference field",
    type: "string",
    summary: 'Publisher name; required for type "book".',
    example: 'publisher: "Example Press"'
  },
  {
    name: "edition",
    scope: "reference field",
    type: "string",
    summary: 'Edition such as "2nd".',
    example: 'edition="2nd"'
  },
  {
    name: "address",
    scope: "reference field",
    type: "string",
    summary: "Publisher's address.",
    example: 'address: "Berlin"'
  },
  {
    name: "booktitle",
    scope: "reference field",
    type: "string",
    summary: 'Title of the proceedings; required for type "inproceedings".',
    example: 'booktitle: "Proceedings of Examples"'
  },
  {
    name: "institution",
    scope: "reference field",
    type: "string",
    summary: 'Institution name; required for type "techreport".',
    example: 'institution: "Example Institute"'
  },
  {
    name: "note",
    scope: "reference field",
    type: "string",
    summary: "A free-form note.",
    example: 'note: "Accessed October 2026"'
  }
];
