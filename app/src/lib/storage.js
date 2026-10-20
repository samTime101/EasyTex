// Editor state that survives a reload.
//
// The source is kept in localStorage, and a link may carry a source in the
// hash: /#src=<encoded MathScript>. The static pages behave the same way, so
// a link works in either host.

export function loadSource(key, fallback) {
  const hash = window.location.hash;
  if (hash.startsWith("#src=")) {
    try {
      const source = decodeURIComponent(hash.slice(5));
      history.replaceState(null, "", window.location.pathname + window.location.search);
      if (source.trim()) return source;
    } catch {
      // Fall through to the stored source on a malformed hash.
    }
  }
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function saveSource(key, source) {
  try {
    localStorage.setItem(key, source);
  } catch {
    // Storage may be unavailable; editing still works.
  }
}
