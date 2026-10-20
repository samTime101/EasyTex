import { useTheme } from "../lib/theme.js";

export function Header({ subtitle, nav = [], children }) {
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
        {nav.map((item) => (
          <a className="ghost-button" href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
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
