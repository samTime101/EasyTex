// The text a suggestion inserts, and where the caret lands afterwards.
//
// The rules differ per kind: a field name may already have its separator, a
// value may need quotes, and a component expands to a starter snippet. The
// function is pure, so the acceptance rules are unit-tested.

import { prepareSnippet, lineIndent } from "./snippets.js";

export function completionInsertion(doc, options = {}) {
  const source = options.source ?? "";
  const tokenStart = options.tokenStart ?? 0;
  const tokenEnd = options.tokenEnd ?? 0;

  if (doc.kind === "field") {
    // A named argument is written name = value; the value follows the
    // separator, so the caret lands right after it.
    const nextChar = source[tokenEnd] ?? "";
    const inserted = nextChar === "=" ? doc.name : `${doc.name}=`;
    return { inserted, caretOffset: inserted.length };
  }
  if (doc.kind === "method") {
    const inserted = `${doc.name}(`;
    return { inserted, caretOffset: inserted.length };
  }
  if (doc.kind === "value") {
    const inserted = doc.quote ? `"${doc.value}"` : doc.value;
    return { inserted, caretOffset: inserted.length };
  }
  if (doc.snippet) {
    const prepared = prepareSnippet(doc.snippet, lineIndent(source, tokenStart));
    return { inserted: prepared.text, caretOffset: prepared.caret };
  }

  const isFunction = doc.kind === "function" || doc.kind === "component";
  const inserted = isFunction ? `${doc.name}()` : doc.name;
  return { inserted, caretOffset: isFunction ? doc.name.length + 1 : inserted.length };
}
