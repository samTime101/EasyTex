# MathScript Language Specification

**Version:** 0.1-draft  
**Status:** Proposed  
**Date:** 2026-10-19  
**Purpose:** Human-readable, function-based mathematical notation

## 0. About this document

MathScript is a function-based language for mathematical notation. It is intended to be readable without memorizing LaTeX commands, unambiguous enough to parse deterministically, and structured enough to render into professional mathematical notation.

This is a draft specification. It describes the target language surface and the rules an implementation must follow. Implementation milestones are tracked in section 13; the document version does not imply that every feature described here is implemented in version 0.1 of any particular tool.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** in this document are to be interpreted as described in RFC 2119.

### 0.1 Scope of this draft

This draft specifies:

- The lexical and expression grammar.
- Function-call syntax, argument order, and arity rules.
- Operator precedence and associativity.
- Name resolution, constants, and variable scoping.
- The core mathematical function library.
- Validation requirements and diagnostic categories.
- The abstract syntax tree and its role in rendering and interchange.
- Output-format independence and compatibility rules.

This draft does **not** specify:

- A complete document markup language.
- Numeric evaluation or computer-algebra semantics.
- User-defined functions or constants.
- An interactive editor.
- A fixed visual style or typesetting engine.
- A numeric type system for implementations that evaluate expressions.

MathScript is a notation language first. An implementation may evaluate, simplify, or transform expressions, but evaluation is not required by this specification. When an implementation does evaluate, it MUST follow the mathematical meanings defined here and MUST distinguish syntax errors from mathematical domain errors.

### 0.2 Normative and informative text

Except for the appendices, this document is normative where it uses **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, or **SHOULD NOT**. Descriptive text and rationale are informative. The appendices record decisions and rationale and are informative unless explicitly stated otherwise.

## 1. Goals and design principles

MathScript aims to provide a simple, consistent way to write mathematical expressions without requiring LaTeX syntax.

The language MUST be:

- **Readable.** A person with ordinary mathematical training should understand the source without memorizing typesetting commands.
- **Unambiguous.** Every valid expression has exactly one parse tree.
- **Deterministic.** Given the same source and environment, a conforming parser produces the same structure.
- **Composable.** Functions nest to arbitrary depth.
- **Consistent.** Every named operation uses the same call syntax and has a documented argument order.
- **Renderer-independent.** The source syntax does not depend on HTML, LaTeX, MathML, or any other output format.
- **Extensible.** New mathematical functions can be added without changing the grammar.
- **Safe.** Expressions are parsed as mathematical structure, never executed as host-language code.

The language is intended to cover elementary mathematics, matrices and vectors, calculus, and research-level notation. It is not intended to be a general-purpose programming language.

## 2. General syntax

### 2.1 Source text and whitespace

MathScript source is Unicode text, normally encoded as UTF-8. In this version, identifiers and numeric literals are restricted to ASCII, so the practical source encoding is compatible with ASCII.

Whitespace consists of spaces, tabs, carriage returns, and line feeds. Whitespace separates tokens and is otherwise insignificant. A line break has no grammatical meaning.

This means the following are equivalent:

```text
sum(i, 1, n, i^2)
```

```text
sum(
    i,
    1,
    n,
    i^2
)
```

Whitespace is not permitted inside a numeric literal, an identifier, or a multi-character operator.

Line comments begin with `//` and continue to the end of the line. Comments are treated as whitespace and do not appear in the syntax tree or the rendered output. There are no block comments in this version.

### 2.2 Identifiers

An identifier starts with an ASCII letter and continues with ASCII letters, digits, or underscores:

```text
[A-Za-z][A-Za-z0-9_]*
```

Identifiers are case-sensitive: `x`, `X`, and `x_1` are different names. `sin` and `Sin` are different identifiers, and only `sin` names the built-in sine function.

Multi-letter identifiers are single names. For example, `velocity`, `total_cost`, and `xy` are each one identifier. `xy` is not the product of `x` and `y`; write `x*y` for that product.

Greek letters are written with their English names, such as `alpha`, `beta`, `theta`, and `pi`. The renderer may display those names using Greek symbols. Actual Unicode Greek letters are not identifiers in this version.

Identifiers are not lexically reserved. Built-in constants and functions are resolved by the environment after parsing. This distinction matters for scoping: a bounded operation may bind the name `i` even when `i` denotes the imaginary unit elsewhere.

### 2.3 Numeric literals

Numeric literals use decimal notation:

```text
number   ::= digit+ [ "." digit+ ] [ exponent ]
exponent ::= ( "e" | "E" ) [ "+" | "-" ] digit+
digit    ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
```

Examples:

```text
0
42
3.14159
0.5
1.5e-3
2E+8
```

The following are not valid numeric literals in this version:

```text
.5          // write 0.5
1.          // write 1.0
1_000       // no digit separators
0xFF        // no hexadecimal
```

A numeric literal denotes a mathematical number. Implementations SHOULD preserve the literal spelling, or an exact representation of its value, so that rendering and export do not introduce precision loss. Evaluation policy is outside the scope of this specification.

A sign is not part of a numeric literal. `-5` is the unary minus operator applied to the literal `5`.

The exponent marker `e` is part of a numeric literal only when it is followed by an optional sign and at least one digit. Consequently, `2e3` is the number 2000, while `2*e` is twice Euler's number. The expression `2e` is a number followed by an identifier and is not valid, because implicit multiplication is not allowed.

### 2.4 Lists

Square brackets delimit list literals:

```text
[1, 2, 3]
[[1, 2], [3, 4]]
[]
```

Lists are structural values in this version. They are used as the arguments of `matrix` and `vector`; they are not arithmetic operands and do not denote sets or intervals.

A list is valid only as the direct argument of `matrix` or `vector`, or as a row or element list nested inside such an argument. A list in any other position is structurally invalid.

Lists may nest. An empty list is syntactically valid, but the structure functions impose their own non-empty and rectangularity requirements.

### 2.5 Function calls

A function call has the form:

```text
function_name(argument1, argument2, ...)
```

Examples:

```text
sqrt(x)
abs(-5)
frac(a, b)
pow(x, 2)
sum(i, 1, 10, i^2)
```

A function name MUST be an identifier. The callee cannot be an arbitrary expression: `(f)(x)` and `f(x)(y)` are not valid calls in this version.

A call may syntactically contain zero arguments, but every built-in function has a fixed positive arity. A zero-argument call therefore fails validation unless a future extension defines such a function.

### 2.6 Parentheses and grouping

Parentheses group expressions and override operator precedence:

```text
2 + 3 * 4
(2 + 3) * 4
```

Parentheses in the syntax tree do not create a separate mathematical operation; they only determine grouping. A conforming parser MUST preserve the grouping in the resulting tree.

Parentheses MUST be balanced. A missing or extra parenthesis is a syntax error and MUST NOT be repaired silently.

### 2.7 Implicit multiplication

Implicit multiplication is **not** part of this version of the grammar.

The following are invalid:

```text
2x
2 x
2pi
pi r^2
(x + 1)(x - 1)
2 sin(x)
sin(x)cos(x)
```

Write the multiplication operator explicitly:

```text
2*x
2*pi
pi*r^2
(x + 1)*(x - 1)
2*sin(x)
sin(x)*cos(x)
```

There is no ambiguity between a function call and multiplication: an identifier followed by `(` is always a call, even if whitespace separates them. Thus `x(y)` is a call to `x`, not the product of `x` and `y`. If `x` is not a known function, that is an unknown-function error.

Implicit multiplication is a compatibility-sensitive open decision; see Appendix A, decision D1.

## 3. Expressions and operators

### 3.1 Grammar

The expression grammar is:

```text
expression     ::= relation ;
relation       ::= additive [ rel-op additive ] ;
rel-op         ::= "=" | "!=" | "<" | ">" | "<=" | ">=" ;

additive       ::= multiplicative { ( "+" | "-" ) multiplicative } ;
multiplicative ::= unary { ( "*" | "/" | "%" ) unary } ;
unary          ::= ( "+" | "-" ) unary | power ;
power          ::= primary [ "^" unary ] ;

primary        ::= number
                 | identifier [ "(" [ expression { "," expression } ] ")" ]
                 | "(" expression ")"
                 | list ;

list           ::= "[" [ expression { "," expression } ] "]" ;
```

Whitespace and comments may appear between any two tokens. The grammar is recursive: every argument of a function call is a full expression, and every parenthesized expression is a full expression.

The grammar for `relation` permits at most one relational operator. Relations do not chain. `a < b < c` is a syntax error in this version, not an abbreviation for `a < b` and `b < c`.

### 3.2 Operator precedence and associativity

Operators are listed from lowest to highest precedence:

| Precedence | Operators | Associativity | Meaning |
| --- | --- | --- | --- |
| 1 (lowest) | `=`, `!=`, `<`, `>`, `<=`, `>=` | non-associative | relations |
| 2 | `+`, `-` | left | addition, subtraction |
| 3 | `*`, `/`, `%` | left | multiplication, division, modulo |
| 4 | unary `+`, unary `-` | prefix | sign |
| 5 | `^` | right | exponentiation |
| 6 (highest) | calls, parentheses, lists | — | primary structure |

Parentheses override precedence. Function calls bind more tightly than every operator, so `sin(x)^2` means `(sin(x))^2`.

Because exponentiation binds more tightly than unary sign on the left, unary minus applies to the whole power:

```text
-x^2      means    -(x^2)
(-x)^2    means    (-x)^2
```

A unary expression is allowed as the right operand of `^`, so a negative exponent is valid:

```text
2^-1      means    2^(-1)
```

Exponentiation is right-associative:

```text
2^3^2     means    2^(3^2) = 512
(2^3)^2   means    (2^3)^2 = 64
```

Multiplication, division, and modulo are left-associative:

```text
a/b/c     means    (a/b)/c
a - b - c means    (a - b) - c
```

### 3.3 Arithmetic operators

| Operator | Meaning | Example |
| --- | --- | --- |
| `+` | addition | `a + b` |
| `-` | subtraction | `a - b` |
| `*` | multiplication | `a * b` |
| `/` | division | `a / b` |
| `^` | exponentiation | `x^3` |
| `%` | modulo | `a % b` |

Division is exact mathematical division, not integer division or truncation. `a/b` denotes the quotient of `a` by `b`.

Modulo is defined for integer-valued operands. For integers `a` and nonzero `b`, `a % b` denotes the Euclidean remainder `r` satisfying:

```text
a = q*b + r    and    0 <= r < |b|
```

for some integer `q`. This gives a non-negative remainder regardless of the sign of `a`. Using `%` with non-integer operands, or with a zero divisor, is a domain error when an implementation evaluates the expression.

### 3.4 Relations

| Operator | Meaning | Example |
| --- | --- | --- |
| `=` | equality | `x + 1 = 5` |
| `!=` | not equal | `x != 0` |
| `<` | less than | `x < 5` |
| `>` | greater than | `x > 5` |
| `<=` | less than or equal | `x <= 5` |
| `>=` | greater than or equal | `x >= 5` |

`=` is mathematical equality. It is never assignment. Function definitions are not part of this version; see section 4.6.

A relation denotes a proposition, not a number. A relation may appear only as a complete expression. It MUST NOT be an operand of an arithmetic operator, a scalar function, or another relation. For example, `x < 5` is valid, while `(x < 5) + 1`, `sin(x < 5)`, and `x = (y < 5)` are invalid.

There is no Boolean algebra in this version: no `and`, `or`, `not`, or chained comparison operators. Piecewise expressions are reserved for a future version.

### 3.5 Lexical rules for operators

The lexer MUST use longest-match tokenization. For example, `<=` is one token, not `<` followed by `=`. The defined operators are:

```text
+  -  *  /  %  ^  =  !=  <  >  <=  >=
```

Other operator-like sequences are not part of MathScript. In particular, `**` is not exponentiation, `==` is not equality, and `//` begins a comment rather than denoting division.

### 3.6 Precedence examples

| MathScript | Interpretation |
| --- | --- |
| `2 + 3 * 4` | `2 + (3 * 4) = 14` |
| `(2 + 3) * 4` | `(2 + 3) * 4 = 20` |
| `2^3^2` | `2^(3^2) = 512` |
| `-2^2` | `-(2^2) = -4` |
| `(-2)^2` | `(-2)^2 = 4` |
| `2^-1` | `2^(-1)` |
| `a/b*c` | `(a/b)*c` |
| `a - b + c` | `(a - b) + c` |
| `x < 5` | a relation |
| `x < 5 + 1` | `x < (5 + 1)` |

## 4. Names, constants, and scoping

### 4.1 Two namespaces

MathScript distinguishes two namespaces:

- The **value namespace** contains constants, free variables, and bound variables.
- The **function namespace** contains built-in functions and, in a future version, user-defined functions.

An identifier in call position, as in `sin(x)`, resolves in the function namespace. An identifier in value position, as in `pi` or `x`, resolves in the value namespace. This separation makes it possible to use `i` as a summation index while `i` also denotes the imaginary unit in another context.

A function name used as a value, such as `sin + 1`, is an error unless a value with that name exists. A constant used as a function, such as `pi(2)`, is an unknown-function error.

### 4.2 Free variables

An identifier that is not bound by an enclosing operation is a **free variable**. Free variables are permitted: MathScript expressions are symbolic, and `x^2 + 1` is a valid expression without any declaration of `x`.

An implementation MAY offer a closed environment in which every free variable must be declared, but that is an environment policy, not a requirement of the language.

Unknown function names are different from free variables. A bare identifier is a variable; an identifier in call position must resolve to a function.

### 4.3 Built-in constants

The following constants are defined:

| Name | Meaning | Rendering |
| --- | --- | --- |
| `pi` | the ratio of a circle's circumference to its diameter | \(\pi\) |
| `e` | Euler's number, the base of the natural logarithm | \(e\) |
| `infinity` | the extended-real point at infinity | \(\infty\) |
| `i` | the imaginary unit, in environments with complex-number semantics | \(i\) |

`infinity` is not a real number. In this version it is permitted as the target of a `limit` and as a bound of an `integral`; `-infinity` is permitted in the same contexts. It MUST NOT be used as a bound of `sum` or `product`, and other arithmetic involving it is outside the defined semantics of this version.

`i` is a built-in constant only when the current environment enables complex-number semantics. In a real-only environment, `i` is an ordinary free variable unless bound. Regardless of environment, a bounded operation may bind the name `i` locally:

```text
sum(i, 1, n, i^2)
```

Here the `i` in the body is the summation index, not the imaginary unit.

### 4.4 Bound variables

The operations `sum`, `product`, `integral`, `derivative`, `partial`, and `limit` introduce a local variable. The first argument of each of these operations MUST be an identifier; it is not an arbitrary expression:

```text
sum(i, 1, n, i^2)          // valid: i is an identifier
sum(i + 1, 1, n, i^2)      // invalid: first argument is not an identifier
```

The binding rules are defined in section 7.

A bound variable MUST NOT name a function in the current environment. It MAY shadow a constant or an outer variable. This permits the conventional use of `i` as an index while `i` remains available as the imaginary unit elsewhere.

Grouping parentheses around the identifier do not change this rule. `sum((i), 1, n, i^2)` is valid because its first argument is still the identifier `i`; `sum((i + 1), 1, n, i^2)` is invalid because its first argument is an expression.

### 4.5 Shadowing and name resolution

A binding introduced by a bounded operation is visible only inside that operation's expression argument. If an inner operation reuses a name, the inner binding shadows the outer one for the inner body.

Name resolution MUST annotate identifiers with their binding kind. At minimum, a resolved identifier is one of:

- a built-in constant,
- a free variable,
- a locally bound variable,
- a built-in function.

This annotation is necessary for correct rendering. A local variable named `pi` is still the variable `pi`; a renderer MUST NOT silently turn it into the constant \(\pi\). Authors SHOULD avoid shadowing constants other than the conventional index `i`, but the language permits it.

### 4.6 Function definitions

User-defined functions and constants are not part of this version. The syntax:

```text
f(x) = x^2 + 1
```

is therefore not a definition in MathScript 0.1. It parses as an equality relation whose left side is a call to `f`; validation then reports that `f` is an unknown function. Function-definition syntax will be specified separately before it becomes part of the language.

A future definition mechanism MUST keep definitions distinguishable from built-ins and MUST preserve the scoping rules in this document. It MUST NOT allow a definition to change the meaning of an expression outside its declared scope.

## 5. Functions, arity, and validation

### 5.1 Call form

Every named mathematical operation uses the same form:

```text
name(argument1, argument2, ...)
```

Arguments are separated by commas and delimited by parentheses. A comma at nesting depth zero relative to a call separates its arguments; commas inside a nested call belong to the nested call.

For example:

```text
frac(a, sum(i, 1, n, i))
```

has two arguments to `frac`. The commas inside `sum(...)` do not split the arguments of `frac`. Argument boundaries are determined by parenthesis and bracket nesting, not by counting commas in the source text.

Trailing commas are not permitted:

```text
frac(a, b,)       // syntax error
sum(i, 1, n,)     // syntax error
```

Empty argument positions are not permitted:

```text
frac(a, , b)      // syntax error
```

### 5.2 Arity

Every built-in function has a fixed arity. A call MUST supply exactly that number of arguments. Implementations MUST reject a call with too few or too many arguments, and the diagnostic SHOULD state both the expected and received counts.

There is no overloading and no variadic built-in function in this version. Optional arguments are not part of the grammar.

### 5.3 Function names and unknown functions

A call whose name does not resolve to a function in the current environment is an error:

```text
unknownop(x)
```

The function is not defined in the current environment.

Unknown bare identifiers are not errors; they are free variables, as described in section 4.2. An implementation MUST NOT silently treat an unknown function call as multiplication, as a variable, or as text.

### 5.4 Arguments that are not ordinary expressions

Some built-ins constrain the form of their arguments:

- `sum`, `product`, `integral`, `derivative`, `partial`, and `limit` require their first argument to be an identifier.
- `matrix` requires one argument that is a list of lists.
- `vector` requires one argument that is a list.
- Lists are valid only inside the argument of `matrix` or `vector`; a list in any other position is invalid.
- Scalar functions require scalar expressions, not relations or list structures.

These constraints are checked after parsing. A call that violates them is structurally invalid even if its parentheses and commas are well formed.

### 5.5 Structural versus mathematical validity

Validation has two levels:

1. **Structural validity** — the expression parses, function names resolve, arities match, bound-variable positions are identifiers, and matrices and vectors have valid shapes. A renderer can operate on any structurally valid expression.
2. **Mathematical validity** — domains, types, and evaluation conditions. Examples include division by zero, an even root of a negative real number in a real-only environment, or a non-integer bound of a sum when an evaluator is asked to expand it.

An implementation that only parses and renders is not required to decide mathematical validity. An implementation that evaluates MUST report domain errors rather than silently producing a value outside the defined semantics.

### 5.6 No host-language execution

Expressions MUST be parsed into a structured syntax tree. They MUST NOT be passed to `eval`, a shell, a template engine, or any other host-language execution mechanism.

Mathematical expressions MUST remain separate from document formatting and rendering instructions. The parser's output is data, not executable code.

## 6. Standard library

### 6.1 Calling convention

Signatures in this section list the function name and its arguments in order. All arguments are required, and the arity is fixed unless a future version says otherwise. Argument names are descriptive; they are not keywords.

The standard library is divided into arithmetic and algebra, bounded operations, calculus, trigonometry, and structures.

### 6.2 Arithmetic and algebra

| Signature | Meaning |
| --- | --- |
| `sqrt(expression)` | principal square root |
| `root(expression, degree)` | `degree`-th root; the radicand comes first and the degree second |
| `abs(expression)` | absolute value, or modulus for complex values |
| `frac(numerator, denominator)` | fraction with the given numerator and denominator |
| `pow(base, exponent)` | power; equivalent to `base^exponent` |
| `log(expression)` | base-10 logarithm (provisional; see Appendix A, D2) |
| `ln(expression)` | natural logarithm, base \(e\) |
| `exp(expression)` | exponential function, equivalent to \(e^{\text{expression}}\) |

`frac(a, b)` and `a/b` are both divisions. The function form makes the numerator and denominator explicit and is the preferred form when the intended structure is a built-up fraction. `pow(a, b)` and `a^b` have the same mathematical meaning. The syntax tree preserves which form the author wrote, so renderers MAY style them differently.

`log`, `ln`, and `exp` have intrinsic mathematical meanings. Shadowing the identifier `e` in a local scope does not change what `exp` or `ln` mean. A renderer SHOULD avoid displaying `exp(x)` as \(e^x\) in a scope where `e` is bound to something else.

When `root` is evaluated, its degree must be a nonzero integer. For an even degree and a negative real radicand, real-only evaluation is a domain error; complex evaluation follows the environment's branch policy.

### 6.3 Bounded operations

All bounded operations use the argument order:

```text
operation(variable, start, end, expression)
```

| Signature | Meaning |
| --- | --- |
| `sum(variable, start, end, expression)` | sum of `expression` as `variable` runs from `start` through `end` |
| `product(variable, start, end, expression)` | product of `expression` as `variable` runs from `start` through `end` |
| `integral(variable, start, end, expression)` | definite integral of `expression` with respect to `variable` from `start` to `end` |

Bounds are inclusive for `sum` and `product`. `integral` uses conventional calculus semantics, including oriented bounds: reversing `start` and `end` negates the integral. The expression is always the final argument.

The variable is local to the operation. See section 7 for the complete scoping rules and examples.

### 6.4 Calculus

| Signature | Meaning |
| --- | --- |
| `derivative(variable, expression)` | first derivative of `expression` with respect to `variable` |
| `partial(variable, expression)` | first partial derivative of `expression` with respect to `variable` |
| `limit(variable, target, expression)` | two-sided limit of `expression` as `variable` approaches `target` |

`derivative` and `partial` are first-order operations in this version. Higher-order and multivariable conveniences are deferred; see Appendix A, decision D3.

`limit` is two-sided by default. One-sided and directional limits are not part of this version. The target may be a finite expression or `infinity`.

### 6.5 Trigonometry

| Signature | Meaning |
| --- | --- |
| `sin(expression)` | sine |
| `cos(expression)` | cosine |
| `tan(expression)` | tangent |
| `asin(expression)` | inverse sine |
| `acos(expression)` | inverse cosine |
| `atan(expression)` | inverse tangent |

Trigonometric functions use radians when evaluated. Inverse trigonometric functions use their principal branches when evaluated in the real domain.

### 6.6 Structures

| Signature | Meaning |
| --- | --- |
| `matrix(rows)` | matrix whose rows are given by a list of lists |
| `vector(elements)` | column vector whose entries are given by a list |

Examples:

```text
matrix([[1, 2], [3, 4]])
vector([x, y, z])
```

A matrix argument MUST be a non-empty list of non-empty lists, and every row MUST have the same length. The matrix is interpreted in row-major order. For example, `matrix([[1, 2], [3, 4]])` has first row `[1, 2]` and second row `[3, 4]`.

A vector argument MUST be a non-empty list. A vector is rendered as a column vector by default.

Matrix and vector entries MUST be scalar expressions. Lists are structural in this version and cannot be used as arithmetic operands.

### 6.7 Reserved and experimental names

The following are reserved for future versions and are not part of this version's conformance surface:

- `cases(...)` for piecewise expressions. The exact argument convention is deferred; a future version may introduce a dedicated block syntax.
- Higher-order derivative and integral forms.
- One-sided limits, directional limits, and limits at infinity with direction.
- Indefinite integrals and antiderivatives.
- User-defined functions and constants.
- Set, interval, logic, and quantifier notation.

An implementation MAY provide extensions, but it MUST NOT claim conformance for a reserved name unless it documents the extension and its version.

## 7. Bounded operations and scope

This section defines the language's central binding rule. It is deliberate and MUST be implemented exactly.

### 7.1 Argument order

Every bounded operation follows this order:

```text
operation(variable, start, end, expression)
```

| Function | Meaning |
| --- | --- |
| `sum(i, 1, n, i^2)` | sum of squares from 1 through n |
| `product(i, 1, n, i)` | product of integers from 1 through n |
| `integral(x, 0, 1, x^2)` | definite integral of \(x^2\) from 0 to 1 |

The first argument is always the bound variable, the second and third are the bounds, and the fourth is the expression being combined. The expression is always last.

### 7.2 Scope of the bound variable

The variable introduced by a bounded operation is local to that operation's expression argument.

- The `start` and `end` arguments are resolved in the enclosing scope.
- The `expression` argument is resolved in a scope where `variable` is bound.
- The binding does not extend to the `start` or `end` arguments.
- The binding does not extend outside the call.

This rule has two important consequences.

First, a bound variable may shadow an outer variable or a constant without changing the outer meaning:

```text
sum(i, 1, n, i^2)
```

Here the `i` used in the body is local. If `i` denotes the imaginary unit in the surrounding environment, that meaning is restored after the call.

Second, a bound can refer to an outer variable with the same name. For example:

```text
product(i, 1, i, i)
```

Inside the upper bound, `i` refers to the enclosing scope; inside the body, `i` is the product index. The inner binding does not capture its own upper bound. This is the mathematically conventional interpretation, and it is why bounds are resolved outside the new binding.

Authors SHOULD avoid reusing the same name in a bound and in the bound's own start or end expressions when a clearer name is available.

### 7.3 Nested operations

Nested operations may reuse variable names without changing the outer variable's value:

```text
sum(i, 1, n, product(j, 1, i, j))
```

This represents:

```text
sum from i = 1 to n of (product from j = 1 to i of j)
```

The `i` in the upper bound of `product` is the outer summation index. The `j` is local to the inner product. The inner product does not modify the outer `i`.

A nested operation may also reuse the same name:

```text
sum(i, 1, n, product(i, 1, i, i))
```

The inner `i` shadows the outer `i` in the inner body. The upper bound of the inner product is still resolved in the outer scope, where `i` is the outer summation index. This expression is well defined, but a different name for the inner index is usually clearer.

### 7.4 Semantics of sum and product

For finite integer bounds:

- `sum(v, a, b, expr)` combines `expr` for each integer value of `v` from `a` through `b`, inclusive.
- `product(v, a, b, expr)` multiplies the same values, inclusive.
- If `a > b`, the empty sum is `0` and the empty product is `1`.
- If `a = b`, the result is the single term with `v = a`.

When an evaluator is used, `a` and `b` MUST be integer-valued. A non-integer bound is a domain error, not a silent rounding operation.

### 7.5 Semantics of integral

`integral(v, a, b, expr)` denotes the definite integral of `expr` with respect to `v` over the interval from `a` to `b`.

- Reversing the bounds negates the integral: `integral(x, b, a, f) = -integral(x, a, b, f)`.
- If `a = b`, the integral is zero.
- `infinity` is permitted as a bound for improper integrals. Evaluation of improper integrals is outside the scope of this version.
- The differential `dv` is implicit in the source syntax and is supplied by the renderer.

### 7.6 Semantics of derivative, partial, and limit

`derivative(v, expr)` denotes the first derivative of `expr` with respect to `v`. `partial(v, expr)` denotes the first partial derivative with respect to `v`. The variable is local to `expr`.

`limit(v, target, expr)` denotes the two-sided limit of `expr` as `v` approaches `target`. The variable is local to `expr`; `target` is resolved in the enclosing scope.

Higher-order derivatives can be written by nesting:

```text
derivative(x, derivative(x, f))
```

Multivariable expressions can be handled by nesting partial derivatives. These nested forms are well defined even though dedicated higher-order notation is deferred. See Appendix A, D3.

### 7.7 Rendering of binding operations

The renderer maps the argument order to conventional notation:

| MathScript | Conventional notation |
| --- | --- |
| `sum(i, 1, n, i^2)` | \(\displaystyle\sum_{i=1}^{n} i^2\) |
| `product(i, 1, n, i)` | \(\displaystyle\prod_{i=1}^{n} i\) |
| `integral(x, 0, 1, x^2)` | \(\displaystyle\int_{0}^{1} x^2\,dx\) |
| `derivative(x, x^2 + 1)` | \(\displaystyle\frac{d}{dx}(x^2+1)\) |
| `partial(x, x^2 + y^2)` | \(\displaystyle\frac{\partial}{\partial x}(x^2+y^2)\) |
| `limit(x, 0, sin(x)/x)` | \(\displaystyle\lim_{x\to 0}\frac{\sin(x)}{x}\) |

The source order is always `variable, bounds, expression`, regardless of how the notation is displayed.

## 8. Parsing and validation

### 8.1 Processing pipeline

A conforming implementation processes source in these stages:

1. **Lexing** — split the source into tokens, ignoring whitespace and comments.
2. **Parsing** — build an expression tree according to the grammar in section 3.
3. **Structural validation** — resolve function names, check arity, check bound-variable positions, and validate matrix and vector shapes.
4. **Semantic analysis or evaluation** — optional; check domains and compute values if the implementation provides an evaluator.
5. **Rendering or export** — produce output from the validated tree.

Stages 1 through 3 are required for conformance. Stage 4 is optional. Stage 5 is required for a renderer.

### 8.2 Mandatory parsing rules

Implementations MUST:

- Parse expressions into a structured syntax tree.
- Require balanced parentheses and brackets.
- Require every function name to be followed by a parenthesized argument list.
- Separate arguments by commas at the correct nesting depth.
- Validate function names and argument counts.
- Check that the first argument of each operation that introduces a variable is an identifier.
- Check that matrices are rectangular and non-empty, and that vectors are non-empty.
- Report errors with source locations where possible.
- Distinguish syntax errors from mathematical domain errors.
- Avoid evaluating expressions as arbitrary host-language code.
- Avoid silently changing ambiguous expressions.

Implementations MUST NOT:

- Automatically close missing parentheses.
- Treat an unknown function call as multiplication.
- Treat implicit multiplication as valid in this version.
- Split arguments by counting commas without respecting nesting.
- Accept a relation where a scalar operand is required.
- Reinterpret a malformed expression as text or as a different operation.

### 8.3 Diagnostics

A diagnostic SHOULD include:

- A stable category, such as syntax, name resolution, arity, structure, or domain.
- A human-readable message.
- The source span of the offending construct, ideally with line and column.
- The expected and received values where relevant.

The following examples define the intended behavior. The exact wording and error codes are implementation-defined.

#### Invalid argument count

```text
sum(i, 1, n)
```

Expected 4 arguments; received 3.

#### Missing closing parenthesis

```text
sqrt(x + 1
```

Expected a closing parenthesis for the call to `sqrt`.

#### Unknown function

```text
unknownop(x)
```

The function `unknownop` is not defined in the current environment.

#### Invalid bound variable

```text
sum(i + 1, 1, n, i)
```

The first argument of `sum` must be an identifier, not an expression.

#### Inconsistent matrix rows

```text
matrix([[1, 2], [3]])
```

All rows of a matrix must have the same length.

#### Implicit multiplication

```text
2x
```

Unexpected identifier after a number. Implicit multiplication is not defined; write `2*x`.

#### Chained relation

```text
a < b < c
```

Relations cannot be chained in this version. Use a future Boolean form or separate expressions.

#### Unknown bare variable

```text
x + 1
```

This is valid. `x` is a free variable; no declaration is required.

### 8.4 The nested-comma ambiguity

The following expression is valid:

```text
frac(a, sum(i, 1, n, i))
```

The parser MUST recognize that the inner commas belong to `sum`, and that the outer call has exactly two arguments: `a` and the entire `sum(...)` expression.

This is not an ambiguity for a recursive parser. Parentheses and brackets determine argument boundaries; comma counting alone is never sufficient.

### 8.5 No silent repair

MathScript does not guess what a malformed expression was intended to mean. In particular:

- `sqrt(x + 1` is an error, not `sqrt(x + 1)`.
- `2x` is an error, not `2*x`.
- `a < b < c` is an error, not a conjunction.
- `sum(i, 1, n)` is an error, not a sum with an implicit body.
- `matrix([[1, 2], [3]])` is an error, not a ragged matrix padded with zeros.

Error recovery may allow an editor to continue parsing after the first error, but recovered input MUST NOT be treated as a conforming expression.

## 9. Abstract syntax tree

### 9.1 Node kinds

A conforming parser MUST produce a tree containing at least the following node kinds. Implementations may use different host-language types or field names, but the structure must preserve equivalent information.

| Node | Fields | Meaning |
| --- | --- | --- |
| `Number` | `value`, optional `lexeme`, `span` | numeric literal |
| `Identifier` | `name`, `span`, optional binding annotation | variable or constant reference |
| `Call` | `callee` (identifier), `arguments`, `span` | function call |
| `Unary` | `operator`, `operand`, `span` | prefix `+` or `-` |
| `Binary` | `operator`, `left`, `right`, `span` | arithmetic operator |
| `Relation` | `operator`, `left`, `right`, `span` | equality or comparison |
| `List` | `elements`, `span` | bracket-delimited list |

A `Call` callee is an identifier, not an arbitrary expression. Parentheses used only for grouping do not need a node of their own, provided the tree preserves the grouping. Comments and whitespace are not represented in the tree.

The parser MUST NOT normalize `pow(a, b)` into `a^b`, or vice versa, before rendering if the difference matters to the author. A later normalization pass may establish equivalence for evaluation or simplification.

### 9.2 Example tree

The expression:

```text
sum(i, 1, n, i^2)
```

has the following structure:

```text
Call
├── callee: "sum"
└── arguments:
    ├── Identifier("i")
    ├── Number(1)
    ├── Identifier("n")
    └── Binary("^")
        ├── Identifier("i")
        └── Number(2)
```

The outer call has exactly four arguments. The exponentiation is the fourth argument, not a separate argument to `sum`.

### 9.3 Binding annotations

After structural validation, identifier nodes SHOULD carry a binding annotation identifying them as a built-in constant, free variable, bound variable, or function. The annotation is necessary when a local variable shadows a constant, and it also lets a renderer choose the correct glyph for a name.

Binding annotations MUST NOT change the mathematical structure of the tree. They describe how names were resolved.

### 9.4 Source spans

Every node SHOULD retain a source span covering its first and last characters. Spans are used for diagnostics, editor highlighting, and source maps. A span may be represented as byte offsets, character offsets, or line and column positions, provided the representation is documented.

## 10. Rendering and interchange

### 10.1 Separation from output formats

The source syntax is independent of every output format. A renderer consumes the validated syntax tree and produces a representation; it does not reinterpret the original source text.

Planned outputs include:

- HTML with semantic markup and accessible mathematics.
- MathML for interchange and accessibility.
- LaTeX for typesetting and publication.
- PDF through a document renderer or a LaTeX pipeline.
- Plain text or Unicode for lightweight contexts.

No output format may require a change to the user-facing syntax. Renderer-specific hints belong in a separate document layer or in a future, explicitly versioned extension.

### 10.2 Rendering contract

A conforming renderer MUST:

- Preserve the mathematical grouping represented by the tree.
- Render every core function in the standard library.
- Respect binding annotations when choosing how to display an identifier.
- Escape output for the target format rather than copying identifiers blindly.
- Produce output that is unambiguous when read back as mathematics, even if its visual style differs from another renderer.

A renderer MAY choose between equivalent presentations. For example, it may render `/` as a slash or as a built-up fraction, provided the grouping is preserved. It may use different spacing, fonts, or matrix delimiters, provided the mathematical meaning is unchanged.

### 10.3 LaTeX mapping

The following table gives the intended LaTeX representation of core constructs. It is illustrative of the mapping, not a requirement that every renderer produce byte-identical output.

| MathScript | LaTeX |
| --- | --- |
| `frac(a, b)` | `\frac{a}{b}` |
| `sqrt(x + 1)` | `\sqrt{x+1}` |
| `root(x, 3)` | `\sqrt[3]{x}` |
| `abs(x - 3)` | `\left\lvert x-3 \right\rvert` |
| `pow(x, n)` | `x^{n}` |
| `x^n` | `x^{n}` |
| `sum(i, 1, n, i^2)` | `\sum_{i=1}^{n} i^{2}` |
| `product(i, 1, n, i)` | `\prod_{i=1}^{n} i` |
| `integral(x, 0, 1, x^2)` | `\int_{0}^{1} x^{2}\,dx` |
| `derivative(x, x^2 + 1)` | `\frac{d}{dx}\left(x^{2}+1\right)` |
| `partial(x, x^2 + y^2)` | `\frac{\partial}{\partial x}(x^2+y^2)` |
| `limit(x, 0, sin(x)/x)` | `\lim_{x\to 0}\frac{\sin(x)}{x}` |
| `matrix([[1, 2], [3, 4]])` | `\begin{bmatrix}1&2\\3&4\end{bmatrix}` |
| `vector([x, y, z])` | `\begin{bmatrix}x\\y\\z\end{bmatrix}` |
| `pi` | `\pi` |
| `infinity` | `\infty` |

Renderers must handle operator precedence when emitting LaTeX. If a child expression has lower precedence than its parent, the renderer MUST insert parentheses or an equivalent grouping construct. For example, `(a+b)*c` must not be emitted as `a+b\cdot c`.

### 10.4 Identifier rendering

The renderer SHOULD use the following conventions:

- Known Greek-letter names map to Greek symbols: `alpha` to \(\alpha\), `beta` to \(\beta\), `theta` to \(\theta\), and so on.
- `pi` maps to \(\pi\) when it resolves to the built-in constant.
- `infinity` maps to \(\infty\) when it resolves to the built-in constant.
- `e` maps to \(e\) when it resolves to Euler's number.
- Single-letter Latin variables render in italic math style.
- Multi-letter descriptive names such as `velocity` or `total_cost` render upright, so they are not mistaken for a product of individual letters.
- A locally bound variable named `pi` renders as the variable, not as \(\pi\).

The exact Greek-name table is a renderer concern, but it SHOULD be documented and stable. The list of built-in constants is normative; the visual mapping is not.

### 10.5 MathML and accessibility

A MathML renderer SHOULD emit semantic elements where possible, such as `mfrac`, `msqrt`, `mroot`, `msub`, `msup`, `munderover`, and `mtable`, using explicit fence operators where grouping is required. It SHOULD preserve an accessible text alternative for complex constructs, especially matrices, integrals, and limits.

Accessibility is not optional in the long term. A production renderer SHOULD provide:

- A readable text alternative for screen readers.
- Correct language metadata.
- A structural fallback when MathML is unavailable.
- A way to copy the original MathScript source.

### 10.6 Document layer

MathScript expressions are intended to become part of complete documents. A future document model may support:

- Headings and paragraphs.
- Inline mathematics and display equations.
- Numbered equations and references.
- Matrices, tables, and figures.
- Citations and bibliographies.
- Sections, appendices, and cross-references.

The mathematical source will be parsed into a syntax tree, which can be converted into an internal document model. Renderers and exporters then generate HTML, PDF, MathML, or LaTeX from that model.

The document layer is not part of this version. In particular, this version does not define Markdown syntax, inline-math delimiters, equation numbering, or citation commands.

## 11. Compatibility and versioning

### 11.1 Draft status

The 0.x specification is provisional. Changes to function signatures, operator precedence, parsing semantics, and scoping rules are permitted between 0.x drafts, but each change MUST be documented.

Once version 1.0 is released, the following are compatibility-sensitive:

- The grammar and tokenization rules.
- Operator precedence and associativity.
- Function names, argument order, and arity.
- Scoping and name-resolution rules.
- The meaning of built-in constants.
- The requirement that invalid expressions produce errors.

### 11.2 Compatible and incompatible changes

The following changes are normally backward-compatible:

- Adding a new built-in function with a new name.
- Adding a new rendering target.
- Adding optional metadata that does not change parsing.
- Adding a new diagnostic category.

The following changes are normally incompatible and require a major version or an explicit compatibility mode:

- Changing the argument order of an existing function.
- Changing the arity of an existing function.
- Changing operator precedence or associativity.
- Making previously valid syntax invalid.
- Changing the meaning of an existing name.
- Adding implicit multiplication in a way that changes how valid source is parsed.

Adding a new function name can still conflict with a user-defined function or a future extension. Implementations SHOULD reserve the documented core names and MUST report conflicts rather than silently changing resolution.

### 11.3 Version identification

An implementation that claims MathScript conformance SHOULD state:

- The specification version it implements.
- The set of supported extensions.
- Whether complex-number semantics are enabled.
- Whether evaluation is supported, and if so, which domain policy it uses.
- The rendering targets it supports.

Documents and serialized syntax trees SHOULD eventually carry a specification version. That metadata is not defined in this version.

## 12. Conformance

### 12.1 Conformance levels

An implementation may claim one or more of the following levels.

**Parser conformance.** The implementation lexes and parses the grammar, produces a syntax tree, and rejects malformed input with useful diagnostics.

**Core-library conformance.** The implementation recognizes every core function in section 6, validates arity and argument forms, and assigns the documented meaning.

**Renderer conformance.** The implementation renders every core construct into at least one supported output format while preserving grouping and binding resolution.

**Full conformance.** The implementation satisfies parser, core-library, and renderer conformance, and documents its supported extensions and environment modes.

Partial conformance MUST be stated explicitly. An implementation that supports only arithmetic and summations is not fully conformant.

### 12.2 Valid conformance examples

The following expressions MUST parse and validate:

| Example | Meaning |
| --- | --- |
| `sum(i, 1, n, i^2)` | summation of squares |
| `product(i, 1, n, i)` | product of integers |
| `integral(x, 0, 1, x^2)` | definite integral |
| `frac(a + b, c + d)` | fraction of two expressions |
| `sqrt(x^2 + 1)` | square root |
| `limit(x, 0, sin(x)/x)` | limit as \(x\) approaches zero |
| `sum(i, 1, n, product(j, 1, i, j))` | nested bounded operations |
| `matrix([[1, 2], [3, 4]])` | 2 by 2 matrix |
| `vector([x, y, z])` | column vector |
| `2^3^2` | right-associative exponentiation |
| `-2^2` | unary minus applied to a power |
| `2^-1` | negative exponent |
| `frac(a, sum(i, 1, n, i))` | nested call with commas |
| `a + b = c + d` | equality relation |
| `x < 5` | comparison relation |

### 12.3 Invalid conformance examples

The following MUST be rejected:

| Example | Reason |
| --- | --- |
| `2x` | implicit multiplication is not defined |
| `sum(i, 1, n)` | wrong arity |
| `sqrt(x + 1` | missing closing parenthesis |
| `unknownop(x)` | unknown function |
| `a < b < c` | chained relation |
| `matrix([[1, 2], [3]])` | inconsistent row lengths |
| `matrix([])` | empty matrix |
| `vector([])` | empty vector |
| `sum(i + 1, 1, n, i)` | bound variable is not an identifier |
| `frac(a, b,)` | trailing comma |
| `frac(a, , b)` | empty argument |
| `sin(x < 5)` | relation used as a scalar argument |
| `(x < 5) + 1` | relation used as an arithmetic operand |
| `x = (y < 5)` | relation nested inside another relation |
| `[1, 2]` | list outside `matrix` or `vector` |

### 12.4 Example diagnostics

A complete implementation should produce messages in the spirit of these examples:

```text
error[arity]: function 'sum' expects 4 arguments, received 3
  --> example.ms:1:1
   |
 1 | sum(i, 1, n)
   | ^^^^^^^^^^^^
```

```text
error[syntax]: expected ')' to close call to 'sqrt'
  --> example.ms:1:1
   |
 1 | sqrt(x + 1
   | ^^^^^^^^^^^
```

```text
error[name]: unknown function 'unknownop'
  --> example.ms:1:1
   |
 1 | unknownop(x)
   | ^^^^^^^^^^^^
```

The file extension `.ms` is illustrative; this specification does not mandate one.

## 13. Implementation roadmap (informative)

This specification describes the target language surface. An implementation may proceed in stages. The stages below are implementation milestones, not versions of this document, and they do not limit a conformance claim that is otherwise justified.

1. **Stage 0.1 — Core syntax.** Arithmetic, variables, function calls, precedence, nested functions, and summation. A parser at this stage should already follow the full grammar in section 3 and the validation rules in section 8, even if it supports only a subset of the standard library.
2. **Stage 0.2 — Standard mathematics.** Fractions, roots, powers, matrices, vectors, trigonometry, and constants.
3. **Stage 0.3 — Calculus.** Integrals, derivatives, limits, products, and advanced summations.
4. **Stage 0.4 — Interactive editor.** Live preview, error highlighting, autocomplete, and visual equation editing.
5. **Stage 1.0 — Publishing.** Stable grammar, document structure, accessibility, and reliable exports.

A partial implementation MUST state which stages and conformance levels it supports. It MUST NOT claim full conformance while required core functions or rendering targets are missing.

## Appendix A. Decisions required before parser implementation

This draft adopts provisional answers for three compatibility-sensitive questions. They are recorded here so the parser, standard library, and renderers do not drift. The provisional answers are internally consistent, but they are not yet frozen for version 1.0.

| ID | Decision | Provisional answer in this draft | Recommendation |
| --- | --- | --- | --- |
| D1 | Is implicit multiplication allowed? | No | Keep it disallowed |
| D2 | What is the default base of `log`? | Base 10 | Ratify base 10 |
| D3 | Are higher-order and multivariable forms required in 1.0? | No; use nesting | Defer dedicated forms |

### D1. Implicit multiplication

**Question.** May `2x`, `2 pi`, or `(x+1)(x-1)` mean multiplication?

**Provisional answer.** No. Every multiplication uses `*`.

**Recommendation.** Keep implicit multiplication out of the language. The grammar is simpler, `x(y)` is unambiguously a function call, and multi-letter identifiers such as `xy` remain single names. Adding implicit multiplication later would introduce precedence questions and could change how source is read. If it is ever added, it should be a major-version change or an explicitly selected syntax mode, with documented precedence relative to function calls and exponentiation.

**Impact.** The parser rejects adjacency of two primaries. The diagnostic should suggest `*`.

### D2. Default base of `log`

**Question.** Does `log(x)` mean \(\log_{10}(x)\) or \(\ln(x)\)?

**Provisional answer.** Base 10. `ln(x)` is the natural logarithm.

**Recommendation.** Ratify base 10. The language already provides `ln`, so making `log` natural would make the two names redundant and leave no concise common-logarithm notation. A future explicit form should use a distinct name, such as `logbase(expression, base)`, rather than overloading the fixed-arity `log` function. Such an addition must be specified before implementation.

**Impact.** This is a semantic decision; it does not change the grammar. Renderers should display `log` as \(\log\) and `ln` as \(\ln\). An implementation MUST document which base it uses rather than leaving the meaning implicit.

### D3. Higher-order and multivariable calculus

**Question.** Must version 1.0 provide higher-order derivatives, mixed partial derivatives, multiple integrals, or directional limits as dedicated forms?

**Provisional answer.** No. The core forms are first-order:

```text
derivative(variable, expression)
partial(variable, expression)
integral(variable, start, end, expression)
limit(variable, target, expression)
```

Higher-order derivatives and multivariable integrals can be written by nesting. Mixed partials can be written by nesting `partial` calls.

**Recommendation.** Keep the first-order signatures for 1.0 and add dedicated forms later as new functions or a new notation layer, rather than changing existing arities. This preserves compatibility and keeps the first parser small. If repeated nesting proves too awkward for research notation, a future version can introduce an explicit order argument or a multivariable form with a clearly versioned signature.

**Impact.** The parser and validator remain simple, but the renderer may produce nested derivative notation rather than compact \(\frac{d^2}{dx^2}\) notation. That is acceptable for version 0.1. A future extension should not repurpose the existing two-argument functions.

## Appendix B. Reserved names and future syntax

The following names and concepts are reserved for future specification. They are not valid core functions in this version, and an implementation that supports them MUST document them as extensions:

- `cases` for piecewise expressions.
- Higher-order derivative and integral forms.
- One-sided and directional limits.
- Indefinite integrals and antiderivatives.
- User-defined functions and constants.
- Set-builder notation, intervals, logic, and quantifiers.
- Document structure, equation numbering, references, and citations.

Reserving a name does not define it. An implementation MUST NOT silently give a reserved name a meaning that conflicts with a future specification.

## Appendix C. Summary of provisional choices

For quick reference, this draft fixes the following behavior:

- Function calls use `name(arg1, arg2, ...)`.
- Arguments are separated by commas at the current nesting depth.
- Arithmetic operators follow conventional precedence; `^` is right-associative.
- Unary minus applies to the whole power: `-x^2 = -(x^2)`.
- Implicit multiplication is not allowed.
- Relations are non-associative and do not chain.
- `=` is equality, never assignment.
- Free variables are allowed; unknown functions are errors.
- Bounded operations use `operation(variable, start, end, expression)`.
- The bound variable is local to the expression argument; bounds resolve in the enclosing scope.
- `sum` and `product` bounds are inclusive.
- Matrices are rectangular lists of rows; vectors are non-empty lists rendered as columns.
- `log` is base 10 provisionally; `ln` is natural.
- Derivatives and partial derivatives are first-order in this draft.
- The syntax tree is the boundary between parsing and rendering.

These choices are the initial contract. The next revision should ratify or replace the decisions in Appendix A before the parser becomes a dependency for real documents.

