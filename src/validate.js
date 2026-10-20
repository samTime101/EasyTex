import { CATEGORY, diagnostic } from "./diagnostics.js";
import { CONSTANTS, FUNCTIONS, BINDER_FUNCTIONS, RESERVED } from "./builtins.js";

function inferType(node) {
  switch (node.kind) {
    case "Number":
    case "Identifier":
    case "Unary":
    case "Binary":
      return "scalar";
    case "String":
      return "string";
    case "Boolean":
      return "boolean";
    case "Object":
      return "object";
    case "Relation":
      return "relation";
    case "List":
      return "list";
    case "Call": {
      const def = FUNCTIONS[node.callee.name];
      if (!def) return "unknown";
      return def.kind === "structure" ? node.callee.name : "scalar";
    }
    default:
      return "unknown";
  }
}

function describeType(type) {
  switch (type) {
    case "relation":
      return "a relation";
    case "list":
      return "a list";
    case "matrix":
      return "a matrix";
    case "vector":
      return "a vector";
    case "string":
      return "a string";
    case "boolean":
      return "a boolean value";
    case "object":
      return "an object";
    case "unknown":
      return "an unknown value";
    default:
      return "a non-scalar value";
  }
}

export function validate(ast, options = {}) {
  const complex = options.complex !== false;
  const diagnostics = [];
  const scopes = [];

  const isBound = (name) => scopes.some((scope) => scope.has(name));

  function report(category, message, node) {
    diagnostics.push(diagnostic(category, message, node.span));
    node.reported = true;
  }

  function requireScalar(node, owner) {
    const type = inferType(node);
    if (type === "scalar" || type === "unknown") return;
    if (!node.reported) {
      report(CATEGORY.TYPE, `${owner} requires a scalar expression, but found ${describeType(type)}`, node);
    }
  }

  function resolveIdentifier(node, infinityAllowed) {
    const { name } = node;
    node.type = "scalar";
    if (isBound(name)) {
      node.binding = "bound";
      return;
    }
    if (name === "i" && !complex) {
      node.binding = "free";
      return;
    }
    if (CONSTANTS.has(name)) {
      node.binding = "constant";
      if (name === "infinity" && !infinityAllowed && !node.reported) {
        report(
          CATEGORY.DOMAIN,
          "The constant 'infinity' is only allowed as a limit target or an integral bound",
          node
        );
      }
      return;
    }
    if (FUNCTIONS[name]) {
      node.binding = "function";
      report(CATEGORY.NAME, `The function '${name}' cannot be used as a value`, node);
      return;
    }
    if (RESERVED.has(name)) {
      node.binding = "reserved";
      report(CATEGORY.RESERVED, `The name '${name}' is reserved for a future version`, node);
      return;
    }
    node.binding = "free";
  }

  function visit(node, context = {}) {
    const infinityAllowed = context.infinityAllowed === true;

    switch (node.kind) {
      case "Number":
        node.type = "scalar";
        return;

      case "String":
        node.type = "string";
        if (!node.reported) {
          report(CATEGORY.TYPE, "String literals are only allowed inside document components", node);
        }
        return;

      case "Boolean":
        node.type = "boolean";
        if (!node.reported) {
          report(CATEGORY.TYPE, "Boolean literals are not valid in mathematical expressions", node);
        }
        return;

      case "Object":
        node.type = "object";
        if (!node.reported) {
          report(CATEGORY.TYPE, "Object literals are only allowed inside document components", node);
        }
        return;

      case "Identifier":
        resolveIdentifier(node, infinityAllowed);
        return;

      case "Unary": {
        node.type = "scalar";
        const directInfinity =
          (node.operator === "-" || node.operator === "+") &&
          node.operand.kind === "Identifier" &&
          node.operand.name === "infinity" &&
          !isBound("infinity");
        visit(node.operand, { infinityAllowed: infinityAllowed && directInfinity });
        return;
      }

      case "Binary":
        node.type = "scalar";
        requireScalar(node.left, `Operator '${node.operator}'`);
        requireScalar(node.right, `Operator '${node.operator}'`);
        visit(node.left, { infinityAllowed: false });
        visit(node.right, { infinityAllowed: false });
        return;

      case "Relation":
        node.type = "relation";
        if (!context.isRoot && !node.reported) {
          report(CATEGORY.TYPE, "A relation may only appear as a complete expression", node);
        }
        requireScalar(node.left, "A relation");
        requireScalar(node.right, "A relation");
        visit(node.left, { infinityAllowed: false, isRoot: false });
        visit(node.right, { infinityAllowed: false, isRoot: false });
        return;

      case "List":
        node.type = "list";
        if (!node.reported) {
          report(
            CATEGORY.TYPE,
            "A list is only valid as the argument of matrix() or vector()",
            node
          );
        }
        return;

      case "Call":
        visitCall(node, infinityAllowed);
        return;

      default:
        return;
    }
  }

  function visitCall(node, infinityAllowed) {
    const name = node.callee.name;
    const def = FUNCTIONS[name];

    if (!def) {
      if (isBound(name)) {
        // A bound variable may be applied as a function, just like a free one.
        visitApplication(node, name);
        return;
      }
      if (RESERVED.has(name)) {
        node.type = "unknown";
        report(CATEGORY.RESERVED, `The name '${name}' is reserved for a future version`, node.callee);
      } else if (CONSTANTS.has(name) && !(name === "i" && !complex)) {
        node.type = "unknown";
        report(CATEGORY.NAME, `'${name}' is a constant, not a function`, node.callee);
      } else {
        // Any other identifier in call position is a free function application:
        // f(x), g(x - a), and higher-order uses are all valid. The language has
        // no implicit multiplication, so x(y) is unambiguously an application.
        visitApplication(node, name);
        return;
      }
      for (const arg of node.args) visit(arg, { infinityAllowed: false });
      return;
    }

    node.type = def.kind === "structure" ? name : "scalar";

    if (node.args.length !== def.arity) {
      report(
        CATEGORY.ARITY,
        `Function '${name}' expects ${def.arity} argument${def.arity === 1 ? "" : "s"}, received ${node.args.length}`,
        node
      );
      for (const arg of node.args) visit(arg, { infinityAllowed: false });
      return;
    }

    if (BINDER_FUNCTIONS.has(name)) {
      visitBinder(node, name);
      return;
    }

    if (name === "matrix" || name === "vector") {
      visitStructure(node, name);
      return;
    }

    for (const arg of node.args) {
      requireScalar(arg, `Function '${name}'`);
      visit(arg, { infinityAllowed: false });
    }
  }

  function visitApplication(node, name) {
    node.type = "scalar";
    node.application = true;
    node.callee.type = "function";
    node.callee.binding = isBound(name) ? "bound" : "free";
    for (const arg of node.args) {
      requireScalar(arg, `Function '${name}'`);
      visit(arg, { infinityAllowed: false });
    }
  }

  function visitBinder(node, name) {
    const args = node.args;
    const variableArg = args[0];

    if (variableArg.kind !== "Identifier") {
      report(
        CATEGORY.STRUCTURE,
        `The first argument of '${name}' must be an identifier`,
        variableArg
      );
      for (let i = 1; i < args.length; i += 1) visit(args[i], { infinityAllowed: false });
      return;
    }

    if (FUNCTIONS[variableArg.name] || RESERVED.has(variableArg.name)) {
      report(
        CATEGORY.NAME,
        `The bound variable '${variableArg.name}' must not name a function or reserved word`,
        variableArg
      );
    }

    variableArg.binding = "bound";
    variableArg.type = "scalar";
    const variableName = variableArg.name;

    if (name === "limit") {
      requireScalar(args[1], "The target of 'limit'");
      visit(args[1], { infinityAllowed: true });
    } else if (name === "integral") {
      requireScalar(args[1], "The lower bound of 'integral'");
      requireScalar(args[2], "The upper bound of 'integral'");
      visit(args[1], { infinityAllowed: true });
      visit(args[2], { infinityAllowed: true });
    } else if (name === "sum" || name === "product") {
      requireScalar(args[1], `The start bound of '${name}'`);
      requireScalar(args[2], `The end bound of '${name}'`);
      visit(args[1], { infinityAllowed: false });
      visit(args[2], { infinityAllowed: false });
    }

    const bodyIndex = name === "limit" ? 2 : name === "derivative" || name === "partial" ? 1 : 3;
    const body = args[bodyIndex];

    scopes.push(new Set([variableName]));
    requireScalar(body, `The body of '${name}'`);
    visit(body, { infinityAllowed: false });
    scopes.pop();
  }

  function visitStructure(node, name) {
    const arg = node.args[0];

    if (arg.kind !== "List") {
      report(
        CATEGORY.STRUCTURE,
        `${name}() expects a list of ${name === "matrix" ? "row lists" : "elements"}`,
        arg
      );
      visit(arg, { infinityAllowed: false });
      return;
    }

    arg.type = "list";
    const entries = arg.elements;

    if (entries.length === 0) {
      report(
        CATEGORY.STRUCTURE,
        name === "matrix" ? "matrix() requires at least one row" : "vector() requires at least one element",
        arg
      );
      return;
    }

    if (name === "vector") {
      for (const entry of entries) {
        requireScalar(entry, "A vector entry");
        visit(entry, { infinityAllowed: false });
      }
      return;
    }

    let width = null;
    for (const row of entries) {
      if (row.kind !== "List") {
        report(CATEGORY.STRUCTURE, "Each row of matrix() must be a list", row);
        requireScalar(row, "A matrix row");
        visit(row, { infinityAllowed: false });
        continue;
      }
      if (row.elements.length === 0) {
        report(CATEGORY.STRUCTURE, "Matrix rows must not be empty", row);
        continue;
      }
      if (width === null) {
        width = row.elements.length;
      } else if (row.elements.length !== width) {
        report(CATEGORY.STRUCTURE, "All rows of a matrix must have the same length", row);
      }
      for (const entry of row.elements) {
        requireScalar(entry, "A matrix entry");
        visit(entry, { infinityAllowed: false });
      }
    }
  }

  if (!ast || ast.kind === undefined) {
    return { diagnostics };
  }

  visit(ast, { isRoot: true, infinityAllowed: false });
  return { diagnostics };
}
