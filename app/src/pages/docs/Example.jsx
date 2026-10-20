import { compile } from "../../lib/engine.js";
import { copyText } from "../../lib/copy.js";
import { HighlightedCode } from "../../components/HighlightedCode.jsx";

// One worked example: the source, a copy button, a link that opens it in the
// editor or the writer, and the typeset result.
export function Example({ example, documentExample = false }) {
  const result = documentExample ? null : compile(example.source);
  const preview =
    result && result.diagnostics.length === 0 && result.mathml ? (
      <div
        className="example-preview"
        dangerouslySetInnerHTML={{ __html: result.mathml }}
      />
    ) : (
      <div className="example-preview">
        <span className="example-error">
          {result?.diagnostics?.[0]?.message ?? "Render error"}
        </span>
      </div>
    );

  return (
    <div className="example">
      <div className="example-head">
        <span className="example-note">{example.note ?? "Example"}</span>
        <div className="example-actions">
          <button
            type="button"
            className="mini-button"
            onClick={() => copyText(example.source, "Example copied")}
          >
            Copy
          </button>
          <a
            className="mini-button"
            href={
              documentExample
                ? `/document#src=${encodeURIComponent(example.source)}`
                : `/#src=${encodeURIComponent(example.source)}`
            }
          >
            {documentExample ? "Open in writer" : "Try it"}
          </a>
        </div>
      </div>
      <div className={documentExample ? "example-body document-example-body" : "example-body"}>
        <HighlightedCode as="pre" className="example-source" source={example.source} />
        {documentExample ? null : preview}
      </div>
    </div>
  );
}
