// HTML renderer for the MathScript document tree.
//
// The renderer never changes mathematical meaning: expressions are rendered
// with the shared MathML renderer, and all text is escaped. Every block and
// inline node kind produced by src/document/build.js is rendered here.

import { renderMathML } from "../render-mathml.js";

function esc(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function styleValue(text) {
  // Inline styles are generated from validated values only, but keep the
  // sanitisation here so the renderer is safe on its own.
  return String(text).replace(/[^0-9A-Za-z%.\-]/g, "");
}

function renderMath(expr, display) {
  return renderMathML(expr, { display });
}

export function renderInline(nodes) {
  const parts = [];
  for (const node of nodes ?? []) {
    switch (node.kind) {
      case "text":
        parts.push(esc(node.value));
        break;
      case "bold":
        parts.push(`<strong>${renderInline(node.children)}</strong>`);
        break;
      case "italic":
        parts.push(`<em>${renderInline(node.children)}</em>`);
        break;
      case "emphasis":
        parts.push(`<em class="ms-emphasis">${renderInline(node.children)}</em>`);
        break;
      case "underline":
        parts.push(`<u>${renderInline(node.children)}</u>`);
        break;
      case "code_text":
        parts.push(`<code class="ms-code-text">${renderInline(node.children)}</code>`);
        break;
      case "math":
        parts.push(`<span class="ms-inline-math">${renderMath(node.expr, "inline")}</span>`);
        break;
      case "ref": {
        if (node.resolved) {
          parts.push(
            `<a class="ms-ref" href="#${esc(node.resolved.id)}" title="${esc(node.label)}">${esc(node.resolved.refText)}</a>`
          );
        } else {
          parts.push(`<span class="ms-ref-broken" title="${esc(node.label)}">??</span>`);
        }
        break;
      }
      case "cite": {
        const links = node.numbers
          .map((number, index) =>
            number === null
              ? `<span class="ms-cite-broken">?</span>`
              : `<a class="ms-cite" href="#bib-${esc(sanitize(node.keys[index]))}">${number}</a>`
          )
          .join(", ");
        parts.push(`<span class="ms-cite-group">[${links}]</span>`);
        break;
      }
      default:
        break;
    }
  }
  return parts.join("");
}

function sanitize(text) {
  return String(text).replace(/[^A-Za-z0-9_-]+/g, "-");
}

function renderTitleBlock(doc) {
  const { metadata, templateName } = doc;
  const hasTitle = metadata.title?.length > 0;
  const hasSubtitle = metadata.subtitle?.length > 0;
  const hasAuthor = metadata.author.length > 0;
  const hasAffiliations = metadata.affiliations.length > 0;
  const hasDate = Boolean(metadata.date);
  const hasKeywords = metadata.keywords.length > 0;
  if (!hasTitle && !hasSubtitle && !hasAuthor && !hasDate && !hasKeywords) return "";

  const parts = [`<header class="ms-titleblock ms-titleblock-${esc(templateName)}">`];
  if (hasTitle) parts.push(`<h1 class="ms-title">${renderInline(metadata.title)}</h1>`);
  if (hasSubtitle) parts.push(`<p class="ms-subtitle">${renderInline(metadata.subtitle)}</p>`);
  if (hasAuthor) parts.push(`<p class="ms-author">${esc(metadata.author.join(" \u00b7 "))}</p>`);
  if (hasAffiliations) parts.push(`<p class="ms-affiliations">${esc(metadata.affiliations.join(" \u00b7 "))}</p>`);
  if (hasDate) parts.push(`<p class="ms-date">${esc(metadata.date)}</p>`);
  if (hasKeywords) parts.push(`<p class="ms-keywords"><span class="ms-keywords-label">Keywords:</span> ${esc(metadata.keywords.join(", "))}</p>`);
  parts.push(`</header>`);
  return parts.join("\n");
}

function renderAbstract(doc) {
  if (!doc.metadata.abstract?.length) return "";
  return `<section class="ms-abstract"><h2 class="ms-abstract-title">Abstract</h2><p>${renderInline(doc.metadata.abstract)}</p></section>`;
}

function renderToc(doc) {
  if (!doc.template.toc || doc.toc.length === 0) return "";
  const rows = doc.toc
    .map(
      (entry) =>
        `<a class="ms-toc-row ms-toc-level-${entry.level}" href="#${esc(entry.id)}">` +
        (entry.number ? `<span class="ms-toc-number">${esc(entry.number)}</span>` : "") +
        `<span class="ms-toc-title">${renderInline(entry.title)}</span></a>`
    )
    .join("");
  return `<nav class="ms-toc" aria-label="Contents"><h2 class="ms-toc-heading">Contents</h2>${rows}</nav>`;
}

function renderEquationNumber(block) {
  if (!block.number) return "";
  return `<span class="ms-equation-number">(${esc(block.number)})</span>`;
}

function renderBlock(block) {
  switch (block.kind) {
    case "section": {
      const level = Math.min(block.level + 1, 6);
      const number = block.number ? `<span class="ms-section-number">${esc(block.number)}</span>` : "";
      const body = block.blocks.map(renderBlock).join("\n");
      return (
        `<section class="ms-section ms-level-${block.level}" id="${esc(block.id)}">` +
        `<h${level} class="ms-heading">${number}${renderInline(block.title)}</h${level}>` +
        body +
        `</section>`
      );
    }

    case "paragraph":
      return `<p class="ms-paragraph">${renderInline(block.content)}</p>`;

    case "equation":
      return (
        `<div class="ms-equation${block.number ? " ms-numbered" : ""}"${block.id ? ` id="${esc(block.id)}"` : ""}>` +
        `<div class="ms-equation-body">${renderMath(block.expr, "block")}</div>` +
        renderEquationNumber(block) +
        `</div>`
      );

    case "aligned": {
      const rows = block.rows
        .map(
          (row) =>
            `<div class="ms-aligned-row">` +
            `<span class="ms-aligned-left">${renderMath(row.left, "inline")}</span>` +
            `<span class="ms-aligned-op">${esc(row.operator)}</span>` +
            `<span class="ms-aligned-right">${renderMath(row.right, "inline")}</span>` +
            `</div>`
        )
        .join("");
      return (
        `<div class="ms-equation ms-aligned${block.number ? " ms-numbered" : ""}"${block.id ? ` id="${esc(block.id)}"` : ""}>` +
        `<div class="ms-equation-body"><div class="ms-aligned-table">${rows}</div></div>` +
        renderEquationNumber(block) +
        `</div>`
      );
    }

    case "list":
      return renderList(block);

    case "table": {
      const align = (index) => ` style="text-align: ${styleValue(block.align?.[index] ?? "left")}"`;
      const head = block.header
        ? `<thead><tr>${block.header
            .map((cell, index) => `<th${align(index)}>${renderInline(cell)}</th>`)
            .join("")}</tr></thead>`
        : "";
      const body = `<tbody>${block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell, index) => `<td${align(index)}>${renderInline(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody>`;
      const caption = renderCaption("Table", block);
      return (
        `<figure class="ms-table-block"${block.id ? ` id="${esc(block.id)}"` : ""}>` +
        `<table class="ms-table">${head}${body}</table>` +
        caption +
        `</figure>`
      );
    }

    case "figure": {
      const caption = renderCaption("Figure", block);
      return (
        `<figure class="ms-figure"${block.id ? ` id="${esc(block.id)}"` : ""}>` +
        (block.image ? renderImage(block.image) : "") +
        caption +
        `</figure>`
      );
    }

    case "image":
      return `<figure class="ms-figure ms-figure-plain">${renderImage(block.image)}</figure>`;

    case "listing": {
      const caption = renderCaption("Listing", block);
      const language = block.language ? `<span class="ms-listing-language">${esc(block.language)}</span>` : "";
      return (
        `<figure class="ms-listing"${block.id ? ` id="${esc(block.id)}"` : ""}>` +
        `<pre class="ms-listing-code"><code>${esc(block.text)}</code>${language}</pre>` +
        caption +
        `</figure>`
      );
    }

    case "quote":
      return `<blockquote class="ms-quote">${block.blocks.map(renderBlock).join("\n")}</blockquote>`;

    case "proof": {
      const title = block.title ? esc(block.title) : "Proof";
      return (
        `<div class="ms-proof">` +
        `<p class="ms-proof-head">${title}.</p>` +
        block.blocks.map(renderBlock).join("\n") +
        `<p class="ms-proof-end" aria-hidden="true">\u220e</p>` +
        `</div>`
      );
    }

    case "page_break":
      return `<div class="ms-page-break" role="separator" aria-hidden="true"></div>`;

    case "bibliography":
      return "";

    case "theorem":
    case "lemma":
    case "definition":
    case "corollary": {
      const noun = { theorem: "Theorem", lemma: "Lemma", definition: "Definition", corollary: "Corollary" }[block.kind];
      const title = block.title?.length ? ` <span class="ms-theorem-title">(${renderInline(block.title)})</span>` : "";
      return (
        `<div class="ms-theorem ms-theorem-${block.kind}"${block.id ? ` id="${esc(block.id)}"` : ""}>` +
        `<p class="ms-theorem-head"><span class="ms-theorem-label">${noun} ${esc(block.number)}</span>${title}</p>` +
        block.blocks.map(renderBlock).join("\n") +
        `</div>`
      );
    }

    default:
      return "";
  }
}

function renderList(block) {
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items
    .map((item) => `<li>${item.map(renderBlock).join("\n")}</li>`)
    .join("");
  return `<${tag} class="ms-list ms-list-${block.ordered ? "numbered" : "bulleted"}">${items}</${tag}>`;
}

function renderCaption(noun, block) {
  if (!block.number && !block.caption) return "";
  const number = block.number ? `<span class="ms-caption-number">${noun} ${esc(block.number)}</span>` : "";
  const text = block.caption ? `<span class="ms-caption-text">${renderInline(block.caption)}</span>` : "";
  const separator = block.number && block.caption ? ". " : "";
  return `<figcaption class="ms-caption">${number}${separator}${text}</figcaption>`;
}

function renderImage(image) {
  const styles = [];
  if (image.width) styles.push(`width: ${styleValue(image.width)}`);
  if (image.height) styles.push(`height: ${styleValue(image.height)}`);
  const style = styles.length ? ` style="${esc(styles.join("; "))}"` : "";
  const alt = esc(image.alt ?? "");
  return `<img class="ms-image" src="${esc(image.src)}" alt="${alt}" data-ms-src="${esc(image.src)}"${style} />`;
}

function renderBibliography(doc) {
  const blocks = [];
  const render = (nodes) => nodes.map(renderBlock).join("\n");
  void render;
  const entries = doc.bibliography ?? [];
  if (entries.length === 0) return "";
  const items = entries
    .map((entry) => {
      const parts = [];
      const author = entry.fields.author ? esc(entry.fields.author) : "";
      const title = entry.fields.title ? `<em>${esc(entry.fields.title)}</em>` : "";
      const year = entry.fields.year ? esc(entry.fields.year) : "";
      if (author) parts.push(`${author}.`);
      if (title) parts.push(`${title}.`);
      if (entry.type === "article" && entry.fields.journal) {
        parts.push(`${esc(entry.fields.journal)}${entry.fields.volume ? ` ${esc(entry.fields.volume)}` : ""}${entry.fields.issue ? `(${esc(entry.fields.issue)})` : ""}${entry.fields.pages ? `, ${esc(entry.fields.pages)}` : ""}.`);
      } else if (entry.type === "inproceedings" && entry.fields.booktitle) {
        parts.push(`In ${esc(entry.fields.booktitle)}${entry.fields.pages ? `, ${esc(entry.fields.pages)}` : ""}.`);
      } else if (entry.type === "book" && entry.fields.publisher) {
        parts.push(`${esc(entry.fields.publisher)}${entry.fields.edition ? `, ${esc(entry.fields.edition)} edition` : ""}.`);
      } else if (entry.type === "techreport" && entry.fields.institution) {
        parts.push(`${esc(entry.fields.institution)}${entry.fields.number ? `, ${esc(entry.fields.number)}` : ""}.`);
      }
      if (year) parts.push(`${year}.`);
      if (entry.fields.doi) {
        const doi = esc(entry.fields.doi);
        parts.push(`<a href="https://doi.org/${doi}">doi:${doi}</a>`);
      } else if (entry.fields.url) {
        const url = esc(entry.fields.url);
        parts.push(`<a href="${url}">${url}</a>`);
      }
      if (entry.fields.note) parts.push(esc(entry.fields.note));
      return `<li id="bib-${esc(sanitize(entry.key))}" class="ms-bib-entry"><span class="ms-bib-number">[${entry.index}]</span> ${parts.join(" ")}</li>`;
    })
    .join("\n");
  blocks.push(
    `<section class="ms-bibliography"><h2 class="ms-heading ms-bibliography-heading">References</h2><ol class="ms-bib-list">${items}</ol></section>`
  );
  return blocks.join("\n");
}

/**
 * Render a document into the paper-like sheet used by the preview and the
 * standalone HTML export.
 */
export function renderDocumentHTML(doc) {
  const page = doc.page;
  const margin = (value, fallback) => (value ? pageLengthPx(value) : fallback).toFixed(1);
  const style = [
    `--ms-page-width: ${page.widthPx.toFixed(1)}px`,
    `--ms-page-height: ${page.heightPx.toFixed(1)}px`,
    `--ms-margin-top: ${margin(page.margins.top, page.widthPx * 0.1)}px`,
    `--ms-margin-right: ${margin(page.margins.right, page.widthPx * 0.1)}px`,
    `--ms-margin-bottom: ${margin(page.margins.bottom, page.widthPx * 0.1)}px`,
    `--ms-margin-left: ${margin(page.margins.left, page.widthPx * 0.1)}px`,
    `--ms-columns: ${page.columns}`
  ].join("; ");

  const bibliography = renderBibliography(doc);
  let bibliographyRendered = false;
  const rows = [];
  for (const block of doc.blocks) {
    if (block.kind === "bibliography") {
      if (!bibliographyRendered && bibliography) rows.push(bibliography);
      bibliographyRendered = true;
      continue;
    }
    const html = renderBlock(block);
    if (html) rows.push(html);
  }
  if (bibliography && !bibliographyRendered) rows.push(bibliography);

  const className = [
    "ms-doc",
    `ms-type-${doc.templateName}`,
    doc.page.columns > 1 ? "ms-multicolumn" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `<div class="ms-sheet" style="${style}">`,
    `<article class="${className}" role="document"${doc.metadata.language ? ` lang="${esc(doc.metadata.language)}"` : ""}>`,
    renderTitleBlock(doc),
    renderAbstract(doc),
    renderToc(doc),
    rows.join("\n"),
    `</article>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");
}

function pageLengthPx(value) {
  // Margins are stored as strings such as "25mm"; convert for the preview.
  const match = /^\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|pt|px)?\s*$/i.exec(String(value));
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  const mmPerUnit = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, px: 25.4 / 96 };
  return (amount * mmPerUnit[unit] * 96) / 25.4;
}
