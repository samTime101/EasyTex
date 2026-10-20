import { useMemo } from "react";
import { highlightSource } from "../lib/engine.js";

// Code with the same highlighting the editors use. The scanner escapes its
// input, so the markup is safe to inject.
export function HighlightedCode({ source, as: Tag = "code", className, options }) {
  const html = useMemo(
    () => highlightSource(source ?? "", options ?? {}),
    [source, options]
  );
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
