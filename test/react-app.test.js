import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { routeFor } from "../app/src/lib/router.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = path.join(root, "app");

function filesIn(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...filesIn(full));
    else files.push(full);
  }
  return files;
}

test("the router maps the three pages", () => {
  assert.equal(routeFor("/"), "editor");
  assert.equal(routeFor("/index.html"), "editor");
  assert.equal(routeFor("/document"), "document");
  assert.equal(routeFor("/document/"), "document");
  assert.equal(routeFor("/docs"), "docs");
  assert.equal(routeFor("/docs.html"), "docs");
  assert.equal(routeFor("/anything-else"), "editor");
});

test("the React app has an entry point and the three pages", () => {
  assert.ok(existsSync(path.join(appDirectory, "index.html")), "the app has an HTML entry point");
  assert.ok(existsSync(path.join(appDirectory, "src", "main.jsx")), "the app mounts React");
  for (const page of ["EditorPage.jsx", "WriterPage.jsx", "DocsPage.jsx"]) {
    assert.ok(
      existsSync(path.join(appDirectory, "src", "pages", page)),
      `${page} exists`
    );
  }
});

test("the React host reaches the engine through the engine surface", () => {
  const sources = filesIn(path.join(appDirectory, "src"))
    .filter((file) => file.endsWith(".js") || file.endsWith(".jsx"))
    .map((file) => ({ file: path.relative(root, file), source: readFileSync(file, "utf8") }));

  for (const { file, source } of sources) {
    assert.equal(
      /from\s+["'][^"']*\.\.\/\.\.\/src\/(index|document)\.js["']/.test(source),
      false,
      `${file} imports an engine internal instead of src/engine.js`
    );
  }

  const bridge = readFileSync(path.join(appDirectory, "src", "lib", "engine.js"), "utf8");
  assert.match(bridge, /from "@engine\/engine\.js"/);
});

test("the React app shares the styles and the engine with the static host", () => {
  const main = readFileSync(path.join(appDirectory, "src", "main.jsx"), "utf8");
  assert.match(main, /@web\/styles\.css/);
  assert.match(main, /@web\/docs\.css/);
});

const viteAvailable = existsSync(path.join(root, "node_modules", "vite", "package.json"));

test(
  "the React app builds",
  { skip: viteAvailable ? false : "vite is not installed" },
  async () => {
    const result = await new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [path.join(root, "node_modules", "vite", "bin", "vite.js"), "build", "--config", "vite.react.config.js"],
        { cwd: root, stdio: ["ignore", "pipe", "pipe"] }
      );
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        output += chunk;
      });
      child.on("close", (code) => resolve({ code, output }));
    });
    assert.equal(result.code, 0, result.output);
    assert.ok(existsSync(path.join(root, "dist", "index.html")), "the build writes an index.html");
  }
);
