import { CONSTANTS, LATEX_GREEK } from "./builtins.js";
import { Scope } from "./scope.js";
import {
  needsParensForBinaryChild,
  needsParensForPowerBase,
  needsParensForUnaryOperand,
  sumBodyNeedsParens
} from "./render-shared.js";

const OPERATOR_TEXT = {
  "+": "+",
  "-": "-",
  "*": "\\cdot ",
  "%": "\\bmod ",
  "=": "=",
  "!=": "\\neq ",
  "<": "<",
  ">": ">",
  "<=": "\\le ",
  ">=": "\\ge "
};

function esc(text) {
  return String(text).replace(/[\\{}$&#^_%~]/g, (ch) => `\\${ch}`);
}

function paren(content) {
  return `\\left(${content}\\right)`;
}

function identifier(name, binding) {
  if (binding === "bound" && CONSTANTS.has(name)) {
    return name.length === 1 ? esc(name) : `\\mathrm{${esc(name)}}`;
  }
  if (binding === "constant") {
    if (name === "pi") return "\\pi ";
    if (name === "infinity") return "\\infty ";
    return esc(name);
  }
  if (LATEX_GREEK[name]) return `${LATEX_GREEK[name]} `;
  if (name.length === 1) return esc(name);
  return `\\mathrm{${esc(name)}}`;
}

function boundIdentifier(name) {
  return identifier(name, "bound");
}

export function renderLaTeX(ast, options = {}) {
  const ctx = {
    complex: options.complex !== false,
    scope: new Scope()
  };
  return renderNode(ast, ctx).trim();
}

function renderNode(node, ctx) {
  switch (node.kind) {
    case "Number":
      return node.raw;
    case "Identifier": {
      const binding = ctx.scope.has(node.name)
        ? "bound"
        : node.name === "i" && ctx.complex === false
          ? "free"
          : CONSTANTS.has(node.name)
            ? "constant"
            : "free";
      return identifier(node.name, binding);
    }
    case "Unary": {
      const operand = renderNode(node.operand, ctx);
      const content = needsParensForUnaryOperand(node.operand) ? paren(operand) : operand;
      return `${node.operator === "-" ? "-" : "+"}${content}`;
    }
    case "Binary":
      return renderBinary(node, ctx);
    case "Relation": {
      const left = renderNode(node.left, ctx);
      const right = renderNode(node.right, ctx);
      return `${left}${OPERATOR_TEXT[node.operator] ?? node.operator}${right}`;
    }
    case "List":
      return `\\left[${node.elements.map((element) => renderNode(element, ctx)).join(", ")}\\right]`;
    case "Call":
      return renderCall(node, ctx);
    default:
      return "";
  }
}

function renderBinary(node, ctx) {
  if (node.operator === "/") {
    return `\\frac{${renderNode(node.left, ctx)}}{${renderNode(node.right, ctx)}}`;
  }
  if (node.operator === "^") {
    const base = renderNode(node.left, ctx);
    const baseContent = needsParensForPowerBase(node.left) ? paren(base) : base;
    return `${baseContent}^{${renderNode(node.right, ctx)}}`;
  }
  const left = renderNode(node.left, ctx);
  const right = renderNode(node.right, ctx);
  const leftContent = needsParensForBinaryChild(node.left, node.operator, "left") ? paren(left) : left;
  const rightContent = needsParensForBinaryChild(node.right, node.operator, "right") ? paren(right) : right;
  return `${leftContent}${OPERATOR_TEXT[node.operator] ?? node.operator}${rightContent}`;
}

function functionCall(label, arg, ctx) {
  return `\\${label}${paren(renderNode(arg, ctx))}`;
}

function renderCall(node, ctx) {
  const name = node.callee.name;
  const args = node.args;

  switch (name) {
    case "sqrt":
      return `\\sqrt{${renderNode(args[0], ctx)}}`;
    case "root":
      return `\\sqrt[${renderNode(args[1], ctx)}]{${renderNode(args[0], ctx)}}`;
    case "abs":
      return `\\left|${renderNode(args[0], ctx)}\\right|`;
    case "frac":
      return `\\frac{${renderNode(args[0], ctx)}}{${renderNode(args[1], ctx)}}`;
    case "pow": {
      const base = renderNode(args[0], ctx);
      const baseContent = needsParensForPowerBase(args[0]) ? paren(base) : base;
      return `${baseContent}^{${renderNode(args[1], ctx)}}`;
    }
    case "exp":
      if (ctx.scope.has("e")) return `\\exp${paren(renderNode(args[0], ctx))}`;
      return `e^{${renderNode(args[0], ctx)}}`;
    case "log":
      return functionCall("log", args[0], ctx);
    case "ln":
      return functionCall("ln", args[0], ctx);
    case "sin":
    case "cos":
    case "tan":
      return functionCall(name, args[0], ctx);
    case "asin":
      return functionCall("arcsin", args[0], ctx);
    case "acos":
      return functionCall("arccos", args[0], ctx);
    case "atan":
      return functionCall("arctan", args[0], ctx);
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
    default: {
      const binding = ctx.scope.has(name) ? "bound" : "free";
      const callee = identifier(name, binding);
      return `${callee}${paren(args.map((arg) => renderNode(arg, ctx)).join(", "))}`;
    }
  }
}

function renderSumProduct(node, ctx) {
  const name = node.callee.name;
  const symbol = name === "sum" ? "\\sum" : "\\prod";
  const variable = node.args[0];
  const lower = `${boundIdentifier(variable.name)} = ${renderNode(node.args[1], ctx)}`;
  const upper = renderNode(node.args[2], ctx);
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[3], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[3]) ? paren(body) : body;
  return `${symbol}_{${lower}}^{${upper}} ${bodyContent}`.trim();
}

function renderIntegral(node, ctx) {
  const variable = node.args[0];
  const lower = renderNode(node.args[1], ctx);
  const upper = renderNode(node.args[2], ctx);
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[3], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[3]) ? paren(body) : body;
  return `\\int_{${lower}}^{${upper}} ${bodyContent}\\,d${boundIdentifier(variable.name)}`.trim();
}

function renderDerivative(node, ctx, name) {
  const variable = node.args[0];
  const symbol = name === "partial" ? "\\partial" : "d";
  const head = `\\frac{${symbol}}{${symbol} ${boundIdentifier(variable.name)}}`;
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[1], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[1]) ? paren(body) : body;
  return `${head}${bodyContent}`;
}

function renderLimit(node, ctx) {
  const variable = node.args[0];
  const target = renderNode(node.args[1], ctx);
  ctx.scope.push(variable.name);
  const body = renderNode(node.args[2], ctx);
  ctx.scope.pop();
  const bodyContent = sumBodyNeedsParens(node.args[2]) ? paren(body) : body;
  return `\\lim_{${boundIdentifier(variable.name)} \\to ${target}} ${bodyContent}`.trim();
}

function renderMatrix(node, ctx) {
  const rows = node.args[0].elements;
  const body = rows
    .map((row) => row.elements.map((entry) => renderNode(entry, ctx)).join(" & "))
    .join(" \\\\ ");
  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}

function renderVector(node, ctx) {
  const body = node.args[0].elements.map((entry) => renderNode(entry, ctx)).join(" \\\\ ");
  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}
