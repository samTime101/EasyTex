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
import { COMPONENTS } from "./components.js";
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

export const HANDLED_COMPONENTS = new Set([
  "document",
  "page",
  "section",
  "subsection",
  "subsubsection",
  "label",
  "page_break",
  "text",
  "bold",
  "italic",
  "underline",
  "emphasis",
  "code_text",
  "inline",
  "ref",
  "cite",
  "quote",
  "bullets",
  "numbered",
  "equation",
  "aligned",
  "table",
  "figure",
  "image",
  "listing",
  "theorem",
  "lemma",
  "definition",
  "corollary",
  "proof",
  "bibliography"
]);

export const NAMED_ARGUMENTS = {
  section: new Set(["label"]),
  subsection: new Set(["label"]),
  subsubsection: new Set(["label"]),
  equation: new Set(["number", "label"]),
  aligned: new Set(["number", "label"]),
  table: new Set(["caption", "label", "align"]),
  figure: new Set(["caption", "label"]),
  image: new Set(["width", "height", "alt"]),
  listing: new Set(["language", "caption", "label"]),
  theorem: new Set(["label"]),
  lemma: new Set(["label"]),
  definition: new Set(["label"]),
  corollary: new Set(["label"]),
  proof: new Set(["title"])
};

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

const REF_NOUNS = {
  figure: "Figure",
  table: "Table",
  listing: "Listing",
  theorem: "Theorem",
  lemma: "Lemma",
  definition: "Definition",
  corollary: "Corollary"
};

const KNOWN_METADATA = new Set([
  "type",
  "title",
  "subtitle",
  "author",
  "date",
  "language",
  "keywords",
  "abstract",
  "affiliations",
  "bibliography",
  "content"
]);

const BIBLIOGRAPHY_TYPES = {
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

export function buildDocument(ast, options = {}) {
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

  function splitArguments(node, componentName) {
    const namedNames = NAMED_ARGUMENTS[componentName] ?? new Set();
    const positional = [];
    const named = new Map();
    let sawNamed = false;
    for (const arg of node.args) {
      const isNamed =
        arg.kind === "Relation" &&
        arg.operator === "=" &&
        arg.left.kind === "Identifier" &&
        namedNames.has(arg.left.name);
      if (isNamed) {
        sawNamed = true;
        if (named.has(arg.left.name)) {
          fail(CATEGORY.ARITY, `Argument '${arg.left.name}' is given more than once`, arg);
          continue;
        }
        named.set(arg.left.name, arg.right);
        continue;
      }
      if (sawNamed) {
        fail(
          CATEGORY.ARITY,
          `Positional arguments must come before named arguments in ${componentName}()`,
          arg
        );
        continue;
      }
      positional.push(arg);
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

  function interpretMetadata(object) {
    let contentNode = null;
    const seen = new Set();

    for (const entry of object.entries) {
      const key = entry.key;
      if (seen.has(key)) {
        warn(CATEGORY.DOCUMENT, `Duplicate metadata field '${key}'; the last value is used`, { span: entry.keySpan });
      }
      seen.add(key);

      if (!KNOWN_METADATA.has(key)) {
        const hint = key === "page"
          ? " Use the page({ ... }) block for layout."
          : key === "sections"
            ? " Content blocks belong in the content field."
            : "";
        warn(CATEGORY.NAME, `Unknown document metadata field '${key}'.${hint}`, { span: entry.keySpan });
        continue;
      }

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
        case "bibliography": {
          for (const item of interpretBibliographyEntries(entry.value)) state.bibliography.push(item);
          break;
        }
        case "content": {
          contentNode = entry.value;
          break;
        }
        default:
          break;
      }
    }

    return contentNode;
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

  function attachLabel(blocks, owner, call) {
    const args = call.args;
    if (args.length !== 1 || args[0].kind !== "String" || args[0].value.trim() === "") {
      fail(CATEGORY.ARITY, 'label() expects a single non-empty string such as label("eq:series")', call);
      return;
    }
    const name = args[0].value;
    const target = blocks.length === 0 ? owner : blocks[blocks.length - 1];
    if (!target) {
      fail(CATEGORY.REFERENCE, `label("${name}") has no block to label`, call);
      return;
    }
    if (!LABELABLE.has(target.kind)) {
      fail(CATEGORY.REFERENCE, `A label cannot be attached to a ${target.kind} block`, call);
      return;
    }
    if (target.label) {
      fail(CATEGORY.REFERENCE, `The preceding block already has the label '${target.label}'`, call);
      return;
    }
    const number = target.kind === "section" ? target.refNumber : target.number;
    if (!number) {
      fail(CATEGORY.REFERENCE, `The block labelled '${name}' is not numbered and cannot be referenced`, call);
      return;
    }
    target.label = name;
    registerLabel(name, target.kind, number, target.id, call);
  }

  // --------------------------------------------------------------- inline

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
    if (!expectBlockCount(name, positional, [2], call)) return null;

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
    section.blocks = interpretBlocks(positional[1], section, { level });
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
    if (!expectBlockCount("figure", positional, [1], call)) return null;
    const imageNode = positional[0];
    if (imageNode.kind !== "Call" || imageNode.callee.name !== "image") {
      fail(CATEGORY.STRUCTURE, 'figure() expects an image such as image("plot.png")', imageNode);
      return null;
    }
    const image = interpretImage(imageNode);
    if (!image) return null;

    const caption = interpretCaption(named, "figure");
    const labelName = namedString(named, "label", "figure()");
    const numbered = Boolean(caption || labelName);
    const block = { kind: "figure", image, caption, number: null, label: null, id: null };
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

    let title = null;
    let contentNode = positional[0];
    if (positional.length === 2) {
      title = interpretInlineList(positional[0], `${typeName}() title`);
      contentNode = positional[1];
    }

    const blocks = interpretBlocks(contentNode, null, { level: 0 });
    if (blocks.length === 0) {
      fail(CATEGORY.STRUCTURE, `${typeName}() needs a statement`, contentNode);
      return null;
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
    const { positional } = splitArguments(call, "quote");
    if (!expectBlockCount("quote", positional, [1], call)) return null;
    const blocks = interpretBlocks(positional[0], null, { level: 0 });
    if (blocks.length === 0) {
      fail(CATEGORY.STRUCTURE, "quote() needs content", positional[0]);
      return null;
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
    const { positional, named } = splitArguments(call, "proof");
    if (!expectBlockCount("proof", positional, [1], call)) return null;
    const blocks = interpretBlocks(positional[0], null, { level: 0 });
    if (blocks.length === 0) {
      fail(CATEGORY.STRUCTURE, "proof() needs content", positional[0]);
      return null;
    }
    return { kind: "proof", title: namedString(named, "title", "proof()"), blocks };
  }

  function interpretPage(call) {
    const { positional } = splitArguments(call, "page");
    if (!expectBlockCount("page", positional, [1], call)) return null;
    const object = positional[0];
    if (object.kind !== "Object") {
      fail(CATEGORY.TYPE, "page() expects an object such as page({ size: \"A4\" })", object);
      return null;
    }
    if (state.pageConfigured) {
      warn(CATEGORY.DOCUMENT, "Duplicate page() configuration; the last configuration wins", call);
    }
    if (state.blockCount > 0) {
      warn(CATEGORY.DOCUMENT, "page() should be the first content block", call);
    }

    const known = new Set(["size", "orientation", "margins", "columns"]);
    const page = JSON.parse(JSON.stringify(state.page));
    for (const entry of object.entries) {
      if (!known.has(entry.key)) {
        fail(CATEGORY.NAME, `Unknown page option '${entry.key}'. Expected size, orientation, margins, or columns`, { span: entry.keySpan });
        continue;
      }
      switch (entry.key) {
        case "size": {
          const value = stringValue(entry.value);
          if (value === null) {
            fail(CATEGORY.TYPE, "Page size expects a string such as \"A4\"", entry.value);
            break;
          }
          const name = normalizeSizeName(value);
          if (!PAGE_SIZES[name]) {
            fail(CATEGORY.DOCUMENT, `Unknown page size '${value}'. Expected one of: A3, A4, A5, Letter, Legal`, entry.value);
            break;
          }
          page.size = name;
          break;
        }
        case "orientation": {
          const value = stringValue(entry.value);
          if (value !== "portrait" && value !== "landscape") {
            fail(CATEGORY.DOCUMENT, "Page orientation must be \"portrait\" or \"landscape\"", entry.value);
            break;
          }
          page.orientation = value;
          break;
        }
        case "columns": {
          const value = entry.value;
          const number = value.kind === "Number" ? value.value : null;
          if (number === null || !Number.isInteger(number) || number < 1 || number > 3) {
            fail(CATEGORY.DOMAIN, "Page columns must be a whole number between 1 and 3", value);
            break;
          }
          page.columns = number;
          break;
        }
        case "margins": {
          if (entry.value.kind !== "Object") {
            fail(CATEGORY.TYPE, "Page margins expect an object such as { top: \"25mm\", bottom: \"25mm\" }", entry.value);
            break;
          }
          const sides = new Set(["top", "right", "bottom", "left"]);
          for (const margin of entry.value.entries) {
            if (!sides.has(margin.key)) {
              fail(CATEGORY.NAME, `Unknown margin '${margin.key}'. Expected top, right, bottom, or left`, { span: margin.keySpan });
              continue;
            }
            const value = stringValue(margin.value);
            const parsed = value === null ? { ok: false, reason: "a margin must be a string such as \"25mm\"" } : parseLength(value);
            if (!parsed.ok) {
              fail(CATEGORY.TYPE, `Page margin '${margin.key}': ${parsed.reason}`, margin.value);
              continue;
            }
            page.margins[margin.key] = value;
          }
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

  function interpretBibliographyEntries(node) {
    if (node.kind !== "List") {
      fail(CATEGORY.TYPE, "bibliography() expects a list of entries", node);
      return [];
    }
    const entries = [];
    for (const element of node.elements) {
      if (element.kind !== "Object") {
        fail(CATEGORY.TYPE, "Each bibliography entry must be an object such as { key: \"smith2024\", ... }", element);
        continue;
      }
      const fields = new Map();
      let key = null;
      let type = "misc";
      for (const field of element.entries) {
        const value = stringValue(field.value);
        if (field.key === "key") {
          if (value === null || value.trim() === "") {
            fail(CATEGORY.TYPE, "A bibliography entry needs a non-empty 'key'", field.value);
            continue;
          }
          key = value;
          continue;
        }
        if (field.key === "type") {
          if (value === null || !BIBLIOGRAPHY_TYPES[value]) {
            fail(
              CATEGORY.DOCUMENT,
              `Unknown bibliography type '${value ?? ""}'. Expected one of: ${BIBLIOGRAPHY_TYPE_NAMES.join(", ")}`,
              field.value
            );
            continue;
          }
          type = value;
          continue;
        }
        if (value === null) {
          fail(CATEGORY.TYPE, `Bibliography field '${field.key}' expects a string or number`, field.value);
          continue;
        }
        fields.set(field.key, value);
      }

      if (key === null) {
        fail(CATEGORY.DOCUMENT, "Every bibliography entry needs a unique 'key'", element);
        continue;
      }
      if (state.bibliographyKeys.has(key)) {
        fail(CATEGORY.REFERENCE, `Duplicate bibliography key '${key}'`, element);
        continue;
      }
      state.bibliographyKeys.add(key);

      const spec = BIBLIOGRAPHY_TYPES[type];
      for (const required of spec.required) {
        if (!fields.has(required)) {
          fail(
            CATEGORY.DOCUMENT,
            `Bibliography entry '${key}' is missing the required field '${required}' for type '${type}'`,
            element
          );
        }
      }
      for (const name of fields.keys()) {
        if (!spec.fields.includes(name)) {
          warn(CATEGORY.NAME, `Field '${name}' is not used by bibliography type '${type}'`, element);
        }
      }
      entries.push({ key, type, fields: Object.fromEntries(fields), node: element });
    }
    return entries;
  }

  function interpretBibliographyBlock(call) {
    const { positional } = splitArguments(call, "bibliography");
    if (!expectBlockCount("bibliography", positional, [1], call)) return null;
    for (const entry of interpretBibliographyEntries(positional[0])) state.bibliography.push(entry);
    if (state.bibliographySeen) {
      warn(CATEGORY.DOCUMENT, "Duplicate bibliography block; entries are merged", call);
    }
    state.bibliographySeen = true;
    return { kind: "bibliography" };
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

    if (name === "document") {
      fail(CATEGORY.DOCUMENT, "A document cannot contain another document() call", call);
      return null;
    }

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
    if (name === "text") return interpretText(call);
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
    if (name === "bibliography") return interpretBibliographyBlock(call);
    if (name === "label") return null; // handled by interpretBlocks
    return null;
  }

  function interpretText(call) {
    if (call.args.length === 0) {
      fail(CATEGORY.ARITY, "text() expects at least one string or inline component", call);
      return null;
    }
    const content = [];
    for (const arg of call.args) content.push(...interpretInline(arg, "text()"));
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
      if (item.kind === "Call" && item.callee.name === "label") {
        attachLabel(blocks, owner, item);
        continue;
      }
      const block = interpretBlock(item, owner, context);
      if (block) {
        blocks.push(block);
        state.blockCount += 1;
      }
    }
    return blocks;
  }

  // ---------------------------------------------------------------- root

  function interpretDocumentCall(node) {
    const { positional } = splitArguments(node, "document");
    if (positional.length !== 1 || positional[0].kind !== "Object") {
      fail(
        CATEGORY.DOCUMENT,
        'document() expects a single object argument, for example document({ type: "article", content: [ ... ] })',
        node
      );
      return false;
    }

    const contentNode = interpretMetadata(positional[0]);
    if (!contentNode) {
      fail(CATEGORY.DOCUMENT, "document() is missing the required 'content' field", positional[0]);
      return false;
    }

    state.blocks = interpretBlocks(contentNode, null, { level: 0 });

    if (!state.metadata.title) {
      warn(CATEGORY.DOCUMENT, "This document has no title; add title: \"...\" to the metadata", positional[0]);
    }
    if (state.metadata.author.length === 0) {
      warn(CATEGORY.DOCUMENT, "This document has no author; add author: \"...\" to the metadata", positional[0]);
    }
    return true;
  }

  function build() {
    if (!ast) return null;

    let ok = false;
    if (ast.kind === "Call" && ast.callee.name === "document") {
      ok = interpretDocumentCall(ast);
    } else if (
      ast.kind === "Call" &&
      COMPONENTS[ast.callee.name] &&
      COMPONENTS[ast.callee.name].role !== "inline"
    ) {
      warn(
        CATEGORY.DOCUMENT,
        "This source is not wrapped in document({ ... }); it is rendered as a default article",
        ast
      );
      state.blocks = interpretBlocks(ast, null, { level: 0 });
      ok = true;
    } else {
      fail(
        CATEGORY.DOCUMENT,
        'A document must be a single document({ ... }) call, for example document({ type: "article", content: [ text("Hello") ] })',
        ast
      );
    }
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
