import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDirectory = path.join(root, "web");

function htmlFiles() {
  return readdirSync(webDirectory)
    .filter((entry) => entry.endsWith(".html"))
    .map((entry) => path.join(webDirectory, entry));
}

function localTargets(source) {
  const targets = [];
  const pattern = /(?:href|src)="([^"]+)"/g;
  let match = pattern.exec(source);
  while (match) {
    targets.push(match[1]);
    match = pattern.exec(source);
  }
  return targets;
}

test("every link in the pages is absolute, so any mount path works", () => {
  for (const file of htmlFiles()) {
    const source = readFileSync(file, "utf8");
    for (const target of localTargets(source)) {
      if (target.startsWith("#") || target.startsWith("http") || target.startsWith("mailto:")) continue;
      assert.ok(
        target.startsWith("/"),
        `${path.basename(file)} links to '${target}'; use an absolute path`
      );
    }
  }
});

test("every local link points at a file that exists", () => {
  for (const file of htmlFiles()) {
    const source = readFileSync(file, "utf8");
    for (const target of localTargets(source)) {
      if (!target.startsWith("/")) continue;
      const filePath = path.join(root, target.split("#")[0].split("?")[0]);
      assert.ok(
        statSync(filePath, { throwIfNoEntry: false }),
        `${path.basename(file)} links to '${target}', which does not exist`
      );
    }
  }
});

test("the scripts build absolute links too", () => {
  for (const entry of readdirSync(webDirectory)) {
    if (!entry.endsWith(".js")) continue;
    const source = readFileSync(path.join(webDirectory, entry), "utf8");
    const relative = source.match(/href\s*=\s*["'`]\.\.?\/[^"'`]*["'`]/g) ?? [];
    assert.deepEqual(relative, [], `${entry} builds a relative link`);
  }
});

test("the Vercel configuration serves the editor at the root", () => {
  const config = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
  const rewrites = new Map(config.rewrites.map((rule) => [rule.source, rule.destination]));
  assert.equal(rewrites.get("/"), "/web/index.html");
  assert.equal(rewrites.get("/document"), "/web/document.html");
  assert.equal(rewrites.get("/docs"), "/web/docs.html");
  for (const destination of rewrites.values()) {
    assert.ok(
      statSync(path.join(root, destination), { throwIfNoEntry: false }),
      `the rewrite target '${destination}' does not exist`
    );
  }
});

test("the development server maps the root the same way", () => {
  const server = readFileSync(path.join(root, "tools", "serve.mjs"), "utf8");
  assert.match(server, /pathname === "\/"\) pathname = "\/web\/index\.html"/);
});
