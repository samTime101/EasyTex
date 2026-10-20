// LaTeX exporter for the MathScript document tree.
//
// The exporter produces a complete, compilable document rather than a
// fragment. Unsupported template behaviour is reported to the caller as a
// diagnostic instead of being silently approximated.

import { renderLaTeX } from "../render-latex.js";
import { parseLength } from "./templates.js";

function escapeText(text) {
  return String(text)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function escapeLabel(text) {
  return String(text).replace(/[{}\\%#]/g, "");
}

const LISTINGS_LANGUAGE = {
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "JavaScript",
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
  sql: "SQL",
  html: "HTML",
  xml: "XML",
  json: "JSON",
  bash: "bash",
  sh: "bash",
  ruby: "Ruby",
  go: "Go",
  rust: "Rust"
};

function renderInline(nodes) {
  return (nodes ?? [])
    .map((node) => {
      switch (node.kind) {
        case "text":
          return escapeText(node.value);
        case "bold":
          return `\\textbf{${renderInline(node.children)}}`;
        case "italic":
          return `\\textit{${renderInline(node.children)}}`;
        case "emphasis":
          return `\\emph{${renderInline(node.children)}}`;
        case "underline":
          return `\\underline{${renderInline(node.children)}}`;
        case "code_text":
          return `\\texttt{${renderInline(node.children)}}`;
        case "math":
          return `$${renderLaTeX(node.expr)}$`;
        case "ref":
          return `\\ref{${escapeLabel(node.label)}}`;
        case "cite":
          return `\\cite{${node.keys.map(escapeLabel).join(",")}}`;
        default:
          return "";
      }
    })
    .join("");
}

function renderList(block) {
  const env = block.ordered ? "enumerate" : "itemize";
  const items = block.items
    .map((item) => `\\item ${item.map(renderBlock).join("\n")}`)
    .join("\n");
  return `\\begin{${env}}\n${items}\n\\end{${env}}`;
}

function renderTable(block) {
  const align = (block.align ?? []).map((value) => ({ left: "l", center: "c", right: "r" }[value] ?? "l")).join("");
  const header = block.header ? `${block.header.map(renderInline).join(" & ")} \\\\\n\\hline\n` : "";
  const rows = block.rows.map((row) => `${row.map(renderInline).join(" & ")} \\\\`).join("\n");
  const caption = block.caption ? `\\caption{${renderInline(block.caption)}}` : "";
  const label = block.label ? `\\label{${escapeLabel(block.label)}}` : "";
  return [
    `\\begin{table}[htbp]`,
    `\\centering`,
    caption,
    label,
    `\\begin{tabular}{${align || "l"}}`,
    header + rows,
    `\\end{tabular}`,
    `\\end{table}`
  ]
    .filter(Boolean)
    .join("\n");
}

function renderImageOptions(image) {
  const options = [];
  if (image.width) options.push(`width=${image.width.endsWith("%") ? `${Number.parseFloat(image.width) / 100}\\textwidth` : image.width}`);
  if (image.height) options.push(`height=${image.height}`);
  return options.length ? `[${options.join(", ")}]` : "";
}

function renderListing(block) {
  const language = block.language ? LISTINGS_LANGUAGE[block.language.toLowerCase()] : null;
  const options = [];
  if (block.caption) options.push(`caption={${renderInline(block.caption)}}`);
  if (block.label) options.push(`label={${escapeLabel(block.label)}}`);
  if (language) options.push(`language=${language}`);
  if (options.length === 0 && !language) {
    return `\\begin{verbatim}\n${block.text}\n\\end{verbatim}`;
  }
  return `\\begin{lstlisting}[${options.join(", ")}]\n${block.text}\n\\end{lstlisting}`;
}

function renderTheorem(block) {
  const title = block.title?.length ? `[${renderInline(block.title)}]` : "";
  const label = block.label ? `\\label{${escapeLabel(block.label)}}` : "";
  return `\\begin{${block.kind}}${title}\n${label}\n${block.blocks.map(renderBlock).join("\n")}\n\\end{${block.kind}}`;
}

function renderBlock(block) {
  switch (block.kind) {
    case "section": {
      const command = ["section", "subsection", "subsubsection"][block.level - 1] ?? "paragraph";
      const star = block.number ? "" : "*";
      const label = block.label ? `\\label{${escapeLabel(block.label)}}` : "";
      return `\\${command}${star}{${renderInline(block.title)}}${label}\n${block.blocks
        .map(renderBlock)
        .join("\n\n")}`;
    }

    case "paragraph":
      return renderInline(block.content);

    case "equation": {
      const body = renderLaTeX(block.expr);
      if (!block.number) return `\\[\n${body}\n\\]`;
      const label = block.label ? `\\label{${escapeLabel(block.label)}}` : "";
      return `\\begin{equation}\n${label}\n${body}\n\\end{equation}`;
    }

    case "aligned": {
      const rows = block.rows
        .map((row) => `${renderLaTeX(row.left)} &= ${renderLaTeX(row.right)} \\\\`)
        .join("\n");
      const label = block.label ? `\\label{${escapeLabel(block.label)}}` : "";
      if (!block.number) return `\\[\n\\begin{aligned}\n${rows}\n\\end{aligned}\n\\]`;
      return `\\begin{equation}\n${label}\n\\begin{aligned}\n${rows}\n\\end{aligned}\n\\end{equation}`;
    }

    case "list":
      return renderList(block);

    case "table":
      return renderTable(block);

    case "figure": {
      const caption = block.caption ? `\\caption{${renderInline(block.caption)}}` : "";
      const label = block.label ? `\\label{${escapeLabel(block.label)}}` : "";
      return [
        `\\begin{figure}[htbp]`,
        `\\centering`,
        block.image ? `\\includegraphics${renderImageOptions(block.image)}{${block.image.src}}` : "",
        caption,
        label,
        `\\end{figure}`
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "image":
      return `\\begin{center}\n\\includegraphics${renderImageOptions(block.image)}{${block.image.src}}\n\\end{center}`;

    case "listing":
      return renderListing(block);

    case "quote":
      return `\\begin{quote}\n${block.blocks.map(renderBlock).join("\n\n")}\n\\end{quote}`;

    case "proof": {
      const title = block.title ? `[${escapeText(block.title)}]` : "";
      return `\\begin{proof}${title}\n${block.blocks.map(renderBlock).join("\n\n")}\n\\end{proof}`;
    }

    case "page_break":
      return "\\newpage";

    case "bibliography":
      return "";

    case "theorem":
    case "lemma":
    case "definition":
    case "corollary":
      return renderTheorem(block);

    default:
      return "";
  }
}

function renderBibliography(entries) {
  if (entries.length === 0) return "";
  const items = entries
    .map((entry) => {
      const parts = [];
      if (entry.fields.author) parts.push(escapeText(entry.fields.author) + ".");
      if (entry.fields.title) parts.push(`\\emph{${escapeText(entry.fields.title)}}.`);
      if (entry.type === "article" && entry.fields.journal) {
        let journal = escapeText(entry.fields.journal);
        if (entry.fields.volume) journal += ` ${escapeText(entry.fields.volume)}`;
        if (entry.fields.issue) journal += `(${escapeText(entry.fields.issue)})`;
        if (entry.fields.pages) journal += `, ${escapeText(entry.fields.pages)}`;
        parts.push(`${journal}.`);
      } else if (entry.type === "inproceedings" && entry.fields.booktitle) {
        parts.push(`In ${escapeText(entry.fields.booktitle)}${entry.fields.pages ? `, ${escapeText(entry.fields.pages)}` : ""}.`);
      } else if (entry.type === "book" && entry.fields.publisher) {
        parts.push(`${escapeText(entry.fields.publisher)}.`);
      } else if (entry.type === "techreport" && entry.fields.institution) {
        parts.push(`${escapeText(entry.fields.institution)}${entry.fields.number ? `, ${escapeText(entry.fields.number)}` : ""}.`);
      }
      if (entry.fields.year) parts.push(`${escapeText(entry.fields.year)}.`);
      if (entry.fields.doi) parts.push(`\\url{https://doi.org/${entry.fields.doi}}`);
      else if (entry.fields.url) parts.push(`\\url{${entry.fields.url}}`);
      if (entry.fields.note) parts.push(escapeText(entry.fields.note));
      return `\\bibitem{${escapeLabel(entry.key)}} ${parts.join(" ")}`;
    })
    .join("\n");
  return `\\begin{thebibliography}{99}\n${items}\n\\end{thebibliography}`;
}

function renderTitle(doc) {
  const { metadata } = doc;
  const lines = [];
  if (metadata.title?.length) lines.push(`\\title{${renderInline(metadata.title)}}`);
  if (metadata.author.length) lines.push(`\\author{${metadata.author.map(escapeText).join(" \\and ")}}`);
  lines.push(`\\date{${metadata.date ? escapeText(metadata.date) : "\\today"}}`);
  lines.push("\\maketitle");
  return lines.join("\n");
}

function geometryOptions(doc) {
  const page = doc.page;
  const options = [page.sizeLatex];
  if (page.orientation === "landscape") options.push("landscape");
  const margins = page.margins;
  let same = true;
  for (const side of ["top", "right", "bottom", "left"]) {
    if (margins[side] !== margins.top) same = false;
  }
  if (same) {
    options.push(`margin=${marginMm(margins.top)}mm`);
  } else {
    for (const side of ["top", "right", "bottom", "left"]) {
      options.push(`${side}=${marginMm(margins[side])}mm`);
    }
  }
  return options.join(",");
}

function marginMm(value) {
  const parsed = parseLength(value);
  return parsed.ok ? parsed.mm.toFixed(2) : String(value);
}

function eachBlock(blocks, visit) {
  for (const block of blocks ?? []) {
    visit(block);
    if (block.blocks) eachBlock(block.blocks, visit);
    if (block.items) for (const item of block.items) eachBlock(item, visit);
  }
}

/**
 * Render a document tree as a complete LaTeX source file.
 * Returns { latex, diagnostics }, where diagnostics are export warnings.
 */
export function renderDocumentLaTeX(doc) {
  const diagnostics = [];
  const warn = (message) => {
    diagnostics.push({ category: "export", message, severity: "warning", span: null });
  };

  let usesTheorem = false;
  let usesListing = false;
  let usesFigure = false;
  eachBlock(doc.blocks, (block) => {
    if (["theorem", "lemma", "definition", "corollary"].includes(block.kind)) usesTheorem = true;
    if (block.kind === "listing") usesListing = true;
    if (["figure", "table", "image"].includes(block.kind)) usesFigure = true;
  });
  const usesCitation = doc.bibliography.length > 0;

  if (doc.templateName === "presentation") {
    warn("The presentation template exports as a landscape article; slide rendering is not implemented yet.");
  }
  if (doc.templateName === "letter") {
    warn("The letter template exports as a standard article; letter-specific layout is not implemented yet.");
  }
  if (doc.page.columns > 1 && usesFigure) {
    warn("Multi-column LaTeX export uses multicols; floats may be placed on the following page.");
  }

  const prelude = [
    `\\documentclass[11pt]{${doc.template.latexClass}}`,
    `\\usepackage[T1]{fontenc}`,
    `\\usepackage{amsmath,amssymb}`,
    `\\usepackage{graphicx}`,
    usesTheorem ? `\\usepackage{amsthm}` : "",
    usesListing ? `\\usepackage{listings}` : "",
    usesCitation ? `\\usepackage{url}` : "",
    doc.pageConfigured ? `\\usepackage[${geometryOptions(doc)}]{geometry}` : "",
    doc.page.columns > 1 ? `\\usepackage{multicol}` : "",
    usesTheorem
      ? ["theorem", "lemma", "definition", "corollary"]
          .map(
            (name) =>
              `\\newtheorem{${name}}{${{ theorem: "Theorem", lemma: "Lemma", definition: "Definition", corollary: "Corollary" }[name]}}`
          )
          .join("\n")
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  const body = [];
  body.push(renderTitle(doc));
  if (doc.metadata.abstract?.length) {
    body.push(`\\begin{abstract}\n${renderInline(doc.metadata.abstract)}\n\\end{abstract}`);
  }
  if (doc.metadata.keywords.length) {
    body.push(`\\noindent\\textbf{Keywords:} ${doc.metadata.keywords.map(escapeText).join(", ")}`);
  }
  if (doc.template.toc) body.push("\\tableofcontents");

  const content = [];
  let bibliographyRendered = false;
  for (const block of doc.blocks) {
    if (block.kind === "bibliography") {
      if (!bibliographyRendered) {
        content.push(renderBibliography(doc.bibliography));
        bibliographyRendered = true;
      }
      continue;
    }
    const rendered = renderBlock(block);
    if (rendered) content.push(rendered);
  }
  if (!bibliographyRendered && doc.bibliography.length > 0) {
    content.push(renderBibliography(doc.bibliography));
  }

  const contentSource = content.filter(Boolean).join("\n\n");
  body.push(
    doc.page.columns > 1
      ? `\\begin{multicols}{${doc.page.columns}}\n${contentSource}\n\\end{multicols}`
      : contentSource
  );

  const latex = `${prelude}\n\n\\begin{document}\n\n${body.filter(Boolean).join("\n\n")}\n\n\\end{document}\n`;
  return { latex, diagnostics };
}
