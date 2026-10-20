// Print the rendered sheet on its own.
//
// print-js copies the sheet into a hidden frame, adds the document's own
// stylesheet and the page geometry, and hands that frame to the browser's
// print dialog. The output is the document and not the editor around it, and
// the browser's "Save as PDF" produces a vector copy of the mathematics.
//
// The library is vendored in web/vendor/ because the static pages have no
// build step; see web/vendor/README.md.

import "./vendor/print-js.js";
import { parseLength } from "../src/engine.js";

// The @page rule that gives the printed sheet its real paper size and
// margins.
export function pageGeometryCss(doc) {
  if (!doc?.page) return "";
  const toMm = (value) => {
    const parsed = parseLength(value ?? "");
    return parsed.ok ? `${parsed.mm}mm` : "20mm";
  };
  const margins = doc.page.margins;
  return [
    "@page {",
    `  size: ${doc.page.widthMm}mm ${doc.page.heightMm}mm;`,
    `  margin: ${toMm(margins.top)} ${toMm(margins.right)} ${toMm(margins.bottom)} ${toMm(margins.left)};`,
    "}"
  ].join("\n");
}

// Print the sheet. Returns false when there is nothing to print.
export function printDocument({ sheet, doc, sheetCss, title }) {
  const printable = sheet?.firstElementChild ?? sheet;
  if (!printable) return false;

  if (typeof window.printJS !== "function") {
    // The library is missing: fall back to the browser's own print dialog.
    window.print();
    return false;
  }

  window.printJS({
    printable,
    documentTitle: title ?? "EasyTeX document",
    style: [sheetCss ?? "", pageGeometryCss(doc)].join("\n"),
    type: "html"
  });
  return true;
}
