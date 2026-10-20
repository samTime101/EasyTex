import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { engineManifest, ENGINE_NAME, ENGINE_VERSION } from "../src/engine.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "tools", "easytex-engine.mjs");

function filesIn(directory) {
  const entries = readdirSync(directory);
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...filesIn(full));
    else if (entry.endsWith(".js")) files.push(full);
  }
  return files;
}

// Remove comments and string literals so the scan does not trip over prose
// that merely mentions a browser API.
function stripLiterals(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

const FORBIDDEN = [
  { name: "the DOM", pattern: /(?<![.\w$])document\s*\./ },
  { name: "window", pattern: /(?<![.\w$])window\s*\./ },
  { name: "localStorage", pattern: /(?<![.\w$])localStorage\b/ },
  { name: "navigator", pattern: /(?<![.\w$])navigator\b/ },
  { name: "fetch", pattern: /(?<![.\w$])fetch\s*\(/ },
  { name: "XMLHttpRequest", pattern: /(?<![.\w$])XMLHttpRequest\b/ },
  { name: "requestAnimationFrame", pattern: /(?<![.\w$])requestAnimationFrame\b/ },
  { name: "the process object", pattern: /(?<![.\w$])process\s*\./ },
  { name: "CommonJS require", pattern: /(?<![.\w$])require\s*\(/ },
  { name: "the filesystem", pattern: /(?<![.\w$])(readFileSync|writeFileSync|existsSync)\b/ },
  { name: "Node path helpers", pattern: /(?<![.\w$])(__dirname|__filename)\b/ },
  { name: "timers", pattern: /(?<![.\w$])(setTimeout|setInterval)\s*\(/ }
];

test("the engine uses no browser and no operating-system API", () => {
  const files = filesIn(path.join(root, "src"));
  assert.ok(files.length > 10, "the engine has files to check");
  for (const file of files) {
    const source = stripLiterals(readFileSync(file, "utf8"));
    for (const rule of FORBIDDEN) {
      assert.equal(
        rule.pattern.test(source),
        false,
        `${path.relative(root, file)} uses ${rule.name}`
      );
    }
  }
});

test("the engine never imports the browser layer or the tools", () => {
  for (const file of filesIn(path.join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    assert.equal(
      /from\s+["'][^"']*\.\.\/ui\//.test(source),
      false,
      `${path.relative(root, file)} imports the browser layer`
    );
    assert.equal(
      /from\s+["'][^"']*\.\.\/tools\//.test(source),
      false,
      `${path.relative(root, file)} imports the tools`
    );
  }
});

test("the browser layer never imports the command line tools", () => {
  for (const file of filesIn(path.join(root, "ui"))) {
    const source = readFileSync(file, "utf8");
    assert.equal(
      /from\s+["'][^"']*\.\.\/tools\//.test(source),
      false,
      `${path.relative(root, file)} imports the tools`
    );
  }
});

test("the browser layer reaches the engine through its public surface", () => {
  for (const file of filesIn(path.join(root, "ui"))) {
    const source = readFileSync(file, "utf8");
    for (const internal of ["../src/index.js", "../src/document/index.js"]) {
      assert.equal(
        source.includes(`"${internal}"`),
        false,
        `${path.relative(root, file)} imports ${internal} instead of src/engine.js`
      );
    }
  }
});

test("the engine surface exposes the documented entry points", async () => {
  const engine = await import("../src/engine.js");
  for (const name of [
    "compile",
    "compileDocument",
    "parse",
    "validate",
    "renderMathML",
    "renderLaTeX",
    "engineManifest"
  ]) {
    assert.equal(typeof engine[name], "function", `${name} is exported`);
  }
  assert.equal(engine.ENGINE_NAME, ENGINE_NAME);
  assert.equal(typeof engine.ENGINE_VERSION, "string");
});

test("the manifest describes the whole language surface", () => {
  const manifest = engineManifest();
  assert.equal(manifest.engine, ENGINE_NAME);
  assert.equal(manifest.version, ENGINE_VERSION);
  assert.equal(manifest.language, "MathScript");

  const sqrt = manifest.functions.find((entry) => entry.name === "sqrt");
  assert.equal(sqrt.arity, 1);
  const sum = manifest.functions.find((entry) => entry.name === "sum");
  assert.equal(sum.binder, true);
  assert.equal(sum.arity, 4);

  assert.ok(manifest.constants.includes("pi"));
  assert.ok(manifest.greek.some((entry) => entry.name === "alpha"));
  assert.ok(manifest.symbols.some((entry) => entry.name === "hbar"));
  assert.ok(manifest.operators.some((entry) => entry.symbol === "^"));

  assert.ok(manifest.components.some((entry) => entry.name === "Document"));
  assert.ok(manifest.components.some((entry) => entry.name === "paragraph"));
  assert.ok(manifest.fields.some((entry) => entry.name === "title"));
  assert.ok(manifest.metadata.includes("title"));
  assert.ok(!manifest.metadata.includes("content"));
  assert.ok(manifest.pageOptions.includes("size"));
  assert.ok(manifest.pageOptions.includes("margin_top"));
  assert.ok(manifest.marginSides.includes("margin_top"));
  assert.deepEqual(manifest.namedArguments.equation, ["label", "number"]);
  assert.deepEqual(manifest.namedArguments.paragraph, []);
  assert.deepEqual(manifest.bibliographyTypes.article.required, [
    "author",
    "title",
    "year",
    "journal"
  ]);

  assert.ok(manifest.templates.some((entry) => entry.name === "article"));
  assert.ok(manifest.pageSizes.some((entry) => entry.name === "A4"));
  assert.equal(manifest.defaultPage.size, "A4");
  assert.equal(manifest.latex.length, 743);
});

test("the manifest is JSON data without functions or cycles", () => {
  const manifest = engineManifest();
  const roundTripped = JSON.parse(JSON.stringify(manifest));
  assert.deepEqual(roundTripped, manifest);
});

// ------------------------------------------------------------------ the CLI

function runCli(args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

test("the command line host answers a compile request with JSON", async () => {
  const { code, stdout } = await runCli(["compile", "--source", "x = frac(1, 2)"]);
  assert.equal(code, 0);
  const response = JSON.parse(stdout);
  assert.equal(response.engine, ENGINE_NAME);
  assert.equal(response.version, ENGINE_VERSION);
  assert.equal(response.command, "compile");
  assert.equal(response.ok, true);
  assert.equal(response.result.ok, true);
  assert.ok(response.result.mathml.startsWith("<math"));
  assert.equal(response.result.latex, "x=\\frac{1}{2}");
  assert.deepEqual(response.result.diagnostics, []);
});

test("the command line host reports diagnostics as data", async () => {
  const { stdout } = await runCli(["compile", "--source", "2x"]);
  const response = JSON.parse(stdout);
  assert.equal(response.ok, true, "the request itself was understood");
  assert.equal(response.result.ok, false);
  const [diagnostic] = response.result.diagnostics;
  assert.equal(diagnostic.severity, "error");
  assert.equal(diagnostic.category, "syntax");
  assert.equal(diagnostic.span.start.line, 1);
  assert.equal(diagnostic.span.start.column, 2);
});

test("the command line host serves newline-delimited requests", async () => {
  const input = [
    JSON.stringify({ id: "1", command: "compile", source: "pi" }),
    JSON.stringify({ id: "2", command: "version" }),
    JSON.stringify({ id: "3", command: "nope" })
  ].join("\n");
  const { stdout } = await runCli(["serve"], `${input}\n`);
  const lines = stdout.trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(lines.length, 3);
  assert.equal(lines[0].id, "1");
  assert.ok(lines[0].result.mathml.includes("π"));
  assert.equal(lines[1].result.version, ENGINE_VERSION);
  assert.equal(lines[2].ok, false);
  assert.match(lines[2].error.message, /Unknown command/);
});

test("the command line host prints the manifest and the version", async () => {
  const manifest = JSON.parse((await runCli(["manifest"])).stdout);
  assert.equal(manifest.result.engine, ENGINE_NAME);
  assert.equal(manifest.result.latex.length, 743);

  const version = JSON.parse((await runCli(["version"])).stdout);
  assert.equal(version.result.version, ENGINE_VERSION);
});
