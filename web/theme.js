export function initTheme(toggle) {
  function set(theme) {
    document.documentElement.dataset.theme = theme;

    const nextTheme = theme === "dark" ? "light" : "dark";
    const label = `Switch to ${nextTheme} theme`;
    if (toggle) {
      // Show the theme the button will switch to.
      toggle.textContent = theme === "dark" ? "\u2600" : "\u263e";
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === "dark" ? "#050505" : "#f4f1e8";

    try {
      localStorage.setItem("easytex.theme", theme);
    } catch {
      // Storage may be unavailable; the page still works.
    }
  }

  let stored = null;
  try {
    stored = localStorage.getItem("easytex.theme");
  } catch {
    // Ignore storage failures.
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  set(stored || (prefersDark ? "dark" : "light"));

  toggle?.addEventListener("click", () => {
    set(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  return { set };
}
