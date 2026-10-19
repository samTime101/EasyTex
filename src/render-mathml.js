import { Scope } from "./scope.js";
import {
  identifierBinding,
  identifierDisplay,
  needsParensForBinaryChild,
  needsParensForPowerBase,
  needsParensForUnaryOperand,
  sumBodyNeedsParens
} from "./render-shared.js";

const OPERATOR_TEXT = {
  "+": "+",
  "-": "\u2212",
  "*": "\u22c5",
  "%": "mod",
  "=": "=",
  "!=": "\u2260",
  "<": "<",
  ">": ">",
  "<=": "\u2264",
  ">=": "\u2265"
};

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mi(text, italic) {
  const escaped = esc(text);
  return italic ? `<mi>${escaped}</mi>` : `<mi mathvariant="normal">${escaped}</mi>`;
}

function mo(text) {
  return `<mo>${esc(text)}</mo>`;
}

function boundMi(name) {
  const display = identifierDisplay(name, "bound");
  return mi(display.text, display.italic);
}

function paren(content) {
  return `<mrow>${mo("(")}${content}${mo(")")}</mrow>`;
}

function fenced(open, close, content) {
  return `<mrow>${mo(open)}${content}${mo(close)}</mrow>`;
}

export function renderMathML(ast, options = {}) {
  const ctx = {
    complex: options.complex !== false,
    scope: new Scope()
  };
  const display = options.display === "inline" ? "inline" : "block";
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display}">${renderNode(ast, ctx)}</math>`;
}

function renderNode(node, ctx) {
  switch (node.kind) {
    case "Number":
      return `<mn>${esc(node.raw)}</mn>`;
    case "Identifier": {
      const binding = identifierBinding(node.name, ctx.scope, ctx);
      const display = identifierDisplay(node.name, binding);
      return mi(display.text, display.italic);
    }
    case "Unary": {
      const operand = renderNode(node.operand, ctx);
      const content = needsParensForUnaryOperand(node.operand) ? paren(operand) : operand;
      return `<mrow>${mo(node.operator === "-" ? "\u2212" : "+")}${content}</mrow>`;
    }
    case "Binary":
      return renderBinary(node, ctx);
    case "Relation": {
      const left = renderNode(node.left, ctx);
      const right = renderNode(node.right, ctx);
      return `<mrow>${left}${mo(OPERATOR_TEXT[node.operator] ?? node.operator)}${right}</mrow>`;
    }
    case "List":
      return fenced("[", "]", node.elements.map((element) => renderNode(element, ctx)).join(mo(",")));
    case "Call":
      return renderCall(node, ctx);
    default:
      return "";
  }
}

function renderBinary(node, ctx) {
  if (node.operator === "/") {
    return `<mfrac>${renderNode(node.left, ctx)}${renderNode(node.right, ctx)}</mfrac>`;
  }
  if (node.operator === "^") {
    const base = renderNode(node.left, ctx);
    const baseContent = needsParensForPowerBase(node.left) ? paren(base) : base;
    return `<msup>${baseContent}${renderNode(node.right, ctx)}</msup>`;
  }
  const left = renderNode(node.left, ctx);
  const right = renderNode(node.right, ctx);
  const leftContent = needsParensForBinaryChild(node.left, node.operator, "left") ? paren(left) : left;
  const rightContent = needsParensForBinaryChild(node.right, node.operator, "right") ? paren(right) : right;
  return `<mrow>${leftContent}${mo(OPERATOR_TEXT[node.operator] ?? node.operator)}${rightContent}</mrow>`;
}

function renderCall(node, ctx) {
  const name = node.callee.name;
  const args = node.args;

  switch (name) {
    case "sqrt":
      return `<msqrt>${renderNode(args[0], ctx)}</msqrt>`;
    case "root":
      return `<mroot>${renderNode(args[0], ctx)}${renderNode(args[1], ctx)}</mroot>`;
    case "abs":
      return fenced("|", "|", renderNode(args[0], ctx));
    case "frac":
      return `<mfrac>${renderNode(args[0], ctx)}${renderNode(args[1], ctx)}</mfrac>`;
    case "pow": {
      const base = renderNode(args[0], ctx);
      const baseContent = needsParensForPowerBase(args[0]) ? paren(base) : base;
      return `<msup>${baseContent}${renderNode(args[1], ctx)}</msup>`;
    }
    case "exp": {
      if (ctx.scope.has("e")) {
        return `<mrow>${mi("exp", false)}${paren(renderNode(args[0], ctx))}</mrow>`;
      }
      return `<msup>${mi("e", true)}${renderNode(args[0], ctx)}</msup>`;
    }
    case "log":
    case "ln":
      return `<mrow>${mi(name, false)}${paren(renderNode(args[0], ctx))}</mrow>`;
    case "sin":
    case "cos":
    case "tan":
    case "asin":
    case "acos":
    case "atan": {
      const label = name === "asin" ? "arcsin" : name === "acos" ? "arccos" : name === "atan" ? "arctan" : name;
      return `<mrow>${mi(label, false)}${paren(renderNode(args[0], ctx))}</mrow>`;
    }
    case "sum":
    case "product":
      return renderSumProduct(node, ctx);
    case "integral":
      return renderIntegral(node, ctx);
    case "derivative":
    case "partial":
      return renderDerivative(node, ctx, name);
    case "limit":
      return renderLimit(node, ctx);
    case "matrix":
      return renderMatrix(node, ctx);
    case "vector":
      return renderVector(node, ctx);
    default:
      return `<mrow>${mi(name, false)}${paren(args.map((arg) => renderNode(arg, ctx)).join(mo(",")))}</mrow>`;
  }
}

function renderSumProduct(node, ctx) {
  const name = node.callee.name;
  const symbol = name === "sum" ? "\u2211" : "\u220f";
  const variable = node.args[0];
  const lower = `<mrow>${boundMi(variable.name)}${mo("=")}${renderNode(node.args[1], ctx)}</mrow>`;
  const upper = renderNode(node.args[2], ctx);
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[3], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[3]) ? paren(body) : body;
  return `<mrow><munderover>${mo(symbol)}${lower}${upper}</munderover>${bodyContent}</mrow>`;
}

function renderIntegral(node, ctx) {
  const variable = node.args[0];
  const lower = renderNode(node.args[1], ctx);
  const upper = renderNode(node.args[2], ctx);
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[3], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[3]) ? paren(body) : body;
  const differential = `<mrow>${mi("d", false)}${boundMi(variable.name)}</mrow>`;
  return `<mrow><msubsup>${mo("\u222b")}${lower}${upper}</msubsup>${bodyContent}${differential}</mrow>`;
}

function renderDerivative(node, ctx, name) {
  const variable = node.args[0];
  const symbol = name === "partial" ? "\u2202" : "d";
  const symbolMarkup = name === "partial" ? mo(symbol) : mi(symbol, true);
  const head = `<mfrac><mrow>${symbolMarkup}</mrow><mrow>${symbolMarkup}${boundMi(variable.name)}</mrow></mfrac>`;
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[1], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[1]) ? paren(body) : body;
  return `<mrow>${head}${bodyContent}</mrow>`;
}

function renderLimit(node, ctx) {
  const variable = node.args[0];
  const target = renderNode(node.args[1], ctx);
  const arrow = `<mrow>${boundMi(variable.name)}${mo("\u2192")}${target}</mrow>`;
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[2], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[2]) ? paren(body) : body;
  return `<mrow><munder>${mi("lim", false)}${arrow}</munder>${bodyContent}</mrow>`;
}

function renderMatrix(node, ctx) {
  const rows = node.args[0].elements;
  const renderedRows = rows
    .map((row) => `<mtr>${row.elements.map((entry) => `<mtd>${renderNode(entry, ctx)}</mtd>`).join("")}</mtr>`)
    .join("");
  return fenced("[", "]", `<mtable>${renderedRows}</mtable>`);
}

function renderVector(node, ctx) {
  const entries = node.args[0].elements;
  const rows = entries.map((entry) => `<mtr><mtd>${renderNode(entry, ctx)}</mtd></mtr>`).join("");
  return fenced("[", "]", `<mtable>${rows}</mtable>`);
}
