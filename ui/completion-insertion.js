// The text a suggestion inserts, and where the caret lands afterwards.
//
// The rules differ per kind: a field name may already have its separator, a
// value may need quotes, and a component expands to a starter snippet. The
// function is pure, so the acceptance rules are unit-tested.

import { prepareSnippet, lineIndent } from "./snippets.js";

// A starter snippet may begin with a binding: "document = Document(...)".
// When the reader has already written that binding, only the call goes in,
// so the document does not get the binding twice.
function withoutRepeatedBinding(snippet, source, tokenStart) {
  const binding = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/.exec(snippet);
  if (!binding) return snippet;
  const written = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/.exec(source.slice(0, tokenStart));
  if (!written || written[1] !== binding[1]) return snippet;
  return snippet.slice(binding[0].length);
}

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
    const snippet = withoutRepeatedBinding(doc.snippet, source, tokenStart);
    const prepared = prepareSnippet(snippet, lineIndent(source, tokenStart));
    return { inserted: prepared.text, caretOffset: prepared.caret };
  }

  // A function with arguments is inserted expanded, with the names of the
  // parameters as placeholders: integral(variable, start, end, expression).
  // The first placeholder is selected, so typing replaces it.
  if (doc.kind === "function" && doc.args?.length) {
    const names = doc.args.map((argument) => argument.name);
    const inserted = `${doc.name}(${names.join(", ")})`;
    const from = doc.name.length + 1;
    return {
      inserted,
      caretOffset: inserted.length,
      selectionStart: from,
      selectionEnd: from + names[0].length
    };
  }

  const isFunction = doc.kind === "function" || doc.kind === "component";
  const inserted = isFunction ? `${doc.name}()` : doc.name;
  return { inserted, caretOffset: isFunction ? doc.name.length + 1 : inserted.length };
}
