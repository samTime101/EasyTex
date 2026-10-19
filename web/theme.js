export function initTheme(toggle) {
  function set(theme) {
    document.documentElement.dataset.theme = theme;
    if (toggle) toggle.textContent = theme === "dark" ? "\u263e" : "\u2600";
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
