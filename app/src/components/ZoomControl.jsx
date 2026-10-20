// The text size control of the editor.
//
// A− and A+ change the size of the source text, and the middle shows the
// current size. The keyboard shortcuts are Ctrl + - , Ctrl + = , and Ctrl + 0.

export function ZoomControl({ zoom, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="zoom-control" role="group" aria-label="Editor text size">
      <button
        className="panel-button zoom-button"
        type="button"
        title="Smaller text (Ctrl + -)"
        aria-label="Smaller text"
        onClick={onZoomOut}
      >
        A&minus;
      </button>
      <span className="zoom-size" aria-live="polite">
        {Math.round(zoom)}
      </span>
      <button
        className="panel-button zoom-button"
        type="button"
        title="Larger text (Ctrl + =)"
        aria-label="Larger text"
        onClick={onZoomIn}
      >
        A+
      </button>
      <button
        className="panel-button zoom-button"
        type="button"
        title="Reset the text size (Ctrl + 0)"
        aria-label="Reset the text size"
        onClick={onReset}
      >
        &#8634;
      </button>
    </div>
  );
}
