import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveImageSources, APP_ROOT } from "../ui/asset-paths.js";

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

test("the React app is the only user interface", () => {
  for (const page of ["index.html", "document.html", "docs.html", "app.js", "document.js", "docs.js"]) {
    assert.equal(
      existsSync(path.join(root, "ui", page)),
      false,
      `the old static page '${page}' is gone`
    );
  }
  assert.ok(existsSync(path.join(appDirectory, "index.html")), "the app has an entry point");
});

test("every link in the app is absolute, so any mount path works", () => {
  for (const file of filesIn(appDirectory)) {
    if (!file.endsWith(".jsx") && !file.endsWith(".js")) continue;
    const source = readFileSync(file, "utf8");
    const relative = source.match(/href=["'`](\.\.?\/[^"'`]*)["'`]/g) ?? [];
    assert.deepEqual(relative, [], `${path.relative(root, file)} links relatively`);
  }
});

test("the Vercel configuration builds the app and routes every path to it", () => {
  const config = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "dist");
  const rewrites = new Map(config.rewrites.map((rule) => [rule.source, rule.destination]));
  assert.equal(rewrites.get("/(.*)"), "/index.html");
});

test("relative image paths resolve against the app, not the current URL", () => {
  function fakeImage(source) {
    const attributes = { "data-ms-src": source, src: source };
    return {
      getAttribute: (name) => attributes[name],
      setAttribute: (name, value) => {
        attributes[name] = value;
      },
      attributes
    };
  }

  function resolve(source) {
    const image = fakeImage(source);
    resolveImageSources({ querySelectorAll: () => [image] });
    return image.attributes.src;
  }

  assert.equal(APP_ROOT, "/ui/");
  assert.equal(resolve("assets/sum-of-squares.svg"), "/ui/assets/sum-of-squares.svg");
  assert.equal(resolve("./assets/sum-of-squares.svg"), "/ui/assets/sum-of-squares.svg");
  assert.equal(resolve("/already/absolute.svg"), "/already/absolute.svg");
  assert.equal(resolve("https://example.com/a.svg"), "https://example.com/a.svg");
  assert.equal(resolve("data:image/svg+xml;base64,AA"), "data:image/svg+xml;base64,AA");
});

test("the bundled example image exists in the app directory", () => {
  assert.ok(
    existsSync(path.join(root, "ui", "assets", "sum-of-squares.svg")),
    "the writer example needs its image"
  );
});
