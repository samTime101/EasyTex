// Snippet helpers for the document writer.
//
// A component snippet is the starter source inserted when the component is
// accepted from autocomplete. It may contain a single "$0" marker; after
// insertion the marker is removed and the caret is placed there. Continuation
// lines are indented to match the line the snippet is inserted into, so
// nested components stay aligned.

const CARET = "$0";
const SENTINEL = "\u0000";

export function prepareSnippet(snippet, indent = "") {
  const marked = snippet.includes(CARET) ? snippet.replace(CARET, SENTINEL) : `${snippet}${SENTINEL}`;
  const indented = marked
    .split("\n")
    .map((line, index) => (index === 0 || indent === "" ? line : indent + line))
    .join("\n");
  const caret = indented.indexOf(SENTINEL);
  return { text: indented.replace(SENTINEL, ""), caret };
}

export function lineIndent(value, offset) {
  const lineStart = value.lastIndexOf("\n", offset - 1) + 1;
  const match = /^[ \t]*/.exec(value.slice(lineStart, offset));
  return match ? match[0] : "";
}
