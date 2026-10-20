import { useTheme } from "../lib/theme.js";

export function Header({ subtitle, children }) {
  const [theme, toggleTheme] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="EasyTeX home">
        <span className="brand-mark" aria-hidden="true">
          &#8721;
        </span>
        <div>
          <h1>EasyTeX</h1>
          <p>{subtitle}</p>
        </div>
      </a>
      <div className="header-actions">
        {children}
        <a className="ghost-button" href="/document">
          Document writer
        </a>
        <a className="ghost-button" href="/docs">
          Reference
        </a>
        <button
          id="theme-toggle"
          className="icon-button"
          type="button"
          aria-label={`Switch to ${next} theme`}
          title={`Switch to ${next} theme`}
          onClick={toggleTheme}
        >
          {theme === "dark" ? "\u2600" : "\u263e"}
        </button>
      </div>
    </header>
  );
}
