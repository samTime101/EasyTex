# Vendored libraries

The app is a static site with no build step for the pages in `web/`, so the
few browser libraries it uses are vendored here instead of being fetched from
a package registry or a content delivery network. Everything keeps working
offline.

## print-js 1.6.0

- File: `print-js.js` (UMD build of `dist/print.js`)
- License: MIT, see `print-js.LICENSE.txt`
- Source: https://github.com/eidellev/print-js

Used by the document writer to print the rendered sheet on its own: the
library copies the sheet into a hidden frame with the document's stylesheet and
the page geometry, so the print output is the document and not the editor
around it.

The library is loaded for its side effect — it defines `window.printJS` — and
is called through `printDocument()` in `web/print-document.js`.
