// The portable manifest of the MathScript language.
//
// The manifest is a plain JSON description of the whole language surface:
// functions, constants, symbols, operators, document components, fields,
// templates, and the LaTeX compatibility catalog. It exists so that the
// engine can be re-implemented in another language, or bound to another
// platform, without reading the engine's source code.
//
// Everything here is data: no I/O, no browser APIs, no operating-system
// calls, and no dependence on the host that renders it.

import { CONSTANTS, FUNCTIONS, GREEK, LATEX_GREEK } from "./builtins.js";
import { LATEX_SYMBOLS, SYMBOLS } from "./symbols.js";
import { OPERATOR_DOCS } from "./docs/operators.js";
import { FIELD_DOCS } from "./docs/fields.js";
import { LATEX_DOCS } from "./docs/latex.js";
import { COMPONENTS } from "./document/components.js";
import { TEMPLATES, PAGE_SIZES, DEFAULT_PAGE } from "./document/templates.js";
import {
  BIBLIOGRAPHY_TYPES,
  KNOWN_METADATA,
  NAMED_ARGUMENTS,
  PAGE_OPTIONS
} from "./document/build.js";

export const ENGINE_NAME = "easytex";
export const ENGINE_VERSION = "0.1.0";

function sorted(values) {
  return [...values].sort();
}

function namedArguments() {
  const result = {};
  for (const [component, names] of Object.entries(NAMED_ARGUMENTS)) {
    result[component] = sorted(names);
  }
  return result;
}

function components() {
  return Object.values(COMPONENTS).map((component) => ({
    name: component.name,
    role: component.role,
    category: component.category,
    status: component.status,
    signature: component.signature,
    containers: component.containers ?? [],
    positional: component.positional ?? [],
    variadic: component.variadic === true,
    args: (component.args ?? []).map((arg) => ({
      name: arg.name,
      type: arg.type,
      description: arg.description
    })),
    named: sorted(component.named ?? [])
  }));
}

function fields() {
  return FIELD_DOCS.map((field) => ({
    name: field.name,
    scope: field.scope,
    type: field.type,
    summary: field.summary,
    values: field.values ?? null,
    valueGroups: (field.valueGroups ?? []).map((group) => ({
      label: group.label,
      values: group.values,
      defaultValue: group.defaultValue ?? null
    })),
    defaultValue: field.defaultValue ?? null
  }));
}

function templates() {
  return Object.values(TEMPLATES).map((template) => ({
    name: template.name,
    label: template.label,
    latexClass: template.latexClass,
    numbered: template.numbered,
    toc: template.toc,
    abstract: template.abstract,
    page: template.page ?? null
  }));
}

function pageSizes() {
  return Object.entries(PAGE_SIZES).map(([name, size]) => ({
    name,
    width: size.width,
    height: size.height,
    latex: size.latex
  }));
}

function bibliographyTypes() {
  const result = {};
  for (const [name, spec] of Object.entries(BIBLIOGRAPHY_TYPES)) {
    result[name] = { required: spec.required, fields: spec.fields };
  }
  return result;
}

function latexCatalog() {
  return LATEX_DOCS.map((row) => ({
    category: row.category,
    latex: row.latex,
    mathscript: row.mathscript,
    status: row.status,
    target: row.target,
    note: row.note
  }));
}

// The complete language surface as plain data. The shape is stable: a host
// in another language can read this JSON and reproduce the same language
// without linking against this engine.
export function engineManifest() {
  return {
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    language: "MathScript",
    functions: Object.entries(FUNCTIONS).map(([name, spec]) => ({
      name,
      arity: spec.arity,
      kind: spec.kind,
      binder: spec.binder === true,
      infinityBounds: spec.infinityBounds === true,
      infinityTarget: spec.infinityTarget === true
    })),
    constants: sorted(CONSTANTS),
    greek: Object.entries(GREEK).map(([name, symbol]) => ({
      name,
      symbol,
      latex: LATEX_GREEK[name] ?? null
    })),
    symbols: Object.entries(SYMBOLS).map(([name, symbol]) => ({
      name,
      symbol,
      latex: LATEX_SYMBOLS[name] ?? null
    })),
    operators: OPERATOR_DOCS.map((operator) => ({
      symbol: operator.symbol,
      category: operator.category,
      meaning: operator.meaning
    })),
    components: components(),
    fields: fields(),
    metadata: sorted(KNOWN_METADATA),
    pageOptions: sorted(PAGE_OPTIONS),
    marginSides: sorted(
      [...PAGE_OPTIONS].filter((option) => option === "margin" || option.startsWith("margin_"))
    ),
    namedArguments: namedArguments(),
    bibliographyTypes: bibliographyTypes(),
    templates: templates(),
    pageSizes: pageSizes(),
    defaultPage: DEFAULT_PAGE,
    latex: latexCatalog()
  };
}
