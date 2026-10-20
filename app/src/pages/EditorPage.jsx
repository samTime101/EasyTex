import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compile } from "../lib/engine.js";
import { loadSource, saveSource } from "../lib/storage.js";
import { Header } from "../components/Header.jsx";
import { SourceEditor } from "../components/SourceEditor.jsx";
import { OutputTabs } from "../components/OutputTabs.jsx";
import { Diagnostics } from "../components/Diagnostics.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { useEditorZoom } from "../hooks/useEditorZoom.js";
import { ZoomControl } from "../components/ZoomControl.jsx";
import { EXPRESSION_EXAMPLES, DEFAULT_EXPRESSION_SOURCE } from "@ui/expression-examples.js";




const TABS = [
  { id: "preview", label: "Preview", controls: "preview" },
  { id: "latex", label: "LaTeX", controls: "code-output" },
  { id: "mathml", label: "MathML", controls: "code-output" },
  { id: "ast", label: "AST", controls: "code-output" }
];

function countNodes(node) {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((sum, item) => sum + countNodes(item), 0);
  let count = 1;
  for (const [key, value] of Object.entries(node)) {
    if (key === "span" || key === "callee" || key === "binding" || key === "type" || key === "reported") {
      continue;
    }
    if (value && typeof value === "object") count += countNodes(value);
  }
  return count;
}

function astForDisplay(ast) {
  return JSON.stringify(
    ast,
    (key, value) => (key === "span" || key === "reported" ? undefined : value),
    2
  );
}

export function EditorPage() {
  const [source, setSource] = useState(() => loadSource("easytex.source", DEFAULT_EXPRESSION_SOURCE));
  const [complex, setComplex] = useState(true);
  const [tab, setTab] = useState("preview");
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [maximized, setMaximized] = useState(false);
  const editorRef = useRef(null);
  const toast = useToast();
  const { zoom, zoomIn, zoomOut, reset: resetZoom } = useEditorZoom();

  const compileNow = useCallback(() => {
    if (!source.trim()) {
      setResult(null);
      setElapsed(0);
      return;
    }
    const started = performance.now();
    const next = compile(source, { complex });
    setElapsed(performance.now() - started);
    setResult(next);
  }, [complex, source]);

  useEffect(() => {
    const timer = setTimeout(compileNow, 160);
    return () => clearTimeout(timer);
  }, [compileNow]);

  useEffect(() => {
    saveSource("easytex.source", source);
  }, [source]);

  const diagnostics = result?.diagnostics ?? [];
  const hasErrors = Boolean(result && (diagnostics.length > 0 || !result.ast));
  const isEmpty = !source.trim();

  const codeText = useMemo(() => {
    if (!result) return "";
    if (tab === "latex") return result.latex ?? "";
    if (tab === "mathml") return result.mathml ?? "";
    if (tab === "ast") return result.ast ? astForDisplay(result.ast) : "";
    return result.latex ?? "";
  }, [result, tab]);

  const status = isEmpty ? "Empty" : hasErrors ? `${diagnostics.length} ${diagnostics.length === 1 ? "issue" : "issues"}` : "Valid";

  function selectDiagnostic(diagnostic) {
    const textarea = editorRef.current?.element();
    if (!textarea) return;
    const start = diagnostic.span?.start?.offset ?? 0;
    const end = diagnostic.span?.end?.offset ?? start;
    textarea.focus();
    textarea.setSelectionRange(start, Math.max(start, end));
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    const line = (diagnostic.span?.start?.line ?? 1) - 1;
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 2);
  }

  async function copyCurrent() {
    const text = codeText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.show(tab === "preview" ? "LaTeX copied" : `${tab} copied`);
    } catch {
      toast.show("Copied");
    }
  }

  function downloadTex() {
    if (!result?.latex) return;
    const body = `\\documentclass{article}
\\usepackage{amsmath,amssymb}
\\begin{document}
\\[
${result.latex}
\\]
\\end{document}
`;
    const blob = new Blob([body], { type: "text/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "easytex.tex";
    link.click();
    URL.revokeObjectURL(url);
    toast.show("Downloaded easytex.tex");
  }

  return (
    <>
      <Header
        subtitle="MathScript editor"
        nav={[
          { label: "Document writer", href: "/document" },
          { label: "Reference", href: "/docs" }
        ]}
      >
        <ZoomControl zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
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
            {EXPRESSION_EXAMPLES.map((example) => (
              <option key={example.source} value={example.source}>
                {example.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mode-toggle" title="Enable complex-number semantics for i">
          <input
            id="complex-mode"
            type="checkbox"
            checked={complex}
            onChange={(event) => setComplex(event.target.checked)}
          />
          <span>Complex mode</span>
        </label>
      </Header>

      <main className={maximized ? "workspace editor-expanded" : "workspace"}>
        <section className="panel editor-panel" aria-labelledby="editor-title">
          <div className="panel-head">
            <div>
              <h2 id="editor-title">MathScript</h2>
              <p className="panel-subtitle">Function-based notation with live validation</p>
            </div>
            <div className="panel-head-actions">
              <span
                id="status"
                className={hasErrors ? "status error" : "status"}
                data-state={isEmpty ? "empty" : hasErrors ? "error" : "valid"}
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
            ariaLabel="MathScript source"
            placeholder="sum(i, 1, n, i^2)"
            onRenderNow={compileNow}
            onZoom={(action) => {
              if (action === "in") zoomIn();
              if (action === "out") zoomOut();
              if (action === "reset") resetZoom();
            }}
            fontSize={zoom}
          />
          <Diagnostics diagnostics={diagnostics} onSelect={selectDiagnostic} />
        </section>

        <section className="panel preview-panel" aria-labelledby="preview-title">
          <div className="panel-head">
            <div>
              <h2 id="preview-title">Output</h2>
              <p className="panel-subtitle">Preview, LaTeX, MathML, and the parsed tree</p>
            </div>
            <div className="output-actions">
              <button
                id="copy"
                className="ghost-button"
                type="button"
                title="Copy the active output"
                disabled={hasErrors || isEmpty}
                onClick={copyCurrent}
              >
                Copy
              </button>
              <button
                id="download"
                className="ghost-button"
                type="button"
                title="Download a complete LaTeX file"
                aria-label="Download a complete LaTeX file"
                disabled={hasErrors || isEmpty}
                onClick={downloadTex}
              >
                TeX
              </button>
            </div>
          </div>
          <OutputTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="output-shell">
            {isEmpty ? (
              <div className="empty-state" id="empty-state">
                <span className="empty-mark" aria-hidden="true">
                  &#8730;
                </span>
                <p>Start typing a MathScript expression.</p>
                <p className="muted">
                  Try <code>frac(a, b)</code> or <code>sum(i, 1, n, i^2)</code>, or choose an example
                  above.
                </p>
              </div>
            ) : null}
            {hasErrors && !isEmpty ? (
              <div className="empty-state" id="empty-state">
                <span className="empty-mark error-mark" aria-hidden="true">
                  !
                </span>
                <p className="error-title">The expression is not valid yet.</p>
                <p className="muted">{diagnostics[0]?.message ?? "Unknown error"}</p>
                <p className="muted">Click a diagnostic below the editor to jump to it.</p>
              </div>
            ) : null}
            {!hasErrors && !isEmpty && tab === "preview" ? (
              <div
                id="preview"
                className="preview"
                role="tabpanel"
                dangerouslySetInnerHTML={{ __html: result?.mathml ?? "" }}
              />
            ) : null}
            {!hasErrors && !isEmpty && tab !== "preview" ? (
              <pre id="code-output" className="code-output" role="tabpanel">
                {codeText}
              </pre>
            ) : null}
          </div>
          <div className="preview-foot">
            <span>{result ? `${elapsed.toFixed(1)} ms` : ""}</span>
            <span>{result?.ast ? `${countNodes(result.ast)} AST nodes` : ""}</span>
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
