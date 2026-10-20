import { useCallback, useEffect, useRef, useState } from "react";
import { docsFor, fieldDocsFor } from "../lib/engine.js";
import { analyzeSource, looksLikeField, wordAt } from "../lib/hover-analysis.js";
import { TextareaMirror } from "@web/textarea-geometry.js";

function contains(span, offset) {
  return offset >= span.start.offset && offset < span.end.offset;
}

// The hover card, as a React hook.
//
// It answers one question: what is under the pointer? A call, a constant, a
// symbol, a document component, or a field of an object.
export function useHoverDocs({ textareaRef, shellRef, kinds = ["function", "constant", "symbol"], isSuppressed = () => false }) {
  const mirrorRef = useRef(null);
  const analysisRef = useRef({ source: null, analysis: null });
  const frameRef = useRef(null);
  const [card, setCard] = useState(null);

  const mirror = useCallback(() => {
    if (!mirrorRef.current) mirrorRef.current = new TextareaMirror(textareaRef.current);
    return mirrorRef.current;
  }, [textareaRef]);

  const analysisFor = useCallback((source) => {
    if (analysisRef.current.source === source) return analysisRef.current.analysis;
    const analysis = analyzeSource(source);
    analysisRef.current = { source, analysis };
    return analysis;
  }, []);

  const hide = useCallback(() => {
    setCard(null);
  }, []);

  const update = useCallback(
    (event) => {
      if (isSuppressed()) {
        hide();
        return;
      }
      const textarea = textareaRef.current;
      const shell = shellRef.current;
      if (!textarea || !shell) return;

      let offset = null;
      try {
        offset = mirror().offsetFromPoint(event.clientX, event.clientY);
      } catch {
        // Without a layout engine the pointer cannot be mapped to a
        // character; the card simply stays hidden.
        offset = null;
      }
      if (offset === null) {
        hide();
        return;
      }
      const word = wordAt(textarea.value, offset);
      if (!word) {
        hide();
        return;
      }
      const callable = docsFor(word.name);
      const field = fieldDocsFor(word.name);
      if (!callable && !field) {
        hide();
        return;
      }

      const analysis = analysisFor(textarea.value);
      let kind = null;
      if (analysis) {
        const callHit = analysis.calls.some(
          (entry) => entry.name === word.name && contains(entry.span, offset)
        );
        const fieldHit = analysis.fields.some(
          (entry) => entry.name === word.name && contains(entry.span, offset)
        );
        const valueHit = analysis.values.find(
          (entry) => entry.name === word.name && contains(entry.span, offset)
        );
        if (callHit) kind = "callable";
        else if (fieldHit) kind = "field";
        else if (
          valueHit &&
          (valueHit.binding === "constant" ||
            (valueHit.binding === "free" && callable?.kind === "symbol"))
        ) {
          kind = "callable";
        }
      } else {
        const callish = textarea.value.slice(word.end, word.end + 80).trimStart().startsWith("(");
        if (field && !callish && looksLikeField(textarea.value, word)) {
          kind = "field";
        } else if (callable) {
          kind = "callable";
        }
      }
      if (!kind) {
        hide();
        return;
      }

      if (kind === "field") {
        if (kinds && !kinds.includes("field")) {
          hide();
          return;
        }
      } else if (kinds && !kinds.includes(callable.kind)) {
        hide();
        return;
      }

      const bounds = shell.getBoundingClientRect();
      const width = Math.min(420, bounds.width * 0.92);
      let left = event.clientX - bounds.left + 16;
      let top = event.clientY - bounds.top + 18;
      if (left + width > bounds.width - 8) left = Math.max(8, bounds.width - width - 8);
      if (top + 260 > bounds.height - 8) top = Math.max(8, event.clientY - bounds.top - 260 - 14);

      setCard({
        kind,
        doc: kind === "field" ? field : callable,
        left,
        top,
        width,
        key: `${kind}:${word.name}`
      });
    },
    [analysisFor, hide, isSuppressed, kinds, mirror, shellRef, textareaRef]
  );

  const updateRef = useRef(update);
  updateRef.current = update;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return undefined;

    const onMove = (event) => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        updateRef.current(event);
      });
    };

    textarea.addEventListener("mousemove", onMove);
    textarea.addEventListener("mouseleave", hide);
    textarea.addEventListener("scroll", hide);
    textarea.addEventListener("blur", hide);
    textarea.addEventListener("input", hide);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      textarea.removeEventListener("mousemove", onMove);
      textarea.removeEventListener("mouseleave", hide);
      textarea.removeEventListener("scroll", hide);
      textarea.removeEventListener("blur", hide);
      textarea.removeEventListener("input", hide);
    };
  }, [hide, textareaRef]);

  return { card, hide };
}
