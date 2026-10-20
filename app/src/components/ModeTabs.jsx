// The mode switch.
//
// The two editors are the same app with a different mode, so the switch lives
// in the header of both. It is a pair of links, not buttons: the URL still
// says which mode you are in, and the link can be opened in a new tab.

const MODES = [
  { id: "editor", label: "Expression", href: "/" },
  { id: "document", label: "Document", href: "/document" }
];

export function ModeTabs({ mode }) {
  return (
    <nav className="mode-tabs" aria-label="Editor mode">
      {MODES.map((item) => {
        const active = item.id === mode;
        return (
          <a
            key={item.id}
            href={item.href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
