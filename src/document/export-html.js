// Standalone HTML export: one self-contained file with the rendered
// document and the shared sheet stylesheet embedded.

import { SHEET_CSS } from "./styles.js";

function escapeAttribute(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderStandaloneHTML({ title, html, language = "en" }) {
  return `<!doctype html>
<html lang="${escapeAttribute(language || "en")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeAttribute(title || "MathScript document")}</title>
    <style>${SHEET_CSS}
html, body { margin: 0; padding: 0; background: #e8e6e1; }
body { padding: 28px 16px; }
.ms-image-missing { font-family: ui-monospace, monospace; }
@media print { body { padding: 0; background: #fff; } }
    </style>
  </head>
  <body>
${html}
  </body>
</html>
`;
}
