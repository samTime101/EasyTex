import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileDocument, parseLength, renderStandaloneHTML, SHEET_CSS } from "../lib/engine.js";
import { loadSource, saveSource } from "../lib/storage.js";
import { resolveImageSources } from "../lib/engine.js";
import { Header } from "../components/Header.jsx";
import { SourceEditor } from "../components/SourceEditor.jsx";
import { OutputTabs } from "../components/OutputTabs.jsx";
import { Diagnostics } from "../components/Diagnostics.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { DEFAULT_DOCUMENT_SOURCE, DOCUMENT_EXAMPLES } from "@web/document-examples.js";

const STORAGE_KEY = "easytex.document";
const WRITER_KINDS = ["component", "function", "constant"];
const HOVER_KINDS = [...WRITER_KINDS, "symbol", "field"];
const DEFAULT_SUBTITLE = "Rendered document, LaTeX, and standalone HTML";

const TABS = [
  { id: "document", label: "Document", controls: "doc-preview" },
  { id: "latex", label: "LaTeX", controls: "code-output" },
  { id: "html", label: "HTML", controls: "code-output" }
];

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function statsText(doc) {
  const stats = doc.stats;
  const parts = [];
  if (stats.sections) parts.push(plural(stats.sections, "section"));
  if (stats.equations) parts.push(plural(stats.equations, "equation"));
  if (stats.figures) parts.push(plural(stats.figures, "figure"));
  if (stats.tables) parts.push(plural(stats.tables, "table"));
  if (stats.listings) parts.push(plural(stats.listings, "listing"));
  if (stats.theorems) parts.push(plural(stats.theorems, "result"));
  if (stats.citations) parts.push(plural(stats.citations, "citation"));
  if (doc.bibliography.length) parts.push(plural(doc.bibliography.length, "reference"));
  return parts.join(" · ");
}

function pageText(doc) {
  const margins = doc.page.margins;
  const same =
    margins.top === margins.right &&
    margins.right === margins.bottom &&
    margins.bottom === margins.left;
  const margin = same
    ? `${margins.top} margins`
    : `margins ${margins.top}/${margins.right}/${margins.bottom}/${margins.left}`;
  return doc.page.columns > 1 ? `${margin} · ${doc.page.columns} columns` : margin;
}

function slug(text) {
  const slugged = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slugged || "easytex-document";
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function WriterPage() {
  const [source, setSource] = useState(() => loadSource(STORAGE_KEY, DEFAULT_DOCUMENT_SOURCE));
  const [tab, setTab] = useState("document");
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [maximized, setMaximized] = useState(false);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const sheetRef = useRef(null);
  const toast = useToast();

  const compileNow = useCallback(() => {
    if (!source.trim()) {
      setResult(null);
      setElapsed(0);
      return;
    }
    const started = performance.now();
    const next = compileDocument(source, { complex: true });
    setElapsed(performance.now() - started);
    setResult(next);
  }, [source]);

  useEffect(() => {
    const timer = setTimeout(compileNow, 160);
    return () => clearTimeout(timer);
  }, [compileNow]);

  useEffect(() => {
    saveSource(STORAGE_KEY, source);
  }, [source]);

  const diagnostics = result?.diagnostics ?? [];
  const errors = diagnostics.filter((entry) => entry.severity !== "warning");
  const warnings = diagnostics.filter((entry) => entry.severity === "warning");
  const hasErrors = errors.length > 0;

  const doc = result?.document ?? null;
  const html = result?.html ?? null;
  const latex = result?.latex ?? null;
  const standalone = useMemo(() => {
    if (!html) return null;
    return renderStandaloneHTML({
      title: doc?.metadata.titleText || "MathScript document",
      html,
      language: doc?.metadata.language || "en"
    });
  }, [doc, html]);

  // The preview keeps the last valid sheet while the source has errors.
  const [lastGood, setLastGood] = useState(null);
  useEffect(() => {
    if (html && doc) setLastGood({ html, doc, latex, standalone });
  }, [doc, html, latex, standalone]);

  const shown = hasErrors && lastGood ? lastGood : { html, doc, latex, standalone };
  const isStale = Boolean(hasErrors && lastGood);

  // Images in the sheet keep the path from the source; the writer resolves a
  // relative path against the app.
  const sheetRefCallback = useCallback((node) => {
    sheetRef.current = node;
    if (node && shown.html) {
      node.innerHTML = shown.html;
      resolveImageSources(node);
    }
  }, [shown.html]);

  // The sheet is scaled to the width of the preview column.
  useEffect(() => {
    const preview = previewRef.current;
    const mount = sheetRef.current;
    if (!preview || !mount) return undefined;
    const fit = () => {
      const sheet = mount.firstElementChild;
      if (!sheet) return;
      const available = preview.clientWidth - 52;
      if (available <= 0) return;
      const declared = parseLength(getComputedStyle(sheet).getPropertyValue("--ms-page-width"));
      const pageWidth = declared.ok ? declared.px : sheet.offsetWidth;
      const zoom = available / pageWidth;
      sheet.style.zoom = zoom < 0.99 && zoom >= 0.45 ? zoom.toFixed(3) : "";
    };
    fit();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(fit);
      observer.observe(preview);
      return () => observer.disconnect();
    }
    return undefined;
  }, [shown.html]);

  // The printed page uses the document's own page size and margins.
  useEffect(() => {
    if (!shown.doc) return;
    const toMm = (value) => {
      const parsed = parseLength(value ?? "");
      return parsed.ok ? `${parsed.mm}mm` : "20mm";
    };
    const margins = shown.doc.page.margins;
    const style = document.getElementById("print-page") ?? document.createElement("style");
    style.id = "print-page";
    style.textContent = [
      "@page {",
      `  size: ${shown.doc.page.widthMm}mm ${shown.doc.page.heightMm}mm;`,
      `  margin: ${toMm(margins.top)} ${toMm(margins.right)} ${toMm(margins.bottom)} ${toMm(margins.left)};`,
      "}"
    ].join("\n");
    if (!style.isConnected) document.head.append(style);
  }, [shown.doc]);

  // The sheet carries its own stylesheet, shared with the HTML export.
  useEffect(() => {
    const style = document.getElementById("sheet-styles") ?? document.createElement("style");
    style.id = "sheet-styles";
    style.textContent = SHEET_CSS;
    if (!style.isConnected) document.head.append(style);
  }, []);

  function selectDiagnostic(entry) {
    const textarea = editorRef.current?.element();
    if (!textarea) return;
    textarea.focus();
    if (!entry.span) return;
    const start = entry.span.start?.offset ?? 0;
    const end = entry.span.end?.offset ?? start;
    textarea.setSelectionRange(start, Math.max(start, end));
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    const line = (entry.span.start?.line ?? 1) - 1;
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 2);
  }

  function currentText() {
    if (tab === "latex") return shown.latex ?? "";
    return shown.standalone ?? "";
  }

  async function copyCurrent() {
    const text = currentText();
    if (!text) {
      toast.show("Nothing to copy yet");
      return;
    }
    const what = tab === "latex" ? "LaTeX" : "HTML";
    try {
      await navigator.clipboard.writeText(text);
      toast.show(`${what} copied`);
    } catch {
      toast.show("Copied");
    }
  }

  function downloadTex() {
    if (!shown.latex) {
      toast.show("LaTeX export is unavailable while the document has errors");
      return;
    }
    const name = `${slug(shown.doc?.metadata.titleText)}.tex`;
    download(name, shown.latex, "text/x-tex;charset=utf-8");
    toast.show(`Downloaded ${name}`);
  }

  function downloadHtml() {
    if (!shown.standalone) {
      toast.show("HTML export is unavailable while the document has errors");
      return;
    }
    const name = `${slug(shown.doc?.metadata.titleText)}.html`;
    download(name, shown.standalone, "text/html;charset=utf-8");
    toast.show(`Downloaded ${name}`);
  }

  function printDocument() {
    if (!shown.html) {
      toast.show("Nothing to print yet");
      return;
    }
    if (tab !== "document") setTab("document");
    window.print();
  }

  const status = !source.trim()
    ? "Empty"
    : hasErrors
      ? `${errors.length} ${errors.length === 1 ? "error" : "errors"}${warnings.length ? `, ${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}` : ""}`
      : warnings.length
        ? `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`
        : "Valid";

  const codeText =
    tab === "latex"
      ? (shown.latex ?? "% The LaTeX export is unavailable while the document has errors.")
      : (shown.standalone ?? "<!-- The HTML export is unavailable while the document has errors. -->");

  return (
    <>
      <Header subtitle="Document writer">
        <label className="example-picker">
          <span>Examples</span>
          <select
            id="examples"
            value=""
            onChange={(event) => {
              const chosen = event.target.value;
              if (!chosen) return;
              setSource(chosen);
              editorRef.current?.focus();
            }}
          >
            <option value="">Choose an example…</option>
            {DOCUMENT_EXAMPLES.map((example) => (
              <option key={example.source} value={example.source}>
                {example.label}
              </option>
            ))}
          </select>
        </label>
      </Header>

      <main className={`workspace writer-workspace${maximized ? " editor-expanded" : ""}`}>
        <section className="panel editor-panel" aria-labelledby="doc-editor-title">
          <div className="panel-head">
            <div>
              <h2 id="doc-editor-title">Document</h2>
              <p className="panel-subtitle">{"document({ ... })"} with sections, equations, and references</p>
            </div>
            <div className="panel-head-actions">
              <span
                id="status"
                className={hasErrors ? "status error" : "status"}
                data-state={!source.trim() ? "empty" : hasErrors ? "error" : "valid"}
                aria-live="polite"
              >
                {status}
              </span>
              <button
                id="format-source"
                className="panel-button"
                type="button"
                title="Re-indent the source (Shift + Alt + F)"
                onClick={() => {
                  editorRef.current?.format();
                  editorRef.current?.focus();
                }}
              >
                Format
              </button>
              <button
                id="editor-size"
                className="panel-button"
                type="button"
                aria-pressed={maximized}
                title={maximized ? "Show the output pane again" : "Let the editor use the full page width"}
                onClick={() => setMaximized((current) => !current)}
              >
                {maximized ? "Restore" : "Maximize"}
              </button>
            </div>
          </div>
          <SourceEditor
            ref={editorRef}
            value={source}
            onChange={setSource}
            ariaLabel="MathScript document source"
            placeholder='document({ type: "article", content: [ text("Hello") ] })'
            autocompleteKinds={WRITER_KINDS}
            hoverKinds={HOVER_KINDS}
            contextual
            maxItems={20}
            onRenderNow={compileNow}
          />
          <Diagnostics diagnostics={diagnostics} onSelect={selectDiagnostic} />
        </section>

        <section className="panel preview-panel" aria-labelledby="doc-preview-title">
          <div className="panel-head">
            <div>
              <h2 id="doc-preview-title">Output</h2>
              <p className="panel-subtitle" id="template-label">
                {shown.doc
                  ? `${shown.doc.template.label} · ${shown.doc.page.size} ${shown.doc.page.orientation}`
                  : DEFAULT_SUBTITLE}
              </p>
            </div>
            <div className="output-actions">
              <button
                id="copy"
                className="ghost-button"
                type="button"
                title="Copy the active output"
                disabled={!shown.latex && !shown.standalone}
                onClick={copyCurrent}
              >
                Copy
              </button>
              <button
                id="print"
                className="ghost-button"
                type="button"
                title="Print the document or save it as PDF"
                disabled={!shown.html}
                onClick={printDocument}
              >
                Print / PDF
              </button>
              <button
                id="download-html"
                className="ghost-button"
                type="button"
                title="Download a standalone HTML document"
                disabled={!shown.standalone}
                onClick={downloadHtml}
              >
                Download .html
              </button>
              <button
                id="download"
                className="ghost-button"
                type="button"
                title="Download a complete LaTeX file"
                disabled={!shown.latex}
                onClick={downloadTex}
              >
                Download .tex
              </button>
            </div>
          </div>
          <OutputTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="output-shell writer-output">
            <div
              id="doc-preview"
              className={tab === "document" ? "doc-preview" : "doc-preview hidden"}
              role="tabpanel"
              ref={previewRef}
            >
              <div id="sheet" className="sheet-mount" ref={sheetRefCallback} />
              {isStale ? (
                <div id="stale-notice" className="stale-notice" role="status">
                  {hasErrors
                    ? "Preview shows the last valid version — fix the diagnostics to update it."
                    : "Preview shows the last valid version."}
                </div>
              ) : null}
            </div>
            {tab !== "document" ? (
              <pre id="code-output" className="code-output" role="tabpanel">
                {codeText}
              </pre>
            ) : null}
            {tab === "document" && !shown.html ? (
              <div className="empty-state" id="empty-state">
                <span className="empty-mark" aria-hidden="true">
                  &#8721;
                </span>
                {hasErrors ? (
                  <>
                    <p className="error-title">The document is not valid yet.</p>
                    <p className="muted">{errors[0]?.message ?? "Unknown error"}</p>
                    <p className="muted">Click a diagnostic below the editor to jump to it.</p>
                  </>
                ) : (
                  <>
                    <p>Start writing a document.</p>
                    <p className="muted">
                      Every document is one <code>{"document({ ... })"}</code> call. Try an example, or
                      read the{" "}
                      <a href="/docs#document-authoring">document authoring guide</a>.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <div className="preview-foot">
            <span>{result ? `${elapsed.toFixed(1)} ms` : ""}</span>
            <span id="doc-stats">{shown.doc ? statsText(shown.doc) : ""}</span>
            <span id="page-info">{shown.doc ? pageText(shown.doc) : ""}</span>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>EasyTeX · MathScript 0.1-draft</span>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <a href="/SPECIFICATION.md">Language specification</a>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <a href="/">Expression editor</a>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <span>
          <kbd>Ctrl</kbd> + <kbd>Space</kbd> for suggestions
        </span>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <span>
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to re-render
        </span>
        <span className="dot" aria-hidden="true">
          &#183;
        </span>
        <span>
          <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd> to format
        </span>
      </footer>
      {toast.node}
    </>
  );
}
