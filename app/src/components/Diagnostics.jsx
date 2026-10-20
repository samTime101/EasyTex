export function Diagnostics({ diagnostics, onSelect }) {
  if (!diagnostics.length) {
    return <div className="diagnostics" aria-live="polite" />;
  }
  return (
    <div className="diagnostics" aria-live="polite">
      {diagnostics.map((diagnostic, index) => (
        <button
          type="button"
          className="diagnostic"
          key={`${diagnostic.category}:${index}`}
          title="Select this range in the editor"
          onClick={() => onSelect(diagnostic)}
        >
          <span className="tag">{diagnostic.category}</span>
          <span className="message">{diagnostic.message}</span>
          <span className="where">
            {diagnostic.span?.start?.line ?? 1}:{diagnostic.span?.start?.column ?? 1}
          </span>
        </button>
      ))}
    </div>
  );
}
