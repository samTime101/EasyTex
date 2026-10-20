import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

// The React host runs in a browser, so the frontend tests run in one too: a
// real DOM from jsdom, the real React renderer, and the real pages.
//
// The pages are JSX, so they are loaded through Vite — the same transform the
// build uses.

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/"
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);

if (!dom.window.matchMedia) {
  dom.window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  });
}

// React is loaded after the DOM exists: the renderer binds to the document it
// finds when it is first imported.
const { createElement, act } = await import("react");
const { createRoot } = await import("react-dom/client");

const vite = await createServer({
  configFile: new URL("../vite.config.js", import.meta.url).pathname,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

test.after(() => vite.close());

const { EditorPage } = await vite.ssrLoadModule("/src/pages/EditorPage.jsx");
const { WriterPage } = await vite.ssrLoadModule("/src/pages/WriterPage.jsx");
const { DocsPage } = await vite.ssrLoadModule("/src/pages/DocsPage.jsx");
const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
const { printDocument, pageGeometryCss } = await import("../ui/print-document.js");

// The editor compiles after a short delay, so the tests wait for it.
const COMPILE_DELAY = 300;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mount(Page) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Page));
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    }
  };
}

// React only sees a change when the value setter is bypassed, so the native
// setter is used the way a browser does it.
function type(textarea, value) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  act(() => {
    setter.call(textarea, value);
    textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    textarea.setSelectionRange(value.length, value.length);
  });
}

test("the expression editor renders the preview of the source", async () => {
  const view = mount(EditorPage);
  await wait(COMPILE_DELAY);
  const editor = view.container.querySelector("#editor");
  assert.equal(
    editor.value,
    "sum(i, 1, n, i^2)\nsum(i, 1, n, i^2) = frac(n*(n + 1)*(2*n + 1), 6)"
  );
  assert.ok(view.container.querySelector(".preview math"), "the preview shows MathML");
  assert.equal(view.container.querySelector("#status").textContent, "Valid");
  view.unmount();
});

test("the expression editor reports a broken source", async () => {
  const view = mount(EditorPage);
  const editor = view.container.querySelector("#editor");
  type(editor, "2x");
  await wait(COMPILE_DELAY);

  const diagnostic = view.container.querySelector(".diagnostic");
  assert.ok(diagnostic, "the diagnostic is listed");
  assert.match(diagnostic.textContent, /Implicit multiplication/);
  assert.equal(view.container.querySelector("#status").textContent, "1 issue");
  view.unmount();
});

test("the output tabs show the LaTeX of the expression", async () => {
  const view = mount(EditorPage);
  await wait(COMPILE_DELAY);
  const tabs = [...view.container.querySelectorAll(".tab")];
  assert.deepEqual(
    tabs.map((tab) => tab.textContent),
    ["Preview", "LaTeX", "MathML", "AST"]
  );
  act(() => {
    tabs[1].click();
  });
  assert.match(view.container.querySelector("#code-output").textContent, /\\sum/);
  view.unmount();
});

test("the document writer renders the sheet and its statistics", async () => {
  const view = mount(WriterPage);
  await wait(COMPILE_DELAY);
  const editor = view.container.querySelector("#editor");
  assert.match(editor.value, /^document\(\{/);
  assert.ok(view.container.querySelector("#sheet .ms-sheet"), "the sheet is rendered");
  assert.match(view.container.querySelector("#doc-stats").textContent, /section/);
  assert.match(view.container.querySelector("#page-info").textContent, /margins/);
  assert.match(view.container.querySelector("#template-label").textContent, /A4/);
  view.unmount();
});

test("the writer suggests the fields of the object around the caret", async () => {
  const view = mount(WriterPage);
  const editor = view.container.querySelector("#editor");
  act(() => {
    editor.focus();
  });
  type(editor, "document({ ti");
  await wait(150);

  const items = [...view.container.querySelectorAll(".autocomplete-item")];
  assert.equal(items.length, 1);
  assert.match(items[0].textContent, /^title/);
  assert.match(items[0].textContent, /field/i);
  view.unmount();
});

test("the reference page lists every section and filters them", () => {
  const view = mount(DocsPage);
  const sections = view.container.querySelectorAll(".docs-section");
  assert.ok(sections.length >= 20, "the reference has its sections");
  assert.ok(view.container.querySelectorAll(".function-card").length > 40, "and its cards");
  assert.ok(
    view.container.querySelectorAll(".docs-content [class^='tok-']").length > 100,
    "highlighted samples"
  );

  const search = view.container.querySelector("#docs-search");
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(search, "sqrt");
    search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });

  const visibleCards = [...view.container.querySelectorAll(".function-card")].filter(
    (card) => !card.closest(".docs-section").hidden
  );
  assert.ok(visibleCards.length >= 1, "the search keeps the matching cards");
  assert.ok(visibleCards.length < 40, "and hides the rest");
  view.unmount();
});

test("the mode switch takes you from either editor to the other", () => {
  const editor = mount(EditorPage);
  const editorTabs = [...editor.container.querySelectorAll(".mode-tabs a")];
  assert.deepEqual(
    editorTabs.map((tab) => tab.textContent),
    ["Expression", "Document"]
  );
  assert.equal(editorTabs[0].getAttribute("aria-current"), "page", "the current mode is marked");
  assert.equal(editorTabs[1].getAttribute("aria-current"), null);
  assert.equal(editorTabs[1].getAttribute("href"), "/document", "the other mode is one click away");
  assert.ok(
    [...editor.container.querySelectorAll(".header-actions a")].some(
      (link) => link.getAttribute("href") === "/docs"
    ),
    "and the reference is still a link"
  );
  editor.unmount();

  const writer = mount(WriterPage);
  const writerTabs = [...writer.container.querySelectorAll(".mode-tabs a")];
  assert.equal(writerTabs[0].getAttribute("href"), "/");
  assert.equal(writerTabs[1].getAttribute("aria-current"), "page", "the current mode is marked");
  writer.unmount();
});

test("the writer fills the window and the maximize button toggles the layout", async () => {
  window.history.pushState(null, "", "/document");
  const view = mount(App);
  await wait(COMPILE_DELAY);

  assert.equal(
    document.body.classList.contains("writer-body"),
    true,
    "the writer body fills the window"
  );

  const button = view.container.querySelector("#editor-size");
  act(() => button.click());
  const workspace = view.container.querySelector(".workspace");
  assert.ok(workspace.classList.contains("editor-expanded"), "the editor takes the whole width");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.equal(button.textContent, "Restore");

  act(() => button.click());
  assert.ok(!workspace.classList.contains("editor-expanded"), "and back again");
  assert.equal(button.getAttribute("aria-pressed"), "false");

  view.unmount();
  window.history.pushState(null, "", "/");
});

test("the text size of the editor can be changed", async () => {
  dom.window.localStorage.removeItem("easytex.zoom");
  const view = mount(EditorPage);
  await wait(COMPILE_DELAY);

  const editor = view.container.querySelector("#editor");
  const smaller = view.container.querySelector('[aria-label="Smaller text"]');
  const larger = view.container.querySelector('[aria-label="Larger text"]');
  const reset = view.container.querySelector('[aria-label="Reset the text size"]');
  assert.ok(smaller && larger && reset, "the size control is there");
  assert.equal(editor.style.fontSize, "14.5px", "the default size");

  act(() => larger.click());
  assert.equal(editor.style.fontSize, "15.5px", "the text grows");

  act(() => smaller.click());
  assert.equal(editor.style.fontSize, "14.5px", "and shrinks again");

  act(() => {
    editor.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "=",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
    );
  });
  assert.equal(editor.style.fontSize, "15.5px", "Ctrl + = grows the text");

  act(() => {
    editor.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "0",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
    );
  });
  assert.equal(editor.style.fontSize, "14.5px", "Ctrl + 0 resets it");

  view.unmount();
  dom.window.localStorage.removeItem("easytex.zoom");
});

test("the print helper sends the sheet and the page geometry to print-js", () => {
  const calls = [];
  dom.window.printJS = (options) => calls.push(options);

  const doc = {
    page: {
      widthMm: 210,
      heightMm: 297,
      margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" }
    }
  };
  const geometry = pageGeometryCss(doc);
  assert.match(geometry, /@page/);
  assert.match(geometry, /size: 210mm 297mm/);
  assert.match(geometry, /margin: 25mm 25mm 25mm 25mm/);

  const sheet = document.createElement("div");
  const printable = document.createElement("div");
  printable.className = "ms-sheet";
  sheet.append(printable);

  const printed = printDocument({
    sheet,
    doc,
    sheetCss: ".ms-sheet { color: #000; }",
    title: "Note"
  });
  assert.equal(printed, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].printable, printable);
  assert.equal(calls[0].documentTitle, "Note");
  assert.equal(calls[0].type, "html");
  assert.match(calls[0].style, /@page/);
  assert.match(calls[0].style, /\.ms-sheet/);

  assert.equal(printDocument({ sheet: null }), false);
});
