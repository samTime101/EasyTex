import { CATEGORY, diagnostic, makeSpan, mergeSpans } from "./diagnostics.js";
import { tokenize, TOKEN } from "./lexer.js";

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

    if (token.type === TOKEN.IDENTIFIER) {
      this.advance();
      if (this.isPunct("(")) {
        return this.parseCall(token);
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
