import { useEffect, useRef } from "react";
import { useTheme } from "../lib/theme.js";
import { ModeTabs } from "./ModeTabs.jsx";

export function Header({ subtitle, nav = [], mode = null, children }) {
  const [theme, toggleTheme] = useTheme();
  const headerRef = useRef(null);
  const next = theme === "dark" ? "light" : "dark";

  // The header keeps a hairline once the page scrolls under it.
  useEffect(() => {
    const onScroll = () => {
      headerRef.current?.classList.toggle("is-stuck", window.scrollY > 4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="app-header" ref={headerRef}>
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
        {mode ? <ModeTabs mode={mode} /> : null}
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
