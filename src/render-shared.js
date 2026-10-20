import { CONSTANTS, GREEK } from "./builtins.js";
import { SYMBOLS } from "./symbols.js";

export function nodePrecedence(node) {
  if (node.kind === "Relation") return 1;
  if (node.kind === "Binary") {
    if (node.operator === "+" || node.operator === "-") return 2;
    if (node.operator === "*" || node.operator === "%" || node.operator === "/") return 3;
    if (node.operator === "^") return 5;
  }
  if (node.kind === "Unary") return 4;
  if (node.kind === "Call") {
    const name = node.callee.name;
    if (name === "pow" || name === "exp") return 5;
    if (
      name === "sum" ||
      name === "product" ||
      name === "integral" ||
      name === "derivative" ||
      name === "partial" ||
      name === "limit"
    ) {
      return 5;
    }
  }
  return 6;
}

export function isLargeOperatorCall(node) {
  if (node.kind !== "Call") return false;
  return (
    node.callee.name === "sum" ||
    node.callee.name === "product" ||
    node.callee.name === "integral" ||
    node.callee.name === "derivative" ||
    node.callee.name === "partial" ||
    node.callee.name === "limit"
  );
}

export function visualPrecedence(node) {
  return nodePrecedence(node);
}

export function needsParensForBinaryChild(child, parentOperator, side) {
  const childPrecedence = visualPrecedence(child);
  if (parentOperator === "+" || parentOperator === "-") {
    return side === "left" ? childPrecedence < 2 : childPrecedence <= 2;
  }
  if (parentOperator === "*" || parentOperator === "%") {
    return side === "left" ? childPrecedence < 3 : childPrecedence <= 3;
  }
  return false;
}

export function needsParensForUnaryOperand(operand) {
  return visualPrecedence(operand) < 4 || operand.kind === "Unary";
}

export function needsParensForPowerBase(base) {
  return visualPrecedence(base) <= 5;
}

export function sumBodyNeedsParens(node) {
  return visualPrecedence(node) <= 2;
}

export function identifierBinding(name, scope, options = {}) {
  if (scope.has(name)) return "bound";
  if (name === "i" && options.complex === false) return "free";
  if (CONSTANTS.has(name)) return "constant";
  return "free";
}

export function identifierDisplay(name, binding) {
  if (binding === "bound" && CONSTANTS.has(name)) {
    return { text: name, italic: name.length === 1 };
  }
  if (binding === "constant") {
    if (name === "pi") return { text: GREEK.pi, italic: true };
    if (name === "infinity") return { text: "\u221e", italic: false };
    return { text: name, italic: name.length === 1 };
  }
  if (GREEK[name]) return { text: GREEK[name], italic: /^[a-z]/.test(name) };
  if (SYMBOLS[name]) return { text: SYMBOLS[name], italic: false };
  return { text: name, italic: name.length === 1 };
}

export function variableNameFromBinder(node) {
  return node.args[0]?.name ?? "x";
}
