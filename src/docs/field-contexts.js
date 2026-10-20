// Context-specific field lists and value options for the writer's autocomplete.
//
// FIELD_DOCS is the canonical description of every field. This module only
// answers two questions around a caret: which fields belong in this object,
// and which values are valid for the current field.

import { FIELD_DOCS } from "./fields.js";
import { BIBLIOGRAPHY_TYPES } from "../document/build.js";

const fieldByName = new Map(FIELD_DOCS.map((field) => [field.name, field]));

function scopeNames(scope) {
  return FIELD_DOCS.filter((field) => field.scope === scope).map((field) => field.name);
}

const referenceFields = [];
for (const spec of Object.values(BIBLIOGRAPHY_TYPES)) {
  for (const name of spec.fields) {
    if (!referenceFields.includes(name)) referenceFields.push(name);
  }
}

export const FIELD_CONTEXTS = {
  document: {
    label: "Document metadata",
    fields: scopeNames("metadata")
  },
  page: {
    label: "Page options",
    fields: scopeNames("page option")
  },
  margins: {
    label: "Margins",
    fields: scopeNames("margin")
  },
  reference: {
    label: "Reference fields",
    fields: ["key", "type", ...referenceFields]
  }
};

function uniqueNames(names) {
  return [...new Set(names)];
}

export function contextFieldDocs(context, referenceType = null) {
  const definition = Object.hasOwn(FIELD_CONTEXTS, context) ? FIELD_CONTEXTS[context] : null;
  if (!definition) return [];

  let names = definition.fields;
  const spec =
    context === "reference" && Object.hasOwn(BIBLIOGRAPHY_TYPES, referenceType)
      ? BIBLIOGRAPHY_TYPES[referenceType]
      : null;
  if (spec) {
    // Required fields come first so a new entry can be filled in top to bottom.
    names = ["key", "type", ...(spec.required ?? []), ...(spec.fields ?? [])];
  }

  return uniqueNames(names)
    .map((name) => fieldByName.get(name))
    .filter(Boolean);
}

export function fieldOptionGroup(doc, context) {
  if (!doc) return null;
  if (doc.name === "number" && context === "reference") return null;
  if (doc.name === "type" && doc.valueGroups?.length) {
    const label = context === "reference" ? "Reference types" : "Document templates";
    return doc.valueGroups.find((group) => group.label === label) ?? doc.valueGroups[0];
  }
  if (doc.valueGroups?.length) return doc.valueGroups[0];
  if (doc.values?.length) return { label: "Values", values: doc.values };
  return null;
}

export function fieldValueInfo(doc, context) {
  if (doc?.name === "number" && context === "reference") {
    return { group: null, values: [], defaultValue: null, label: null };
  }
  const group = fieldOptionGroup(doc, context);
  const values = group?.values ?? doc?.values ?? [];
  const defaultValue = group?.defaultValue ?? doc?.defaultValue ?? null;
  return {
    group,
    values,
    defaultValue,
    label: group?.label ?? null
  };
}

export function fieldSignature(doc, context) {
  const info = fieldValueInfo(doc, context);
  const type =
    doc.name === "number" && context === "reference" ? "string or number" : doc.type ?? "field";
  const signature = [type];
  if (info.defaultValue) signature.push(`default ${info.defaultValue}`);
  else if (info.values.length) signature.push(`${info.values.length} options`);
  return signature.join(" · ");
}
