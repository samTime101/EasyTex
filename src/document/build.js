// Document builder: turns a parsed MathScript document into a document tree.
//
// The expression tree and the document tree stay separate. A document is a
// tree of sections, paragraphs, equations, tables, figures, and so on. The
// maths inside equations and inline mathematics is validated with the same
// validator used by the expression editor, so a document cannot hide an
// invalid mathematical expression.

import { CATEGORY, diagnostic } from "../diagnostics.js";
import { validate } from "../validate.js";
import { FUNCTIONS } from "../builtins.js";
import { COMPONENTS, CONTAINER_OF_METHOD, methodsFor } from "./components.js";
import {
  TEMPLATES,
  TEMPLATE_NAMES,
  PAGE_SIZES,
  DEFAULT_PAGE,
  normalizeSizeName,
  parseLength,
  parseDimension,
  resolvePage
} from "./templates.js";

// Every method the catalogue declares, and the named arguments each one
// accepts. The catalogue is the single source of truth.
export const HANDLED_COMPONENTS = new Set(Object.keys(COMPONENTS));

export const NAMED_ARGUMENTS = Object.fromEntries(
  Object.entries(COMPONENTS).map(([name, component]) => [
    name,
    new Set((component.named ?? []).map((argument) => argument.name))
  ])
);

// How many positional arguments each method takes, and whether it takes any
// number of them. The parser and the builder use this to decide, by
// position, whether an "=" is the equality relation or a named argument.
export const METHOD_ARITY = Object.fromEntries(
  Object.entries(COMPONENTS).map(([name, component]) => {
    const counts = component.positional ?? [];
    return [
      name,
      {
        max: counts.length ? Math.max(...counts) : 0,
        counts,
        variadic: component.variadic === true
      }
    ];
  })
);

// The reference types, which are the methods of a reference list.
const REFERENCE_TYPES = new Set(
  Object.values(COMPONENTS)
    .filter((component) => component.role === "reference")
    .map((component) => component.name)
);

// The kind of container a method may be called on.
const CONTAINER_OF_BLOCK = CONTAINER_OF_METHOD;

const INLINE_COMPONENTS = new Set([
  "bold",
  "italic",
  "underline",
  "emphasis",
  "code_text",
  "inline",
  "ref",
  "cite"
]);

const HEADING_COMPONENTS = new Map([
  ["section", 1],
  ["subsection", 2],
  ["subsubsection", 3]
]);

const LABELABLE = new Set([
  "section",
  "equation",
  "aligned",
  "figure",
  "table",
  "listing",
  "theorem",
  "lemma",
  "definition",
  "corollary"
]);

const THEOREM_ENVIRONMENTS = new Map([
  ["theorem", "Theorem"],
  ["lemma", "Lemma"],
  ["definition", "Definition"],
  ["corollary", "Corollary"]
]);

export const PAGE_OPTIONS = new Set([
  "size",
  "orientation",
  "columns",
  "margin",
  "margin_top",
  "margin_right",
  "margin_bottom",
  "margin_left"
]);

export const MARGIN_SIDES = new Set(["top", "right", "bottom", "left"]);

const REF_NOUNS = {
  figure: "Figure",
  table: "Table",
  listing: "Listing",
  theorem: "Theorem",
  lemma: "Lemma",
  definition: "Definition",
  corollary: "Corollary"
};

// The metadata fields of a document are the named arguments of Document(...).
export const KNOWN_METADATA = new Set(
  (COMPONENTS.Document?.named ?? []).map((argument) => argument.name)
);

export const BIBLIOGRAPHY_TYPES = {
  article: {
    required: ["author", "title", "year", "journal"],
    fields: ["author", "title", "year", "journal", "volume", "issue", "pages", "doi", "url"]
  },
  book: {
    required: ["author", "title", "year", "publisher"],
    fields: ["author", "title", "year", "publisher", "edition", "address", "doi", "url"]
  },
  inproceedings: {
    required: ["author", "title", "year", "booktitle"],
    fields: ["author", "title", "year", "booktitle", "pages", "publisher", "doi", "url"]
  },
  website: {
    required: ["author", "title", "year", "url"],
    fields: ["author", "title", "year", "url", "note"]
  },
  techreport: {
    required: ["author", "title", "year", "institution"],
    fields: ["author", "title", "year", "institution", "number", "url"]
  },
  misc: {
    required: ["author", "title", "year"],
    fields: ["author", "title", "year", "note", "url"]
  }
};

const BIBLIOGRAPHY_TYPE_NAMES = Object.keys(BIBLIOGRAPHY_TYPES);

function kindName(kind) {
  switch (kind) {
    case "String":
      return "string";
    case "Number":
      return "number";
    case "Boolean":
      return "boolean";
    case "Object":
      return "object";
    case "List":
      return "list";
    case "Relation":
    case "Binary":
    case "Unary":
      return "expression";
    case "Identifier":
      return "expression";
    default:
      return "value";
  }
}

function sanitizeId(label) {
  return `ms-${String(label).replace(/[^A-Za-z0-9_-]+/g, "-")}`;
}

function refTextFor(kind, number) {
  if (kind === "equation" || kind === "aligned") return `(${number})`;
  if (REF_NOUNS[kind]) return `${REF_NOUNS[kind]} ${number}`;
  return String(number);
}

/**
 * Validate one embedded mathematical expression and attach its diagnostics.
 * The node keeps its absolute source span, so diagnostics stay clickable.
 */
function validateExpression(node, options) {
  const result = validate(node, options);
  return result.diagnostics;
}

export function buildDocument(program, options = {}) {
  const diagnostics = [];
  const complex = options.complex !== false;
  const strict = options.strict === true;
  const unknownSeverity = strict ? "error" : "warning";

  const labels = new Map();
  const refs = [];
  const citations = [];
  const reportedMissingKeys = new Set();
  const sectionCounters = [0, 0, 0];
  const counters = { equation: 0, figure: 0, table: 0, listing: 0, theorem: 0, lemma: 0, definition: 0, corollary: 0 };

  const state = {
    template: TEMPLATES.article,
    templateName: "article",
    page: JSON.parse(JSON.stringify(DEFAULT_PAGE)),
    pageConfigured: false,
    metadata: {
      title: null,
      subtitle: null,
      author: [],
      affiliations: [],
      date: null,
      language: null,
      keywords: [],
      abstract: []
    },
    blocks: [],
    toc: [],
    bibliography: [],
    bibliographyKeys: new Set(),
    bibliographySeen: false,
    blockCount: 0
  };

  function fail(category, message, node, severity = "error") {
    diagnostics.push(diagnostic(category, message, node?.span, severity));
    return null;
  }

  function warn(category, message, node) {
    diagnostics.push(diagnostic(category, message, node?.span, unknownSeverity));
  }

  // ---------------------------------------------------------------- helpers

  function stringValue(node) {
    if (node.kind === "String") return node.value;
    if (node.kind === "Number") return node.raw;
    return null;
  }

  function expectString(node, owner) {
    if (node.kind === "String") return node.value;
    fail(CATEGORY.TYPE, `${owner} expects a text string written in double quotes`, node);
    return null;
  }

  // Split the arguments of a call into the positional ones and the named
  // ones. The split is decided by position: while the positional slots are
  // unfilled, an "=" is the equality relation; once they are filled, every
  // remaining argument is a named argument, and an unknown name is an error.
  function splitArguments(node, componentName) {
    const namedNames = NAMED_ARGUMENTS[componentName] ?? new Set();
    const arity = METHOD_ARITY[componentName] ?? { max: 0, variadic: false };
    const positional = [];
    const named = new Map();
    let filled = 0;

    for (const arg of node.args) {
      const relation =
        arg.kind === "Relation" && arg.operator === "=" && arg.left.kind === "Identifier" ? arg : null;

      // A named argument that arrives while the positional slots are still
      // open is a mistake: the "=" is read as the equality relation.
      if (
        relation &&
        namedNames.has(relation.left.name) &&
        !arity.variadic &&
        filled < arity.max
      ) {
        fail(
          CATEGORY.ARITY,
          `The named argument '${relation.left.name}' of ${componentName}() comes after the positional arguments`,
          relation.left
        );
      } else if (arity.variadic) {
        // A variadic method takes no named arguments, so every argument is
        // content. A name followed by a string or a boolean is a mistake, and
        // the diagnostic says so.
        if (
          relation &&
          namedNames.size === 0 &&
          (relation.right.kind === "String" || relation.right.kind === "Boolean")
        ) {
          fail(
            CATEGORY.ARITY,
            `${componentName}() takes no named arguments; every argument is content`,
            relation.left
          );
          continue;
        }
        positional.push(arg);
        filled += 1;
        continue;
      } else if (filled < arity.max) {
        positional.push(arg);
        filled += 1;
        continue;
      }

      if (relation) {
        const name = relation.left.name;
        if (!namedNames.has(name)) {
          const expected = [...namedNames];
          fail(
            CATEGORY.ARITY,
            `Unknown named argument '${name}' for ${componentName}(); expected ${
              expected.length ? expected.join(", ") : "none"
            }`,
            arg.left
          );
          continue;
        }
        if (named.has(name)) {
          fail(CATEGORY.ARITY, `Argument '${name}' is given more than once`, arg);
          continue;
        }
        named.set(name, arg.right);
        continue;
      }
      fail(
        CATEGORY.ARITY,
        `Expected a named argument for ${componentName}() after the positional arguments`,
        arg
      );
    }
    return { positional, named };
  }

  function namedString(named, name, owner) {
    if (!named.has(name)) return null;
    const value = named.get(name);
    if (value.kind !== "String") {
      fail(CATEGORY.TYPE, `Argument '${name}' of ${owner} expects a text string in double quotes`, value);
      return null;
    }
    return value.value;
  }

  function namedBoolean(named, name, owner) {
    if (!named.has(name)) return false;
    const value = named.get(name);
    if (value.kind === "Boolean") return value.value;
    fail(CATEGORY.TYPE, `Argument '${name}' of ${owner} expects true or false`, value);
    return false;
  }

  function expectBlockCount(componentName, positional, counts, node) {
    if (counts.includes(positional.length)) return true;
    const expected = counts.join(" or ");
    fail(
      CATEGORY.ARITY,
      `${componentName}() expects ${expected} argument${counts.length === 1 && counts[0] === 1 ? "" : "s"}, received ${positional.length}`,
      node
    );
    return false;
  }

  function mathDiagnostics(node) {
    for (const diag of validateExpression(node, { complex })) diagnostics.push(diag);
    return node;
  }

  // ------------------------------------------------------------- metadata

  function stringListOrSingle(node) {
    if (node.kind === "List") {
      const values = [];
      for (const element of node.elements) {
        const value = stringValue(element);
        if (value === null) {
          fail(CATEGORY.TYPE, "Expected a text string in this list", element);
          continue;
        }
        values.push(value);
      }
      return values;
    }
    const value = stringValue(node);
    if (value === null) {
      fail(CATEGORY.TYPE, "Expected a text string or a list of strings", node);
      return [];
    }
    return [value];
  }

  // The metadata of a document arrives as the named arguments of
  // Document(...).
  function interpretMetadata(named, node) {
    for (const [key, value] of named) {
      const entry = { key, value, keySpan: value?.span ?? node?.span };
      switch (key) {
        case "type": {
          const value = stringValue(entry.value);
          if (value === null) {
            fail(CATEGORY.TYPE, "Metadata field 'type' expects a string such as \"article\"", entry.value);
            break;
          }
          const name = value.trim().toLowerCase();
          if (!Object.hasOwn(TEMPLATES, name)) {
            fail(
              CATEGORY.DOCUMENT,
              `Unknown document type '${value}'. Expected one of: ${TEMPLATE_NAMES.join(", ")}`,
              entry.value
            );
            break;
          }
          state.template = TEMPLATES[name];
          state.templateName = name;
          if (state.template.page) {
            state.page = {
              ...state.page,
              ...state.template.page,
              margins: { ...state.page.margins, ...(state.template.page.margins ?? {}) }
            };
          }
          break;
        }
        case "title":
        case "subtitle": {
          state.metadata[key] = interpretInlineList(entry.value, `metadata field '${key}'`);
          break;
        }
        case "author":
        case "affiliations": {
          state.metadata[key] = stringListOrSingle(entry.value);
          break;
        }
        case "keywords": {
          state.metadata.keywords = stringListOrSingle(entry.value);
          break;
        }
        case "date": {
          const value = stringValue(entry.value);
          if (value === null) {
            fail(CATEGORY.TYPE, "Metadata field 'date' expects a string such as \"2026\"", entry.value);
            break;
          }
          state.metadata.date = value;
          break;
        }
        case "language": {
          const value = stringValue(entry.value);
          if (value === null) {
            fail(CATEGORY.TYPE, "Metadata field 'language' expects a language tag such as \"en\"", entry.value);
            break;
          }
          state.metadata.language = value;
          break;
        }
        case "abstract": {
          state.metadata.abstract = interpretInlineList(entry.value, "metadata field 'abstract'");
          break;
        }
        default:
          break;
      }
    }
  }

  // ------------------------------------------------------------- labels

  function registerLabel(name, kind, number, id, node) {
    if (labels.has(name)) {
      fail(CATEGORY.REFERENCE, `Duplicate label '${name}'`, node);
      return labels.get(name);
    }
    const entry = { name, kind, number, id, refText: refTextFor(kind, number) };
    labels.set(name, entry);
    return entry;
  }

  function labelId(name) {
    return sanitizeId(name) || "ms-label";
  }

  function requireNumber(label, number, node, owner) {
    if (!number) {
      fail(
        CATEGORY.REFERENCE,
        `'${label}' labels ${owner}; add number=true so the label can be referenced`,
        node
      );
      return null;
    }
    return label;
  }

  function interpretInlineList(node, owner) {
    if (node.kind === "List") {
      const result = [];
      for (const element of node.elements) result.push(...interpretInline(element, owner));
      return result;
    }
    return interpretInline(node, owner);
  }

  function inlineComponent(call, name, owner) {
    const args = call.args;
    if (name === "inline") {
      if (args.length !== 1) {
        fail(CATEGORY.ARITY, "inline() expects exactly 1 mathematical expression", call);
        return [];
      }
      return [{ kind: "math", expr: mathDiagnostics(args[0]) }];
    }

    if (name === "ref") {
      if (args.length !== 1 || args[0].kind !== "String" || args[0].value.trim() === "") {
        fail(CATEGORY.ARITY, 'ref() expects a single non-empty label such as ref("eq:series")', call);
        return [];
      }
      const ref = { kind: "ref", label: args[0].value, node: call, resolved: null };
      refs.push(ref);
      return [ref];
    }

    if (name === "cite") {
      if (args.length === 0) {
        fail(CATEGORY.ARITY, 'cite() expects at least one bibliography key such as cite("smith2024")', call);
        return [];
      }
      const keys = [];
      for (const arg of args) {
        const value = expectString(arg, "cite()");
        if (value !== null) keys.push(value);
      }
      if (keys.length === 0) return [];
      const cite = { kind: "cite", keys, node: call, numbers: [] };
      citations.push(cite);
      return [cite];
    }

    // bold, italic, underline, emphasis, code_text
    if (args.length === 0) {
      fail(CATEGORY.ARITY, `${name}() expects at least one argument`, call);
      return [];
    }
    const children = [];
    for (const arg of args) children.push(...interpretInline(arg, owner));
    return [{ kind: name, children }];
  }

  function interpretInline(node, owner) {
    switch (node.kind) {
      case "String":
        return [{ kind: "text", value: node.value }];
      case "Number":
        return [{ kind: "text", value: node.raw }];
      case "Identifier":
      case "Binary":
      case "Unary":
      case "Relation":
        return [{ kind: "math", expr: mathDiagnostics(node) }];
      case "Call": {
        const name = node.callee.name;
        const component = COMPONENTS[name];
        if (name === "document") {
          fail(CATEGORY.DOCUMENT, "A document cannot be used as inline content", node);
          return [];
        }
        if (component) {
          if (component.role === "block" || component.role === "document") {
            fail(
              CATEGORY.STRUCTURE,
              `'${name}' is a block component and cannot be used inside inline content`,
              node
            );
            return [];
          }
          return inlineComponent(node, name, owner);
        }
        return [{ kind: "math", expr: mathDiagnostics(node) }];
      }
      case "List":
        fail(CATEGORY.TYPE, "A list cannot be used as inline content", node);
        return [];
      case "Boolean":
      case "Object":
        fail(CATEGORY.TYPE, `A ${kindName(node.kind)} cannot be used as inline content`, node);
        return [];
      default:
        return [];
    }
  }

  // --------------------------------------------------------------- blocks

  function sectionPath(level) {
    sectionCounters[level - 1] += 1;
    for (let i = level; i < sectionCounters.length; i += 1) sectionCounters[i] = 0;
    return sectionCounters.slice(0, level).join(".");
  }

  function interpretHeading(call, level, context) {
    const name = call.callee.name;
    const { positional, named } = splitArguments(call, name);
    if (!expectBlockCount(name, positional, [1, 2], call)) return null;

    const title = interpretInlineList(positional[0], `${name}() title`);
    if (title.length === 0) {
      fail(CATEGORY.STRUCTURE, `${name}() needs a heading`, positional[0]);
      return null;
    }
    if (level === 2 && context.level < 1) {
      fail(CATEGORY.STRUCTURE, "subsection() must appear inside a section()", call);
    }
    if (level === 3 && context.level < 2) {
      fail(CATEGORY.STRUCTURE, "subsubsection() must appear inside a subsection()", call);
    }

    const path = sectionPath(level);
    const displayNumber = state.template.numbered ? path : null;
    const id = `section-${path.replace(/\./g, "-")}`;
    const section = {
      kind: "section",
      level,
      number: displayNumber,
      refNumber: path,
      title,
      id,
      label: null,
      blocks: []
    };

    const labelName = namedString(named, "label", `${name}()`);
    if (labelName) {
      section.label = labelName;
      registerLabel(labelName, "section", path, id, call);
    }

    state.toc.push({ level, number: displayNumber, title, id });
    const content = named.get("content");
    if (content) {
      const paragraph = paragraphFrom(content, `${name}() content`);
      if (paragraph) {
        section.blocks.push(paragraph);
        state.blockCount += 1;
      }
    }
    return section;
  }

  function finishNumberedBlock(block, named, kind, owner) {
    const number = String((counters.equation += 1));
    const labelName = namedString(named, "label", owner);
    const label = labelName ? requireNumber(labelName, number, named.get("label"), `${owner}()`) : null;
    block.number = number;
    block.label = label;
    block.id = label ? labelId(label) : `equation-${number}`;
    if (label) registerLabel(label, kind, number, block.id, named.get("label"));
    return block;
  }

  function interpretEquation(call) {
    const { positional, named } = splitArguments(call, "equation");
    if (!expectBlockCount("equation", positional, [1], call)) return null;
    const expr = mathDiagnostics(positional[0]);
    const numbered = namedBoolean(named, "number", "equation()");
    const block = { kind: "equation", expr, number: null, label: null, id: null, numbered };
    if (!numbered) {
      const labelName = namedString(named, "label", "equation()");
      if (labelName) requireNumber(labelName, null, named.get("label"), "equation()");
      return block;
    }
    return finishNumberedBlock(block, named, "equation", "equation");
  }

  function interpretAligned(call) {
    const { positional, named } = splitArguments(call, "aligned");
    if (!expectBlockCount("aligned", positional, [1], call)) return null;
    const list = positional[0];
    if (list.kind !== "List" || list.elements.length === 0) {
      fail(CATEGORY.STRUCTURE, "aligned() expects a non-empty list of relations", list);
      return null;
    }
    const rows = [];
    for (const row of list.elements) {
      if (row.kind !== "Relation") {
        fail(CATEGORY.STRUCTURE, "Every row of aligned() must be a relation such as x + y = 5", row);
        continue;
      }
      mathDiagnostics(row);
      rows.push({ left: row.left, operator: row.operator, right: row.right });
    }
    if (rows.length === 0) return null;
    const numbered = namedBoolean(named, "number", "aligned()");
    const block = { kind: "aligned", rows, number: null, label: null, id: null, numbered };
    if (!numbered) {
      const labelName = namedString(named, "label", "aligned()");
      if (labelName) requireNumber(labelName, null, named.get("label"), "aligned()");
      return block;
    }
    return finishNumberedBlock(block, named, "aligned", "aligned");
  }

  function interpretCaption(named, owner) {
    if (!named.has("caption")) return null;
    const value = named.get("caption");
    const content = interpretInlineList(value, `${owner}() caption`);
    if (content.length === 0) {
      fail(CATEGORY.STRUCTURE, `${owner}() caption is empty`, value);
    }
    return content;
  }

  function interpretTable(call) {
    const { positional, named } = splitArguments(call, "table");
    if (!expectBlockCount("table", positional, [1, 2], call)) return null;

    let header = null;
    let rowsNode = null;
    if (positional.length === 2) {
      header = interpretCellRow(positional[0], "table() header");
      rowsNode = positional[1];
    } else {
      rowsNode = positional[0];
    }

    if (rowsNode.kind !== "List") {
      fail(CATEGORY.STRUCTURE, "table() expects a list of rows", rowsNode);
      return null;
    }
    if (rowsNode.elements.length === 0) {
      fail(CATEGORY.STRUCTURE, "table() requires at least one row", rowsNode);
      return null;
    }

    const rows = [];
    let width = header ? header.length : null;
    for (const row of rowsNode.elements) {
      const cells = interpretCellRow(row, "table() row");
      if (cells === null) continue;
      if (width === null) width = cells.length;
      else if (cells.length !== width) {
        fail(
          CATEGORY.STRUCTURE,
          `All rows of a table must have the same number of cells (expected ${width}, found ${cells.length})`,
          row
        );
      }
      rows.push(cells);
    }
    if (rows.length === 0) return null;

    const caption = interpretCaption(named, "table");
    const labelName = namedString(named, "label", "table()");
    const numbered = Boolean(caption || labelName);
    const block = {
      kind: "table",
      header,
      rows,
      caption,
      align: interpretAlignment(named, width ?? rows[0].length, call),
      number: null,
      label: null,
      id: null
    };
    if (!numbered) return block;
    block.number = String((counters.table += 1));
    block.label = labelName ? requireNumber(labelName, block.number, named.get("label"), "table()") : null;
    block.id = block.label ? labelId(block.label) : `table-${block.number}`;
    if (block.label) registerLabel(block.label, "table", block.number, block.id, named.get("label"));
    return block;
  }

  function interpretCellRow(node, owner) {
    if (node.kind !== "List") {
      fail(CATEGORY.STRUCTURE, `${owner} expects a list of cells`, node);
      return null;
    }
    const cells = [];
    for (const cell of node.elements) {
      if (cell.kind === "List" || cell.kind === "Object" || cell.kind === "Boolean") {
        fail(CATEGORY.TYPE, `A ${kindName(cell.kind)} cannot be used as a table cell`, cell);
        continue;
      }
      cells.push(interpretInline(cell, owner));
    }
    return cells;
  }

  function interpretAlignment(named, columns, call) {
    if (!named.has("align")) return Array.from({ length: columns }, () => "left");
    const value = named.get("align");
    const allowed = new Set(["left", "center", "right"]);
    const read = (node) => {
      const text = stringValue(node);
      if (text === null || !allowed.has(text)) {
        fail(CATEGORY.TYPE, `Alignment must be "left", "center", or "right"`, node);
        return "left";
      }
      return text;
    };
    const values = value.kind === "List" ? value.elements.map(read) : [read(value)];
    const result = [];
    for (let i = 0; i < columns; i += 1) result.push(values[i] ?? values[values.length - 1] ?? "left");
    return result;
  }

  function interpretImage(call) {
    const { positional, named } = splitArguments(call, "image");
    if (!expectBlockCount("image", positional, [1], call)) return null;
    const src = expectString(positional[0], "image()");
    if (src === null) return null;

    const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(src);
    if (scheme && scheme[1] !== "https" && scheme[1] !== "http") {
      fail(CATEGORY.DOCUMENT, `Image source '${src}' uses an unsupported scheme '${scheme[1]}:'; use a relative path or an https URL`, positional[0]);
      return null;
    }

    const image = { src, width: null, height: null, alt: "" };
    if (named.has("width")) {
      const value = expectString(named.get("width"), "image() width");
      if (value !== null) {
        const parsed = parseDimension(value);
        if (!parsed.ok) fail(CATEGORY.TYPE, `Argument 'width' of image(): ${parsed.reason}`, named.get("width"));
        else image.width = value;
      }
    }
    if (named.has("height")) {
      const value = expectString(named.get("height"), "image() height");
      if (value !== null) {
        const parsed = parseLength(value);
        if (!parsed.ok) fail(CATEGORY.TYPE, `Argument 'height' of image(): ${parsed.reason}`, named.get("height"));
        else image.height = value;
      }
    }
    if (named.has("alt")) {
      const value = expectString(named.get("alt"), "image() alt");
      if (value !== null) image.alt = value;
    }
    return image;
  }

  function interpretFigure(call) {
    const { positional, named } = splitArguments(call, "figure");
    if (!expectBlockCount("figure", positional, [0], call)) return null;

    const caption = interpretCaption(named, "figure");
    const labelName = namedString(named, "label", "figure()");
    const numbered = Boolean(caption || labelName);
    const block = { kind: "figure", image: null, caption, number: null, label: null, id: null };
    if (!numbered) return block;
    block.number = String((counters.figure += 1));
    block.label = labelName ? requireNumber(labelName, block.number, named.get("label"), "figure()") : null;
    block.id = block.label ? labelId(block.label) : `figure-${block.number}`;
    if (block.label) registerLabel(block.label, "figure", block.number, block.id, named.get("label"));
    return block;
  }

  function interpretListing(call) {
    const { positional, named } = splitArguments(call, "listing");
    if (!expectBlockCount("listing", positional, [1, 2], call)) return null;
    const text = expectString(positional[0], "listing()");
    if (text === null) return null;

    // listing("code", "language") is accepted as well as listing("code", language="...").
    let language = null;
    if (positional.length === 2) language = expectString(positional[1], "listing() language");
    const namedLanguage = namedString(named, "language", "listing()");
    if (namedLanguage !== null) language = namedLanguage;

    const caption = interpretCaption(named, "listing");
    const labelName = namedString(named, "label", "listing()");
    const numbered = Boolean(caption || labelName);
    const block = { kind: "listing", text, language, caption, number: null, label: null, id: null };
    if (!numbered) return block;
    block.number = String((counters.listing += 1));
    block.label = labelName ? requireNumber(labelName, block.number, named.get("label"), "listing()") : null;
    block.id = block.label ? labelId(block.label) : `listing-${block.number}`;
    if (block.label) registerLabel(block.label, "listing", block.number, block.id, named.get("label"));
    return block;
  }

  function interpretTheorem(call, typeName) {
    const { positional, named } = splitArguments(call, typeName);
    if (!expectBlockCount(typeName, positional, [1, 2], call)) return null;

    const title = interpretInlineList(positional[0], `${typeName}() title`);
    const blocks = [];
    const contentNode = named.get("content");
    if (contentNode) {
      const paragraph = paragraphFrom(contentNode, `${typeName}() content`);
      if (paragraph) blocks.push(paragraph);
    }

    const number = String((counters[typeName] += 1));
    const labelName = namedString(named, "label", `${typeName}()`);
    const label = labelName ? requireNumber(labelName, number, named.get("label"), `${typeName}()`) : null;
    const block = {
      kind: typeName,
      number,
      label,
      id: label ? labelId(label) : `${typeName}-${number}`,
      title,
      blocks
    };
    if (label) registerLabel(label, typeName, number, block.id, named.get("label"));
    return block;
  }

  function interpretQuote(call) {
    const { named } = splitArguments(call, "quote");
    if (!expectBlockCount("quote", [], [0], call)) return null;
    const blocks = [];
    const content = named.get("content");
    if (content) {
      const paragraph = paragraphFrom(content, "quote() content");
      if (paragraph) blocks.push(paragraph);
    }
    return { kind: "quote", blocks };
  }

  function interpretListBlock(call, ordered) {
    const name = call.callee.name;
    const { positional } = splitArguments(call, name);
    if (!expectBlockCount(name, positional, [1], call)) return null;
    const list = positional[0];
    if (list.kind !== "List") {
      fail(CATEGORY.STRUCTURE, `${name}() expects one list of items`, list);
      return null;
    }
    if (list.elements.length === 0) {
      fail(CATEGORY.STRUCTURE, `${name}() needs at least one item`, list);
      return null;
    }

    const items = [];
    for (const element of list.elements) {
      if (element.kind === "String" || element.kind === "Number") {
        items.push([{ kind: "paragraph", content: interpretInline(element, `${name}() item`) }]);
        continue;
      }
      if (element.kind === "List") {
        items.push(interpretBlocks(element, null, { level: 0 }));
        continue;
      }
      const block = interpretBlock(element, null, { level: 0 });
      if (block) items.push([block]);
    }
    if (items.length === 0) return null;
    return { kind: "list", ordered, items };
  }

  function interpretProof(call) {
    const { named } = splitArguments(call, "proof");
    if (!expectBlockCount("proof", [], [0], call)) return null;
    const blocks = [];
    const content = named.get("content");
    if (content) {
      const paragraph = paragraphFrom(content, "proof() content");
      if (paragraph) blocks.push(paragraph);
    }
    return { kind: "proof", title: namedString(named, "title", "proof()"), blocks };
  }

  function interpretPage(call) {
    const { named } = splitArguments(call, "page");
    if (state.pageConfigured) {
      warn(CATEGORY.DOCUMENT, "Duplicate page() configuration; the last configuration wins", call);
    }
    if (state.blockCount > 0) {
      warn(CATEGORY.DOCUMENT, "page() should come before the content", call);
    }

    const page = JSON.parse(JSON.stringify(state.page));
    for (const [key, value] of named) {
      switch (key) {
        case "size": {
          const text = stringValue(value);
          if (text === null) {
            fail(CATEGORY.TYPE, "Page size expects a string such as \"A4\"", value);
            break;
          }
          const name = normalizeSizeName(text);
          if (!PAGE_SIZES[name]) {
            fail(
              CATEGORY.DOCUMENT,
              `Unknown page size '${text}'. Expected one of: A3, A4, A5, Letter, Legal`,
              value
            );
            break;
          }
          page.size = name;
          break;
        }
        case "orientation": {
          const text = stringValue(value);
          if (text !== "portrait" && text !== "landscape") {
            fail(CATEGORY.DOCUMENT, "Page orientation must be \"portrait\" or \"landscape\"", value);
            break;
          }
          page.orientation = text;
          break;
        }
        case "columns": {
          const number = value.kind === "Number" ? value.value : null;
          if (number === null || !Number.isInteger(number) || number < 1 || number > 3) {
            fail(CATEGORY.DOMAIN, "Page columns must be a whole number between 1 and 3", value);
            break;
          }
          page.columns = number;
          break;
        }
        case "margin":
        case "margin_top":
        case "margin_right":
        case "margin_bottom":
        case "margin_left": {
          const text = stringValue(value);
          const parsed =
            text === null
              ? { ok: false, reason: "a margin must be a string such as \"25mm\"" }
              : parseLength(text);
          if (!parsed.ok) {
            fail(CATEGORY.TYPE, `Page margin '${key}': ${parsed.reason}`, value);
            break;
          }
          if (key === "margin") {
            for (const side of MARGIN_SIDES) page.margins[side] = text;
            break;
          }
          const side = key.slice("margin_".length);
          page.margins[side] = text;
          break;
        }
        default:
          break;
      }
    }

    state.page = page;
    state.pageConfigured = true;
    return null;
  }

  // --------------------------------------------------------- bibliography

  // A reference entry. The type is the method name, the key is the first
  // positional argument, and the rest are the fields of that type.
  function interpretReferenceEntry(type, call) {
    const { positional, named } = splitArguments(call, type);
    const spec = BIBLIOGRAPHY_TYPES[type];
    if (!spec) {
      fail(CATEGORY.DOCUMENT, `Unknown reference type '${type}'`, call);
      return null;
    }
    if (positional.length !== 1) {
      fail(
        CATEGORY.ARITY,
        `${type}() expects the key of the entry as its only positional argument`,
        call
      );
      return null;
    }

    const key = stringValue(positional[0]);
    if (key === null || key.trim() === "") {
      fail(CATEGORY.TYPE, "A reference entry needs a non-empty key", positional[0]);
      return null;
    }
    if (state.bibliographyKeys.has(key)) {
      fail(CATEGORY.REFERENCE, `Duplicate bibliography key '${key}'`, positional[0]);
      return null;
    }
    state.bibliographyKeys.add(key);

    const fields = new Map();
    for (const [name, value] of named) {
      const text = stringValue(value);
      if (text === null) {
        fail(CATEGORY.TYPE, `Bibliography field '${name}' expects a string or number`, value);
        continue;
      }
      if (!spec.fields.includes(name)) {
        warn(
          CATEGORY.NAME,
          `Field '${name}' is not used by bibliography type '${type}'`,
          value
        );
        continue;
      }
      fields.set(name, text);
    }

    for (const required of spec.required) {
      if (!fields.has(required)) {
        fail(
          CATEGORY.DOCUMENT,
          `Reference entry '${key}' is missing the required field '${required}' for type '${type}'`,
          call
        );
      }
    }

    return { key, type, fields: Object.fromEntries(fields), node: call };
  }

  // ------------------------------------------------------------- dispatch

  function suggest(name) {
    const candidates = [...Object.keys(COMPONENTS), ...Object.keys(FUNCTIONS)];
    const scored = [];
    for (const candidate of candidates) {
      if (candidate === name) continue;
      if (candidate.startsWith(name.slice(0, 3)) || name.startsWith(candidate.slice(0, 3))) {
        scored.push(candidate);
      }
    }
    return scored.slice(0, 3);
  }

  function interpretBlockCall(call, context) {
    const name = call.callee.name;
    const component = COMPONENTS[name];

    if (!component) {
      if (FUNCTIONS[name]) {
        return { kind: "equation", expr: mathDiagnostics(call), number: null, label: null, id: null };
      }
      const hint = suggest(name);
      fail(
        CATEGORY.NAME,
        `Unknown document component '${name}'${hint.length ? `. Did you mean ${hint.map((h) => `'${h}'`).join(" or ")}?` : ""}`,
        call.callee
      );
      return null;
    }

    if (component.role === "inline") {
      fail(
        CATEGORY.STRUCTURE,
        `'${name}' is an inline component; use it inside text(...) instead of as a block`,
        call
      );
      return null;
    }

    if (HEADING_COMPONENTS.has(name)) return interpretHeading(call, HEADING_COMPONENTS.get(name), context);
    if (name === "paragraph") return interpretParagraph(call);
    if (name === "equation") return interpretEquation(call);
    if (name === "aligned") return interpretAligned(call);
    if (name === "table") return interpretTable(call);
    if (name === "figure") return interpretFigure(call);
    if (name === "image") {
      const image = interpretImage(call);
      return image ? { kind: "image", image } : null;
    }
    if (name === "listing") return interpretListing(call);
    if (name === "quote") return interpretQuote(call);
    if (name === "bullets") return interpretListBlock(call, false);
    if (name === "numbered") return interpretListBlock(call, true);
    if (name === "proof") return interpretProof(call);
    if (THEOREM_ENVIRONMENTS.has(name)) return interpretTheorem(call, name);
    if (name === "page") return interpretPage(call);
    if (name === "page_break") {
      if (call.args.length > 0) fail(CATEGORY.ARITY, "page_break() takes no arguments", call);
      return { kind: "page_break" };
    }
    return null;
  }

  // One paragraph of prose, from a string or from inline content.
  function paragraphFrom(node, owner) {
    if (!node) return null;
    if (node.kind === "String") {
      return { kind: "paragraph", content: [{ kind: "text", value: node.value }] };
    }
    const content = interpretInline(node, owner);
    if (content.length === 0) return null;
    return { kind: "paragraph", content };
  }

  function interpretParagraph(call) {
    const { positional } = splitArguments(call, "paragraph");
    if (positional.length === 0) {
      fail(CATEGORY.ARITY, "paragraph() expects at least one string or inline component", call);
      return null;
    }
    const content = [];
    for (const arg of positional) content.push(...interpretInline(arg, "paragraph()"));
    if (content.length === 0) return null;
    return { kind: "paragraph", content };
  }

  function interpretBlock(item, owner, context) {
    switch (item.kind) {
      case "Call":
        return interpretBlockCall(item, context);
      case "String":
        return { kind: "paragraph", content: [{ kind: "text", value: item.value }] };
      case "Identifier":
      case "Number":
      case "Binary":
      case "Unary":
      case "Relation":
        return { kind: "equation", expr: mathDiagnostics(item), number: null, label: null, id: null };
      case "List":
        fail(CATEGORY.TYPE, "A list cannot be used as a content block", item);
        return null;
      case "Boolean":
      case "Object":
        fail(CATEGORY.TYPE, `A ${kindName(item.kind)} cannot be used as a content block`, item);
        return null;
      default:
        return null;
    }
  }

  function interpretBlocks(node, owner, context) {
    const blocks = [];
    const items = node.kind === "List" ? node.elements : [node];
    for (const item of items) {
      const block = interpretBlock(item, owner, context);
      if (block) {
        blocks.push(block);
        state.blockCount += 1;
      }
    }
    return blocks;
  }

  // ---------------------------------------------------------------- root

  // ---------------------------------------------------------------- program

  // A document is a program of statements. Each statement names a document or
  // a block, and the blocks are folded into the same tree the renderer has
  // always used. Nothing is executed.
  const bindings = new Map();

  function bindingFor(kind, node, blocks) {
    return { kind, node, blocks };
  }

  function resolveTarget(name, node) {
    const binding = bindings.get(name);
    if (!binding) {
      fail(
        CATEGORY.DOCUMENT,
        `Unknown name '${name}'; a name must stand for a document or a block`,
        node
      );
      return null;
    }
    return binding;
  }

  function interpretDocumentStatement(statement) {
    const call = {
      kind: "Call",
      callee: { name: "Document" },
      args: statement.call?.arguments ?? []
    };
    const { named } = splitArguments(call, "Document");
    interpretMetadata(named, statement);

    if (!state.metadata.title) {
      warn(
        CATEGORY.DOCUMENT,
        'This document has no title; add title="..." to Document(...)',
        statement
      );
    }
    if (state.metadata.author.length === 0) {
      warn(
        CATEGORY.DOCUMENT,
        'This document has no author; add author="..." to Document(...)',
        statement
      );
    }
    return bindingFor("document", null, state.blocks);
  }

  // A method call on a bound name.
  function applyMethod(binding, call, statement) {
    const method = call.method;
    const component = COMPONENTS[method];

    if (!component || component.role === "inline") {
      const expected = methodsFor(binding.kind).map((entry) => entry.name);
      fail(
        CATEGORY.NAME,
        `Unknown method '${method}' on ${describeContainer(binding.kind)}; expected ${
          expected.length ? expected.join(", ") : "none"
        }`,
        statement
      );
      return null;
    }

    if (!component.containers.includes(binding.kind)) {
      const expected = methodsFor(binding.kind).map((entry) => entry.name);
      fail(
        CATEGORY.STRUCTURE,
        `'${method}' cannot be used on ${describeContainer(binding.kind)}; expected ${
          expected.length ? expected.join(", ") : "none"
        }`,
        statement
      );
      return null;
    }

    const node = { kind: "Call", callee: { name: method }, args: call.arguments ?? [] };

    if (method === "page") {
      interpretPage(node);
      return null;
    }
    if (method === "bibliography") {
      if (binding.kind !== "document") {
        fail(CATEGORY.STRUCTURE, "A bibliography belongs to the document", statement);
        return null;
      }
      return bindingFor("references", null, null);
    }
    if (REFERENCE_TYPES.has(method)) {
      if (binding.kind !== "references") {
        fail(
          CATEGORY.STRUCTURE,
          `'${method}' is a reference entry; it belongs to a bibliography`,
          statement
        );
        return null;
      }
      const entry = interpretReferenceEntry(method, node);
      if (entry) state.bibliography.push(entry);
      return null;
    }
    if (method === "image") {
      if (binding.kind !== "figure") {
        fail(CATEGORY.STRUCTURE, "An image belongs to a figure", statement);
        return null;
      }
      const image = interpretImage(node);
      if (image && binding.node) binding.node.image = image;
      return null;
    }

    const block = interpretBlockCall(node, { level: levelOfContainer(binding.kind) });
    if (!block) return null;
    if (binding.blocks) {
      binding.blocks.push(block);
      state.blockCount += 1;
    }
    const kind = kindOfBlock(block);
    if (!kind) return null;
    return bindingFor(kind, block, block.blocks ?? null);
  }

  // The kind of container a block stands for. A heading keeps its level, so a
  // subsection is not a section.
  function kindOfBlock(block) {
    if (block.kind !== "section") return CONTAINER_OF_BLOCK[block.kind] ?? null;
    if (block.level === 2) return "subsection";
    if (block.level === 3) return "subsubsection";
    return "section";
  }

  // The heading level of a container, so a subsection knows it is nested.
  function levelOfContainer(kind) {
    if (kind === "section") return 1;
    if (kind === "subsection") return 2;
    if (kind === "subsubsection") return 3;
    return 0;
  }

  function describeContainer(kind) {
    return kind === "document"
      ? "a document"
      : kind === "section"
        ? "a section"
        : kind === "subsection"
          ? "a subsection"
          : kind === "subsubsection"
            ? "a subsubsection"
            : kind === "theorem"
              ? "a theorem"
              : kind === "proof"
                ? "a proof"
                : kind === "quote"
                  ? "a quotation"
                  : kind === "figure"
                    ? "a figure"
                    : "a reference list";
  }

  function interpretProgram(statements) {
    let created = false;

    for (const statement of statements) {
      if (statement.kind === "Binding") {
        if (statement.call.kind === "DocumentCall") {
          if (created) {
            fail(CATEGORY.DOCUMENT, "A document may only be created once", statement);
            continue;
          }
          const binding = interpretDocumentStatement(statement);
          created = true;
          bindings.set(statement.name, binding);
          continue;
        }
        const target = resolveTarget(statement.call.target, statement);
        if (!target) continue;
        const result = applyMethod(target, statement.call, statement);
        if (result) bindings.set(statement.name, result);
        continue;
      }

      if (statement.kind === "MethodCall") {
        const target = resolveTarget(statement.target, statement);
        if (!target) continue;
        applyMethod(target, statement, statement);
        continue;
      }

      if (statement.kind === "DocumentCall") {
        fail(
          CATEGORY.DOCUMENT,
          "A document must be bound to a name, for example: document = Document(...)",
          statement
        );
        continue;
      }
    }

    if (!created) {
      fail(
        CATEGORY.DOCUMENT,
        "A document needs a Document(...) call, for example: document = Document(type=\"article\")",
        statements[0] ?? null
      );
      return false;
    }
    return true;
  }

  function build() {
    if (!program) return null;
    const ok = interpretProgram(program.statements ?? []);
    if (!ok) return null;

    // Resolve references now that every label exists, including forward
    // references to blocks defined later in the document.
    for (const ref of refs) {
      const entry = labels.get(ref.label);
      if (!entry) {
        fail(CATEGORY.REFERENCE, `Unresolved reference '${ref.label}'`, ref.node);
        continue;
      }
      ref.resolved = entry;
    }

    // Number the bibliography in definition order and resolve citations.
    const keyIndex = new Map();
    state.bibliography.forEach((entry, index) => {
      entry.index = index + 1;
      keyIndex.set(entry.key, entry.index);
    });
    for (const cite of citations) {
      cite.numbers = cite.keys.map((key) => {
        const index = keyIndex.get(key);
        if (index === undefined) {
          if (!reportedMissingKeys.has(key)) {
            reportedMissingKeys.add(key);
            fail(CATEGORY.REFERENCE, `No bibliography entry with the key '${key}'`, cite.node);
          }
          return null;
        }
        return index;
      });
    }
    if (citations.length > 0 && !state.bibliographySeen) {
      state.blocks.push({ kind: "bibliography", auto: true });
    }

    const inlineText = (nodes) =>
      (nodes ?? []).map((node) => (node.kind === "text" ? node.value : node.kind === "math" ? "" : "")).join("");

    return {
      kind: "document",
      template: state.template,
      templateName: state.templateName,
      metadata: {
        type: state.templateName,
        title: state.metadata.title,
        titleText: inlineText(state.metadata.title),
        subtitle: state.metadata.subtitle,
        subtitleText: inlineText(state.metadata.subtitle),
        author: state.metadata.author,
        authorText: state.metadata.author.join(", "),
        affiliations: state.metadata.affiliations,
        date: state.metadata.date,
        language: state.metadata.language,
        keywords: state.metadata.keywords,
        abstract: state.metadata.abstract
      },
      page: resolvePage(state.page),
      pageConfigured: state.pageConfigured,
      blocks: state.blocks,
      toc: state.toc,
      labels,
      bibliography: state.bibliography,
      stats: {
        sections: state.toc.length,
        equations: counters.equation,
        figures: counters.figure,
        tables: counters.table,
        listings: counters.listing,
        theorems: counters.theorem + counters.lemma + counters.definition + counters.corollary,
        citations: citations.length
      }
    };
  }

  const document = build();
  return { document, diagnostics };
}
