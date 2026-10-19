import { FUNCTION_DOCS } from "./functions.js";
import { CONSTANT_DOCS } from "./constants.js";
import { OPERATOR_DOCS, SYNTAX_NOTES, PRECEDENCE_EXAMPLES } from "./operators.js";

export { FUNCTION_DOCS, CONSTANT_DOCS, OPERATOR_DOCS, SYNTAX_NOTES, PRECEDENCE_EXAMPLES };

export const FUNCTION_CATEGORY_ORDER = [
  "Arithmetic and algebra",
  "Trigonometry",
  "Bounded operations",
  "Calculus",
  "Structures"
];

export const CONSTANT_CATEGORY_ORDER = ["Constants"];

export const OPERATOR_CATEGORY_ORDER = ["Arithmetic operators", "Relations"];

const byName = new Map();
for (const doc of FUNCTION_DOCS) byName.set(doc.name, { ...doc, kind: "function" });
for (const doc of CONSTANT_DOCS) byName.set(doc.name, { ...doc, kind: "constant" });

export function docsFor(name) {
  return byName.get(name) ?? null;
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

export function matchDocumentation(prefix, options = {}) {
  const normalized = options.caseInsensitive ? prefix.toLowerCase() : prefix;
  const matches = [];
  for (const doc of byName.values()) {
    const candidate = options.caseInsensitive ? doc.name.toLowerCase() : doc.name;
    if (options.all || normalized === "" || candidate.startsWith(normalized)) {
      matches.push({ ...doc });
    }
  }
  matches.sort((a, b) => {
    if (a.name === b.name) return 0;
    if (a.kind !== b.kind) return a.kind === "function" ? -1 : 1;
    return a.name < b.name ? -1 : 1;
  });
  return matches;
}
