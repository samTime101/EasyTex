import { CATEGORY, diagnostic, makeSpan, mergeSpans } from "./diagnostics.js";
import { splitTopLevel, tokenize, TOKEN } from "./lexer.js";

class ParseError extends Error {
  constructor(message, span) {
    super(message);
    this.span = span;
  }
}

const RELATION_OPERATORS = new Set(["=", "!=", "<", ">", "<=", ">="]);

function numberNode(token) {
  return {
    kind: "Number",
    raw: token.raw,
    value: Number(token.raw),
    span: token.span
  };
}

function identifierNode(token) {
  return {
    kind: "Identifier",
    name: token.value,
    span: token.span
  };
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  peek(offset = 0) {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  atEnd() {
    return this.peek().type === TOKEN.EOF;
  }

  advance() {
    const token = this.peek();
    if (!this.atEnd()) this.index += 1;
    return token;
  }

  isPunct(value) {
    const token = this.peek();
    return token.type === TOKEN.PUNCT && token.value === value;
  }

  isOperator(value) {
    const token = this.peek();
    return token.type === TOKEN.OPERATOR && token.value === value;
  }

  matchOperator(...values) {
    if (values.includes(this.peek().value) && this.peek().type === TOKEN.OPERATOR) {
      return this.advance();
    }
    return null;
  }

  matchPunct(value) {
    if (this.isPunct(value)) return this.advance();
    return null;
  }

  expectPunct(value, context) {
    if (this.isPunct(value)) return this.advance();
    const token = this.peek();
    const message = context
      ? `Expected '${value}' to close ${context}`
      : `Expected '${value}'`;
    throw new ParseError(message, token.span);
  }

  parse() {
    const expression = this.parseExpression();
    if (!this.atEnd()) {
      const token = this.peek();
      throw new ParseError(this.describeTrailing(expression, token), token.span);
    }
    return expression;
  }

  describeTrailing(expression, token) {
    if (expression.kind === "Relation" && token.type === TOKEN.OPERATOR && RELATION_OPERATORS.has(token.value)) {
      return "Relations cannot be chained in this version";
    }
    if (expression.kind === "Number" && (token.type === TOKEN.IDENTIFIER || (token.type === TOKEN.PUNCT && token.value === "("))) {
      return `Unexpected '${token.value}' after a number. Implicit multiplication is not defined; write an explicit '*'`;
    }
    if (token.type === TOKEN.IDENTIFIER || (token.type === TOKEN.PUNCT && token.value === "(")) {
      return `Unexpected '${token.value}'. Implicit multiplication is not defined; write an explicit '*'`;
    }
    return `Unexpected token '${token.value}' after the expression`;
  }

  parseExpression() {
    return this.parseRelation();
  }

  parseRelation() {
    const left = this.parseAdditive();
    const token = this.peek();
    if (token.type === TOKEN.OPERATOR && RELATION_OPERATORS.has(token.value)) {
      this.advance();
      const right = this.parseAdditive();
      return {
        kind: "Relation",
        operator: token.value,
        left,
        right,
        span: mergeSpans(left.span, right.span)
      };
    }
    return left;
  }

  parseAdditive() {
    let node = this.parseMultiplicative();
    let token;
    while ((token = this.matchOperator("+", "-"))) {
      const right = this.parseMultiplicative();
      node = {
        kind: "Binary",
        operator: token.value,
        left: node,
        right,
        span: mergeSpans(node.span, right.span)
      };
    }
    return node;
  }

  parseMultiplicative() {
    let node = this.parseUnary();
    let token;
    while ((token = this.matchOperator("*", "/", "%"))) {
      const right = this.parseUnary();
      node = {
        kind: "Binary",
        operator: token.value,
        left: node,
        right,
        span: mergeSpans(node.span, right.span)
      };
    }
    return node;
  }

  parseUnary() {
    const token = this.matchOperator("+", "-");
    if (token) {
      const operand = this.parseUnary();
      return {
        kind: "Unary",
        operator: token.value,
        operand,
        span: mergeSpans(token.span, operand.span)
      };
    }
    return this.parsePower();
  }

  parsePower() {
    const base = this.parsePrimary();
    if (this.matchOperator("^")) {
      const exponent = this.parseUnary();
      return {
        kind: "Binary",
        operator: "^",
        left: base,
        right: exponent,
        span: mergeSpans(base.span, exponent.span)
      };
    }
    return base;
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === TOKEN.NUMBER) {
      this.advance();
      return numberNode(token);
    }

    if (token.type === TOKEN.STRING) {
      this.advance();
      return {
        kind: "String",
        value: token.value,
        raw: token.raw,
        span: token.span
      };
    }

    if (token.type === TOKEN.IDENTIFIER) {
      this.advance();
      if (this.isPunct("(")) {
        return this.parseCall(token);
      }
      if (token.value === "true" || token.value === "false") {
        return {
          kind: "Boolean",
          value: token.value === "true",
          span: token.span
        };
      }
      return identifierNode(token);
    }

    if (this.matchPunct("(")) {
      const open = this.tokens[this.index - 1];
      const inner = this.parseExpression();
      const close = this.expectPunct(")", `the group opened at line ${open.span.start.line}`);
      inner.span = mergeSpans(open.span, close.span);
      return inner;
    }

    if (this.isPunct("[")) {
      return this.parseList();
    }

    if (this.isPunct("{")) {
      return this.parseObject();
    }

    if (this.atEnd()) {
      throw new ParseError("Unexpected end of input; expected an expression", token.span);
    }

    throw new ParseError(`Expected an expression, found '${token.value}'`, token.span);
  }

  parseCall(calleeToken) {
    this.expectPunct("(", `the call to '${calleeToken.value}'`);
    const args = [];
    if (this.isPunct(")")) {
      const close = this.advance();
      return {
        kind: "Call",
        callee: identifierNode(calleeToken),
        args,
        span: mergeSpans(calleeToken.span, close.span)
      };
    }
    while (true) {
      if (this.isPunct(",")) {
        throw new ParseError("Expected an argument expression before ','", this.peek().span);
      }
      args.push(this.parseExpression());
      if (this.matchPunct(",")) {
        if (this.isPunct(")")) {
          throw new ParseError("Trailing commas are not allowed in argument lists", this.peek().span);
        }
        continue;
      }
      break;
    }
    const close = this.expectPunct(")", `the call to '${calleeToken.value}'`);
    return {
      kind: "Call",
      callee: identifierNode(calleeToken),
      args,
      span: mergeSpans(calleeToken.span, close.span)
    };
  }

  parseList() {
    const open = this.advance();
    const elements = [];
    if (this.isPunct("]")) {
      const close = this.advance();
      return { kind: "List", elements, span: mergeSpans(open.span, close.span) };
    }
    while (true) {
      if (this.isPunct(",")) {
        throw new ParseError("Expected a list element before ','", this.peek().span);
      }
      elements.push(this.parseExpression());
      if (this.matchPunct(",")) {
        if (this.isPunct("]")) {
          throw new ParseError("Trailing commas are not allowed in lists", this.peek().span);
        }
        continue;
      }
      break;
    }
    const close = this.expectPunct("]", "the list opened with '['");
    return { kind: "List", elements, span: mergeSpans(open.span, close.span) };
  }

  parseObject() {
    const open = this.advance();
    const entries = [];
    if (this.isPunct("}")) {
      const close = this.advance();
      return { kind: "Object", entries, span: mergeSpans(open.span, close.span) };
    }
    while (true) {
      const token = this.peek();
      let key = null;
      let keySpan = token.span;
      if (token.type === TOKEN.IDENTIFIER) {
        key = token.value;
        this.advance();
      } else if (token.type === TOKEN.STRING) {
        key = token.value;
        this.advance();
      } else {
        throw new ParseError(
          `Expected a field name in the object, found '${token.value}'`,
          token.span
        );
      }
      this.expectPunct(":", `the object field '${key}'`);
      const value = this.parseExpression();
      entries.push({ key, keySpan, value });
      if (this.matchPunct(",")) {
        if (this.isPunct("}")) {
          throw new ParseError("Trailing commas are not allowed in objects", this.peek().span);
        }
        continue;
      }
      break;
    }
    const close = this.expectPunct("}", "the object opened with '{'");
    return { kind: "Object", entries, span: mergeSpans(open.span, close.span) };
  }
}

// Parse a source that holds several independent expressions.
//
// The language itself is a single expression, but an editor is a scratchpad:
// a person checks one line, then the next. Each top-level expression is parsed
// on its own, so a broken line does not hide the lines around it, and every
// span stays absolute.
export function parseSequence(source) {
  const { tokens, diagnostics } = tokenize(source);
  const ranges = splitTopLevel(source);
  const expressions = [];
  let index = 0;

  for (const range of ranges) {
    const slice = [];
    while (index < tokens.length) {
      const token = tokens[index];
      if (token.type === TOKEN.EOF) break;
      if (token.span.start.offset >= range.end) break;
      slice.push(token);
      index += 1;
    }
    if (slice.length === 0) continue;

    const end = slice[slice.length - 1].span.end;
    const parser = new Parser([...slice, { type: TOKEN.EOF, value: "", raw: "", span: makeSpan(end, end) }]);
    const entry = {
      start: range.start,
      end: range.end,
      text: source.slice(range.start, range.end).trim(),
      ast: null,
      diagnostics: []
    };

    try {
      entry.ast = parser.parse();
    } catch (error) {
      if (error instanceof ParseError) {
        const problem = diagnostic(CATEGORY.SYNTAX, error.message, error.span);
        entry.diagnostics.push(problem);
        diagnostics.push(problem);
      } else {
        throw error;
      }
    }

    expressions.push(entry);
  }

  return { expressions, diagnostics, tokens };
}

// A document is a program of statements:
//
//   document = Document(type="article", title="…")
//   main = document.section("Introduction")
//   main.paragraph("…")
//
// The grammar has four statement shapes and no others, and nothing is
// executed: the statements are parsed here and folded into a document tree by
// src/document/build.js.

// The tokens of a call's argument list, split at the commas that are not
// inside a bracket.
function splitArgumentGroups(tokens) {
  const groups = [];
  let depth = 0;
  let current = [];
  for (const token of tokens) {
    if (token.type === TOKEN.PUNCT) {
      if (token.value === "(" || token.value === "[" || token.value === "{") depth += 1;
      else if (token.value === ")" || token.value === "]" || token.value === "}") depth -= 1;
      else if (token.value === "," && depth === 0) {
        groups.push(current);
        current = [];
        continue;
      }
    }
    current.push(token);
  }
  groups.push(current);
  return groups;
}

function parseArgumentList(tokens) {
  const args = [];
  const diagnostics = [];
  for (const group of splitArgumentGroups(tokens)) {
    if (group.length === 0) continue;
    const end = group[group.length - 1].span.end;
    const parser = new Parser([
      ...group,
      { type: TOKEN.EOF, value: "", raw: "", span: makeSpan(end, end) }
    ]);
    try {
      args.push(parser.parseExpression());
    } catch (error) {
      if (error instanceof ParseError) {
        diagnostics.push(diagnostic(CATEGORY.SYNTAX, error.message, error.span));
        continue;
      }
      throw error;
    }
  }
  return { args, diagnostics };
}

// The tokens of a call: the opening bracket, the arguments, and the closing
// bracket. The closing bracket may be missing, which is an error.
function callTokens(slice) {
  let depth = 0;
  let openIndex = 0;
  for (let index = 0; index < slice.length; index += 1) {
    const token = slice[index];
    if (token.type !== TOKEN.PUNCT) continue;
    if (token.value === "(") {
      depth += 1;
      if (depth === 1) openIndex = index;
    }
    else if (token.value === ")") {
      depth -= 1;
      if (depth === 0) return { open: index, close: index, inner: slice.slice(openIndex + 1, index) };
    }
  }
  return { open: 0, close: -1, inner: slice.slice(1) };
}

function parseStatement(slice) {
  const [first, second, third, fourth] = slice;
  const span = makeSpan(slice[0].span.start, slice[slice.length - 1].span.end);

  // name = ...
  if (first?.type === TOKEN.IDENTIFIER && second?.type === TOKEN.OPERATOR && second.value === "=") {
    const call = parseCallStatement(slice.slice(2));
    if (!call.statement) {
      return { kind: "Invalid", diagnostics: call.diagnostics, span };
    }
    return {
      kind: "Binding",
      name: first.value,
      call: call.statement,
      diagnostics: call.diagnostics,
      span
    };
  }

  // target.method(...)
  if (
    first?.type === TOKEN.IDENTIFIER &&
    second?.type === TOKEN.PUNCT &&
    second.value === "." &&
    third?.type === TOKEN.IDENTIFIER &&
    fourth?.type === TOKEN.PUNCT &&
    fourth.value === "("
  ) {
    const call = parseCallStatement(slice);
    if (!call.statement) {
      return { kind: "Invalid", diagnostics: call.diagnostics, span };
    }
    return {
      kind: "MethodCall",
      target: first.value,
      method: third.value,
      arguments: call.statement.arguments,
      diagnostics: call.diagnostics,
      span
    };
  }

  // Document(...)
  if (
    first?.type === TOKEN.IDENTIFIER &&
    first.value === "Document" &&
    second?.type === TOKEN.PUNCT &&
    second.value === "("
  ) {
    const call = parseCallStatement(slice);
    if (!call.statement) {
      return { kind: "Invalid", diagnostics: call.diagnostics, span };
    }
    return {
      kind: "DocumentCall",
      arguments: call.statement.arguments,
      diagnostics: call.diagnostics,
      span
    };
  }

  // Anything else is an expression, and an expression is not a document.
  const end = slice[slice.length - 1].span.end;
  const parser = new Parser([
    ...slice,
    { type: TOKEN.EOF, value: "", raw: "", span: makeSpan(end, end) }
  ]);
  try {
    const expression = parser.parse();
    return {
      kind: "Expression",
      expression,
      diagnostics: [
        diagnostic(
          CATEGORY.DOCUMENT,
          "A document is created with Document(...) and built with statements; an expression on its own is not a document",
          expression?.span
        )
      ],
      span
    };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        kind: "Invalid",
        diagnostics: [diagnostic(CATEGORY.SYNTAX, error.message, error.span)],
        span: error.span
      };
    }
    throw error;
  }
}

// A call in a statement: either Document(...) or target.method(...).
function parseCallStatement(slice) {
  const diagnostics = [];
  if (slice.length === 0) {
    return { statement: null, diagnostics };
  }

  const member = slice[1]?.type === TOKEN.PUNCT && slice[1].value === ".";
  const callee = slice[member ? 2 : 0];
  if (callee?.type !== TOKEN.IDENTIFIER) {
    return {
      statement: null,
      diagnostics: [diagnostic(CATEGORY.SYNTAX, "Expected a call", callee?.span)]
    };
  }

  const { close, inner } = callTokens(slice);
  if (close === -1) {
    return {
      statement: null,
      diagnostics: [
        diagnostic(CATEGORY.SYNTAX, `Expected ')' to close the call to '${callee.value}'`, callee.span)
      ]
    };
  }

  const parsed = parseArgumentList(inner);
  diagnostics.push(...parsed.diagnostics);

  if (member) {
    return {
      statement: {
        kind: "MethodCall",
        target: slice[0].value,
        method: callee.value,
        arguments: parsed.args
      },
      diagnostics
    };
  }

  return {
    statement: { kind: "DocumentCall", arguments: parsed.args },
    diagnostics
  };
}

// Parse a document source: a program of statements.
export function parseProgram(source) {
  const { tokens, diagnostics } = tokenize(source);
  const ranges = splitTopLevel(source);
  const statements = [];
  let index = 0;

  for (const range of ranges) {
    const slice = [];
    while (index < tokens.length) {
      const token = tokens[index];
      if (token.type === TOKEN.EOF) break;
      if (token.span.start.offset >= range.end) break;
      slice.push(token);
      index += 1;
    }
    if (slice.length === 0) continue;

    const statement = parseStatement(slice);
    if (statement) {
      diagnostics.push(...(statement.diagnostics ?? []));
      statements.push(statement);
    }
  }

  return { statements, diagnostics, tokens };
}

export function parse(source) {
  const { tokens, diagnostics } = tokenize(source);
  const parser = new Parser(tokens);
  try {
    const ast = parser.parse();
    return { ast, diagnostics, tokens };
  } catch (error) {
    if (error instanceof ParseError) {
      diagnostics.push(diagnostic(CATEGORY.SYNTAX, error.message, error.span));
      return { ast: null, diagnostics, tokens };
    }
    throw error;
  }
}
