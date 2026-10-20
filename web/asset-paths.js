// Where the web app keeps its own files.
//
// The engine renders an image with the path the source wrote, because that
// path belongs to the document. The host resolves it against the app, so a
// document shows the same picture wherever the site is mounted: at
// /web/document.html, at /document, or behind any other path a host maps.
//
// Every page in the app is served from the same directory, so the app root is
// a constant. A host that mounts the app elsewhere changes it here.

export const APP_ROOT = "/web/";

export function resolveImageSources(root, base = APP_ROOT) {
  if (!root) return;
  for (const image of root.querySelectorAll("img[data-ms-src]")) {
    const source = image.getAttribute("data-ms-src") ?? "";
    if (!source) continue;
    if (source.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(source)) continue;
    image.setAttribute("src", `${base}${source.replace(/^\.\//, "")}`);
  }
}
