// Document templates and page geometry.
//
// A template supplies the defaults that make a document a report, an
// article, a book, and so on: heading numbering, a table of contents, and
// the LaTeX document class used by the exporter. Templates never change
// the meaning of a mathematical expression.

export const TEMPLATES = {
  article: {
    name: "article",
    label: "Article",
    summary: "A short, self-contained paper. Numbered sections, no table of contents.",
    numbered: true,
    toc: false,
    abstract: false,
    latexClass: "article"
  },
  report: {
    name: "report",
    label: "Report",
    summary: "A longer report with a table of contents and numbered sections.",
    numbered: true,
    toc: true,
    abstract: true,
    latexClass: "report"
  },
  academic_report: {
    name: "academic_report",
    label: "Academic report",
    summary: "A course-style report: title page, abstract, table of contents.",
    numbered: true,
    toc: true,
    abstract: true,
    latexClass: "article"
  },
  thesis: {
    name: "thesis",
    label: "Thesis",
    summary: "A thesis or dissertation: abstract, contents, numbered chapters.",
    numbered: true,
    toc: true,
    abstract: true,
    latexClass: "report"
  },
  book: {
    name: "book",
    label: "Book",
    summary: "A book: front matter, contents, numbered chapters.",
    numbered: true,
    toc: true,
    abstract: true,
    latexClass: "book"
  },
  presentation: {
    name: "presentation",
    label: "Presentation",
    summary: "Slides in landscape orientation. Unnumbered headings, no contents.",
    numbered: false,
    toc: false,
    abstract: false,
    latexClass: "article",
    page: { orientation: "landscape" },
    note: "Slide-by-slide rendering is not implemented yet; the presentation template renders as a landscape document."
  },
  technical_document: {
    name: "technical_document",
    label: "Technical document",
    summary: "A manual or technical specification with a table of contents.",
    numbered: true,
    toc: true,
    abstract: false,
    latexClass: "article"
  },
  letter: {
    name: "letter",
    label: "Letter",
    summary: "A letter. Unnumbered headings, no contents, and a compact heading block.",
    numbered: false,
    toc: false,
    abstract: false,
    latexClass: "article",
    letter: true,
    note: "Letter-specific LaTeX layout is not implemented yet; the exporter emits a plain article."
  }
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// Page sizes in millimetres.
export const PAGE_SIZES = {
  A3: { width: 297, height: 420, latex: "a3paper" },
  A4: { width: 210, height: 297, latex: "a4paper" },
  A5: { width: 148, height: 210, latex: "a5paper" },
  LETTER: { width: 215.9, height: 279.4, latex: "letterpaper" },
  LEGAL: { width: 215.9, height: 355.6, latex: "legalpaper" }
};

export const DEFAULT_PAGE = {
  size: "A4",
  orientation: "portrait",
  margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" },
  columns: 1
};

const MM_PER_UNIT = {
  mm: 1,
  cm: 10,
  in: 25.4,
  pt: 25.4 / 72,
  px: 25.4 / 96
};

export function normalizeSizeName(value) {
  const key = String(value).trim().toUpperCase();
  if (key === "LETTER") return "LETTER";
  if (key === "LEGAL") return "LEGAL";
  return key;
}

/**
 * Parse a CSS-like length used by page geometry.
 * Returns { ok: true, amount, unit, mm, px } or { ok: false, reason }.
 */
export function parseLength(value) {
  if (typeof value !== "string") {
    return { ok: false, reason: "a length must be written as a string such as \"25mm\"" };
  }
  const match = /^\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|pt|px)?\s*$/i.exec(value);
  if (!match) {
    return { ok: false, reason: `'${value}' is not a valid length; use mm, cm, in, pt, or px` };
  }
  const amount = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  const mm = amount * MM_PER_UNIT[unit];
  return { ok: true, amount, unit, mm, px: (mm * 96) / 25.4 };
}

/**
 * Parse a figure or image width, which may additionally be a percentage.
 * Returns { ok: true, percent } or { ok: true, ...length }, or { ok: false, reason }.
 */
export function parseDimension(value) {
  if (typeof value !== "string") {
    return { ok: false, reason: "a dimension must be written as a string such as \"80%\" or \"100mm\"" };
  }
  const percent = /^\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(value);
  if (percent) {
    const amount = Number(percent[1]);
    if (amount <= 0 || amount > 100) {
      return { ok: false, reason: `'${value}' must be between 0% and 100%` };
    }
    return { ok: true, percent: amount };
  }
  return parseLength(value);
}

export function mmToPx(mm) {
  return (mm * 96) / 25.4;
}

/**
 * Resolve a page configuration into pixel geometry for the preview and
 * millimetre geometry for the LaTeX exporter.
 */
export function resolvePage(page = {}) {
  const sizeName = normalizeSizeName(page.size ?? DEFAULT_PAGE.size);
  const size = PAGE_SIZES[sizeName] ?? PAGE_SIZES.A4;
  const orientation = page.orientation === "landscape" ? "landscape" : "portrait";
  const widthMm = orientation === "landscape" ? size.height : size.width;
  const heightMm = orientation === "landscape" ? size.width : size.height;

  const margins = {
    top: page.margins?.top ?? DEFAULT_PAGE.margins.top,
    right: page.margins?.right ?? DEFAULT_PAGE.margins.right,
    bottom: page.margins?.bottom ?? DEFAULT_PAGE.margins.bottom,
    left: page.margins?.left ?? DEFAULT_PAGE.margins.left
  };

  return {
    size: sizeName,
    sizeLatex: size.latex,
    orientation,
    widthMm,
    heightMm,
    widthPx: mmToPx(widthMm),
    heightPx: mmToPx(heightMm),
    margins,
    columns: page.columns ?? DEFAULT_PAGE.columns,
    supported: PAGE_SIZES[sizeName] !== undefined
  };
}
