export class Scope {
  constructor() {
    this.stack = [];
  }

  push(name) {
    this.stack.push(name);
  }

  pop() {
    this.stack.pop();
  }

  has(name) {
    for (let i = this.stack.length - 1; i >= 0; i -= 1) {
      if (this.stack[i] === name) return true;
    }
    return false;
  }
}

export function bindingOf(name, scope, options = {}) {
  if (scope.has(name)) return "bound";
  if (name === "i" && options.complex === false) return "free";
  return undefined;
}
