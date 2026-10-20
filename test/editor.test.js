import test from "node:test";
import assert from "node:assert/strict";
import { scanSource, highlightSource } from "../web/highlight.js";
import {
  INDENT,
  autoCloseEdit,
  smartEnterEdit,
  deletePairEdit,
  indentEdit,
  formatSource,
  formatEdit,
  attachEditing
} from "../web/editing.js";
import { compileDocument, compile } from "../src/index.js";
import { DOCUMENT_EXAMPLES, DEFAULT_DOCUMENT_SOURCE } from "../web/document-examples.js";

function kinds(source) {
  return scanSource(source).map((token) => `${token.type}:${token.text}`);
}

function count(html, cls) {
  return html.split(`tok-${cls}`).length - 1;
}

// ------------------------------------------------------------------ scanner

test("the highlighter scanner is tolerant of incomplete input", () => {
  assert.deepEqual(kinds("sum(i, 1, n, i^2)"), [
    "identifier:sum",
    "punct:(",
    "identifier:i",
    "punct:,",
    "space: ",
    "number:1",
    "punct:,",
    "space: ",
    "identifier:n",
    "punct:,",
    "space: ",
    "identifier:i",
    "operator:^",
    "number:2",
    "punct:)"
  ]);

  // Unterminated strings and comments run to the end of the line or the source.
  assert.deepEqual(kinds('text("Hello'), ["identifier:text", "punct:(", "string:\"Hello"]);
  assert.deepEqual(kinds("/* note"), ["comment:/* note"]);
  assert.deepEqual(kinds("a // note\nb"), ["identifier:a", "space: ", "comment:// note", "space:\n", "identifier:b"]);
  assert.deepEqual(kinds('"a\\"b" c'), ['string:"a\\"b"', "space: ", "identifier:c"]);
});

test("the scanner reads numbers the way the lexer does", () => {
  assert.deepEqual(kinds("1.5e-3 + 2E4"), ["number:1.5e-3", "space: ", "operator:+", "space: ", "number:2E4"]);
  assert.deepEqual(kinds("2x"), ["number:2", "identifier:x"]);
});

// --------------------------------------------------------------- highlighting

test("highlightSource marks functions, constants, numbers, and operators", () => {
  const html = highlightSource("sum(i, 1, n, i^2) + pi");
  assert.equal(count(html, "function"), 1);
  assert.ok(html.includes('<span class="tok-function">sum</span>'));
  assert.ok(html.includes('<span class="tok-number">1</span>'));
  assert.ok(html.includes('<span class="tok-operator">^</span>'));
  assert.ok(html.includes('<span class="tok-operator">+</span>'));
  assert.ok(html.includes('<span class="tok-constant">pi</span>'));
  assert.ok(html.includes('<span class="tok-punct">(</span>'));
});

test("highlightSource only marks components and fields when asked", () => {
  const math = highlightSource('document({ type: "report" })');
  assert.equal(count(math, "component"), 0);
  assert.equal(count(math, "field"), 0);

  const writer = highlightSource('document({ type: "report" })', { components: true, fields: true });
  assert.ok(writer.includes('<span class="tok-component">document</span>'));
  assert.ok(writer.includes('<span class="tok-field">type</span>'));
  assert.ok(writer.includes('<span class="tok-string">"report"</span>'));

  // A name is a field only in field position: label(...) stays a component.
  const call = highlightSource('label("sec")', { components: true, fields: true });
  assert.ok(call.includes('<span class="tok-component">label</span>'));
  assert.equal(count(call, "field"), 0);

  const named = highlightSource('label="sec"', { components: true, fields: true });
  assert.ok(named.includes('<span class="tok-field">label</span>'));
  assert.equal(count(named, "component"), 0);
});

test("highlightSource marks booleans and escapes markup", () => {
  const html = highlightSource("number=true, x != 2 < 3 & 4", { fields: true });
  assert.ok(html.includes('<span class="tok-field">number</span>'));
  assert.ok(html.includes('<span class="tok-boolean">true</span>'));
  assert.ok(html.includes('<span class="tok-operator">!=</span>'));
  assert.ok(html.includes("&lt;"));
  assert.ok(html.includes("&amp;"));
  assert.ok(!html.includes("< 3"));
});

test("highlightSource leaves free variables and unknown names plain", () => {
  const html = highlightSource("alpha n x_1", { components: true, fields: true });
  assert.equal(count(html, "constant"), 0);
  assert.equal(count(html, "field"), 0);
  assert.equal(html, "alpha n x_1");
});

// -------------------------------------------------------------- auto-closing

test("typing an opening bracket inserts the pair or wraps the selection", () => {
  assert.deepEqual(autoCloseEdit("", 0, 0, "("), {
    start: 0,
    end: 0,
    text: "()",
    selectionStart: 1,
    selectionEnd: 1
  });
  assert.deepEqual(autoCloseEdit("a + b", 0, 5, "("), {
    start: 0,
    end: 5,
    text: "(a + b)",
    selectionStart: 1,
    selectionEnd: 6
  });
  assert.deepEqual(autoCloseEdit("sum", 3, 3, "["), {
    start: 3,
    end: 3,
    text: "[]",
    selectionStart: 4,
    selectionEnd: 4
  });
});

test("typing a closing bracket steps over the auto-inserted one", () => {
  assert.deepEqual(autoCloseEdit("()", 1, 1, ")"), {
    start: 1,
    end: 1,
    text: "",
    selectionStart: 2,
    selectionEnd: 2
  });
  assert.equal(autoCloseEdit("x", 1, 1, ")"), null);
  assert.equal(autoCloseEdit("x", 0, 1, ")"), null, "a selection is replaced, never skipped");
  assert.equal(autoCloseEdit("2", 1, 1, "5"), null);
});

test("quotes pair, step over, and close after a word", () => {
  assert.deepEqual(autoCloseEdit("text(", 5, 5, '"'), {
    start: 5,
    end: 5,
    text: '""',
    selectionStart: 6,
    selectionEnd: 6
  });
  assert.deepEqual(autoCloseEdit('text("")', 6, 6, '"'), {
    start: 6,
    end: 6,
    text: "",
    selectionStart: 7,
    selectionEnd: 7
  });
  assert.deepEqual(autoCloseEdit('text("Hello', 11, 11, '"'), {
    start: 11,
    end: 11,
    text: '"',
    selectionStart: 12,
    selectionEnd: 12
  });
  // An escaped quote inside a string is not paired.
  assert.equal(autoCloseEdit('text("a\\', 8, 8, '"').text, '"');
});

test("Backspace removes an empty pair", () => {
  assert.deepEqual(deletePairEdit("()", 1, 1), {
    start: 0,
    end: 2,
    text: "",
    selectionStart: 0,
    selectionEnd: 0
  });
  assert.deepEqual(deletePairEdit('""', 1, 1).text, "");
  assert.equal(deletePairEdit("( x )", 3, 3), null);
  assert.equal(deletePairEdit("()", 0, 1), null, "Backspace with a selection deletes it normally");
  assert.equal(deletePairEdit("x)", 0, 0), null);
});

test("Backspace key handling deletes an empty pair", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { execCommand: () => false };
  try {
    function fakeTextarea(value, start, end) {
      return {
        value,
        selectionStart: start,
        selectionEnd: end,
        handlers: new Map(),
        events: [],
        addEventListener(type, handler) {
          this.handlers.set(type, handler);
        },
        setSelectionRange(nextStart, nextEnd) {
          this.selectionStart = nextStart;
          this.selectionEnd = nextEnd;
        },
        setRangeText(text, rangeStart, rangeEnd) {
          this.value = this.value.slice(0, rangeStart) + text + this.value.slice(rangeEnd);
          this.selectionStart = rangeStart + text.length;
          this.selectionEnd = rangeStart + text.length;
        },
        dispatchEvent(event) {
          this.events.push(event.type);
          return true;
        }
      };
    }
    function keydown(key) {
      return {
        key,
        isComposing: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        }
      };
    }

    const deleting = fakeTextarea("()", 1, 1);
    attachEditing({ textarea: deleting });
    const backspace = keydown("Backspace");
    deleting.handlers.get("keydown")(backspace);
    assert.equal(backspace.defaultPrevented, true);
    assert.equal(deleting.value, "");
    assert.equal(deleting.selectionStart, 0);
    assert.deepEqual(deleting.events, ["input"]);

    const skipping = fakeTextarea("()", 1, 1);
    attachEditing({ textarea: skipping });
    const closer = keydown(")");
    skipping.handlers.get("keydown")(closer);
    assert.equal(closer.defaultPrevented, true);
    assert.equal(skipping.value, "()");
    assert.equal(skipping.selectionStart, 2);
    assert.deepEqual(skipping.events, []);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

// ------------------------------------------------------------ smart newlines

test("Enter keeps the indentation and opens blocks", () => {
  assert.deepEqual(smartEnterEdit("  foo", 5, 5), {
    start: 5,
    end: 5,
    text: `\n${INDENT}`,
    selectionStart: 8,
    selectionEnd: 8
  });

  // After an opener the line is indented one level deeper.
  assert.deepEqual(smartEnterEdit("  foo(", 6, 6), {
    start: 6,
    end: 6,
    text: `\n${INDENT}${INDENT}`,
    selectionStart: 11,
    selectionEnd: 11
  });

  // Between a bracket pair Enter expands into an indented block.
  assert.deepEqual(smartEnterEdit("document({})", 10, 10), {
    start: 10,
    end: 10,
    text: `\n${INDENT}\n`,
    selectionStart: 13,
    selectionEnd: 13
  });

  // Quotes never open an indented block.
  assert.equal(smartEnterEdit('text("")', 6, 6).text, "\n");
});

// -------------------------------------------------------------- indentation

test("Tab indents and Shift+Tab unindents every selected line", () => {
  assert.deepEqual(indentEdit("one\ntwo", 0, 7), {
    start: 0,
    end: 7,
    text: "  one\n  two",
    selectionStart: 0,
    selectionEnd: 11
  });

  assert.deepEqual(indentEdit("  one\n    two", 2, 13, { unindent: true }), {
    start: 0,
    end: 13,
    text: "one\n  two",
    selectionStart: 0,
    selectionEnd: 9
  });

  // A selection that ends at a line start never touches the next line.
  assert.deepEqual(indentEdit("one\ntwo\n", 0, 4), {
    start: 0,
    end: 3,
    text: "  one",
    selectionStart: 0,
    selectionEnd: 6
  });

  // Blank lines stay empty instead of collecting trailing spaces.
  assert.equal(indentEdit("one\n\n", 0, 3).text, "  one");
  assert.equal(indentEdit("one\n   \ntwo", 0, 9).text, "  one\n\n  two");
});

// ---------------------------------------------------------------- formatting

test("formatSource re-indents nested calls, lists, and objects", () => {
  const messy = [
    "document({",
    '      type: "article",',
    "  content: [",
    'section("A", [',
    ' text("x"),',
    "   ],",
    " ),",
    "],",
    "})"
  ].join("\n");

  const expected = [
    "document({",
    '  type: "article",',
    "  content: [",
    '    section("A", [',
    '      text("x"),',
    "    ],",
    "    ),",
    "  ],",
    "})"
  ].join("\n");

  assert.equal(formatSource(messy), expected);
  assert.equal(formatSource(expected), expected, "formatting is idempotent");
});

test("formatSource ignores brackets inside strings and comments", () => {
  const source = 'text("a ( b")\n// }\n/* [ */\nx = 1';
  assert.equal(formatSource(source), source);

  // A comment line that begins with a closing bracket is not a closer.
  const nested = "foo({\n  // )\n  bar: 1\n})";
  assert.equal(formatSource(nested), nested);
});

test("the shipped sources are already formatted and survive formatting", () => {
  assert.equal(formatSource(DEFAULT_DOCUMENT_SOURCE), DEFAULT_DOCUMENT_SOURCE);
  for (const example of DOCUMENT_EXAMPLES) {
    assert.equal(formatSource(example.source), example.source, `${example.label} should be canonical`);
  }
});

test("formatEdit maps the selection through the new indentation", () => {
  const source = "document({\ncontent: [\ntext(1)\n]\n})";
  const { source: next, selectionStart, selectionEnd } = formatEdit(source, 22, 29);
  assert.equal(next, "document({\n  content: [\n    text(1)\n  ]\n})");
  assert.equal(next.slice(selectionStart, selectionEnd), "text(1)");
});

test("formatting never changes what a document means", () => {
  const messy = DEFAULT_DOCUMENT_SOURCE.replace(/^  /gm, "     ");
  const formatted = formatSource(messy);
  const before = compileDocument(DEFAULT_DOCUMENT_SOURCE);
  const after = compileDocument(formatted);
  assert.deepEqual(
    after.diagnostics.map((entry) => entry.message),
    before.diagnostics.map((entry) => entry.message)
  );
  assert.ok(after.html);
});

// A formatting sanity check for the expression editor as well.
test("formatting keeps expressions valid", () => {
  const result = compile(formatSource("sum(i,\n1,\nn,\ni^2)"));
  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.mathml);
});
