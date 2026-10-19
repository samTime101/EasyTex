import { CATEGORY, diagnostic, makeSpan, position } from "./diagnostics.js";

export const TOKEN = {
  NUMBER: "number",
  STRING: "string",
  IDENTIFIER: "identifier",
  OPERATOR: "operator",
  PUNCT: "punct",
  EOF: "eof"
};

const TWO_CHAR = new Set(["!=", "<=", ">="]);
const ONE_CHAR_OPERATOR = new Set(["+", "-", "*", "/", "%", "^", "=", "<", ">"]);
const PUNCT = new Set(["(", ")", "[", "]", "{", "}", ":", ","]);
const STRING_ESCAPES = { '"': '"', "\\": "\\", n: "\n", t: "\t", r: "\r" };

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isLetter(ch) {
  return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z");
}

function isIdentifierPart(ch) {
  return isLetter(ch) || isDigit(ch) || ch === "_";
}

export function tokenize(source) {
  const tokens = [];
  const diagnostics = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const here = () => position(offset, line, column);

  function advance() {
    const ch = source[offset];
    offset += 1;
    if (ch === "\r") {
      if (source[offset] === "\n") offset += 1;
      line += 1;
      column = 1;
    } else if (ch === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  function advanceMany(count) {
    for (let i = 0; i < count; i += 1) advance();
  }

  while (offset < source.length) {
    const ch = source[offset];

    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      advance();
      continue;
    }

    if (ch === "/" && source[offset + 1] === "/") {
      while (offset < source.length && source[offset] !== "\n" && source[offset] !== "\r") advance();
      continue;
    }

    if (ch === "/" && source[offset + 1] === "*") {
      const start = here();
      advanceMany(2);
      let closed = false;
      while (offset < source.length) {
        if (source[offset] === "*" && source[offset + 1] === "/") {
          advanceMany(2);
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) {
        diagnostics.push(
          diagnostic(CATEGORY.LEXICAL, "Unterminated block comment; expected '*/'", makeSpan(start, here()))
        );
      }
      continue;
    }

    if (ch === '"') {
      const start = here();
      const startOffset = offset;
      advance();
      let value = "";
      let closed = false;
      while (offset < source.length) {
        const current = source[offset];
        if (current === '"') {
          advance();
          closed = true;
          break;
        }
        if (current === "\n" || current === "\r") break;
        if (current === "\\") {
          const next = source[offset + 1];
          if (next !== undefined && STRING_ESCAPES[next] !== undefined) {
            value += STRING_ESCAPES[next];
            advanceMany(2);
            continue;
          }
          diagnostics.push(
            diagnostic(
              CATEGORY.LEXICAL,
              `Unsupported escape sequence '\\${next ?? ""}' in a string literal`,
              makeSpan(here())
            )
          );
          if (next === undefined) advance();
          else advanceMany(2);
          continue;
        }
        value += current;
        advance();
      }
      if (!closed) {
        diagnostics.push(
          diagnostic(CATEGORY.LEXICAL, "Unterminated string literal; expected a closing '\"'", makeSpan(start, here()))
        );
      }
      tokens.push({
        type: TOKEN.STRING,
        value,
        raw: source.slice(startOffset, offset),
        span: makeSpan(start, here())
      });
      continue;
    }

    if (isDigit(ch)) {
      const start = here();
      const startOffset = offset;
      let raw = "";
      while (offset < source.length && isDigit(source[offset])) {
        raw += source[offset];
        advance();
      }
      if (source[offset] === ".") {
        if (isDigit(source[offset + 1])) {
          raw += source[offset];
          advance();
          while (offset < source.length && isDigit(source[offset])) {
            raw += source[offset];
            advance();
          }
        } else {
          diagnostics.push(
            diagnostic(CATEGORY.LEXICAL, "Expected a digit after '.' in a numeric literal", makeSpan(here()))
          );
          advance();
        }
      }
      if (source[offset] === "e" || source[offset] === "E") {
        const next = source[offset + 1];
        const afterSign = source[offset + 2];
        const hasExponent =
          isDigit(next) || ((next === "+" || next === "-") && isDigit(afterSign));
        if (hasExponent) {
          raw += source[offset];
          advance();
          if (source[offset] === "+" || source[offset] === "-") {
            raw += source[offset];
            advance();
          }
          while (offset < source.length && isDigit(source[offset])) {
            raw += source[offset];
            advance();
          }
        }
      }
      tokens.push({
        type: TOKEN.NUMBER,
        value: raw,
        raw: source.slice(startOffset, offset),
        span: makeSpan(start, here())
      });
      continue;
    }

    if (isLetter(ch)) {
      const start = here();
      let value = "";
      while (offset < source.length && isIdentifierPart(source[offset])) {
        value += source[offset];
        advance();
      }
      tokens.push({ type: TOKEN.IDENTIFIER, value, span: makeSpan(start, here()) });
      continue;
    }

    const two = source.slice(offset, offset + 2);
    if (TWO_CHAR.has(two)) {
      const start = here();
      advanceMany(2);
      tokens.push({ type: TOKEN.OPERATOR, value: two, span: makeSpan(start, here()) });
      continue;
    }

    if (ONE_CHAR_OPERATOR.has(ch)) {
      const start = here();
      advance();
      tokens.push({ type: TOKEN.OPERATOR, value: ch, span: makeSpan(start, here()) });
      continue;
    }

    if (PUNCT.has(ch)) {
      const start = here();
      advance();
      tokens.push({ type: TOKEN.PUNCT, value: ch, span: makeSpan(start, here()) });
      continue;
    }

    diagnostics.push(
      diagnostic(CATEGORY.LEXICAL, `Unexpected character '${ch}'`, makeSpan(here()))
    );
    advance();
  }

  tokens.push({ type: TOKEN.EOF, value: "", span: makeSpan(here()) });
  return { tokens, diagnostics };
}
