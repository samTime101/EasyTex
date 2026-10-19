import { FUNCTION_DOCS } from "./functions.js";
import { CONSTANT_DOCS } from "./constants.js";
import { OPERATOR_DOCS, SYNTAX_NOTES, PRECEDENCE_EXAMPLES } from "./operators.js";
import { FIELD_DOCS, FIELD_SCOPE_ORDER, FIELD_SCOPE_LABELS } from "./fields.js";
import { GREEK_DOCS } from "./greek.js";
import { COMPONENT_DOCS, COMPONENT_CATEGORY_ORDER } from "../document/components.js";

export { FUNCTION_DOCS, CONSTANT_DOCS, OPERATOR_DOCS, SYNTAX_NOTES, PRECEDENCE_EXAMPLES };
export { FIELD_DOCS, FIELD_SCOPE_ORDER, FIELD_SCOPE_LABELS };
export { GREEK_DOCS };
export { COMPONENT_DOCS, COMPONENT_CATEGORY_ORDER };

export const FUNCTION_CATEGORY_ORDER = [
  "Arithmetic and algebra",
  "Trigonometry",
  "Bounded operations",
  "Calculus",
  "Structures"
];

export const CONSTANT_CATEGORY_ORDER = ["Constants"];

export const OPERATOR_CATEGORY_ORDER = ["Arithmetic operators", "Relations"];

const KIND_ORDER = { function: 0, constant: 1, component: 2 };

const byName = new Map();
for (const doc of FUNCTION_DOCS) byName.set(doc.name, { ...doc, kind: "function" });
for (const doc of CONSTANT_DOCS) byName.set(doc.name, { ...doc, kind: "constant" });
for (const doc of COMPONENT_DOCS) byName.set(doc.name, { ...doc, kind: "component" });

export function docsFor(name) {
  return byName.get(name) ?? null;
}

const fieldByName = new Map();
for (const doc of FIELD_DOCS) fieldByName.set(doc.name, doc);

export function fieldDocsFor(name) {
  return fieldByName.get(name) ?? null;
}

export function hasDocs(name) {
  return byName.has(name);
}

export function documentationNames() {
  return [...byName.keys()];
}

export function groupByCategory(docs, order) {
  const groups = new Map(order.map((category) => [category, []]));
  for (const doc of docs) {
    if (!groups.has(doc.category)) groups.set(doc.category, []);
    groups.get(doc.category).push(doc);
  }
  return [...groups.entries()]
    .map(([category, items]) => ({ category, items }))
    .filter((group) => group.items.length > 0);
}

export function groupOperatorsByCategory() {
  return groupByCategory(OPERATOR_DOCS, OPERATOR_CATEGORY_ORDER);
}

export function groupFunctionsByCategory() {
  return groupByCategory(FUNCTION_DOCS, FUNCTION_CATEGORY_ORDER);
}

export function groupConstantsByCategory() {
  return groupByCategory(CONSTANT_DOCS, CONSTANT_CATEGORY_ORDER);
}

export function groupComponentsByCategory() {
  return groupByCategory(COMPONENT_DOCS, COMPONENT_CATEGORY_ORDER);
}

export function groupFieldsByScope() {
  const groups = new Map(FIELD_SCOPE_ORDER.map((scope) => [scope, []]));
  for (const doc of FIELD_DOCS) {
    if (!groups.has(doc.scope)) groups.set(doc.scope, []);
    groups.get(doc.scope).push(doc);
  }
  return [...groups.entries()]
    .map(([scope, items]) => ({ scope, label: FIELD_SCOPE_LABELS[scope] ?? scope, items }))
    .filter((group) => group.items.length > 0);
}

export function matchDocumentation(prefix, options = {}) {
  const normalized = options.caseInsensitive ? prefix.toLowerCase() : prefix;
  const kinds = options.kinds ? new Set(options.kinds) : null;
  const matches = [];
  for (const doc of byName.values()) {
    if (kinds && !kinds.has(doc.kind)) continue;
    const candidate = options.caseInsensitive ? doc.name.toLowerCase() : doc.name;
    if (options.all || normalized === "" || candidate.startsWith(normalized)) {
      matches.push({ ...doc });
    }
  }
  matches.sort((a, b) => {
    if (a.kind !== b.kind) return (KIND_ORDER[a.kind] ?? 3) - (KIND_ORDER[b.kind] ?? 3);
    if (a.name === b.name) return 0;
    return a.name < b.name ? -1 : 1;
  });
  return matches;
}
