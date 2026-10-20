import { useCallback, useEffect, useRef, useState } from "react";
import {
  completionContextAt,
  completionInsertion,
  matchDocumentation
} from "../lib/engine.js";
import { TextareaMirror } from "@ui/textarea-geometry.js";

const WORD_BEFORE_CARET = /[A-Za-z][A-Za-z0-9_]*$/;

function matchesPrefix(name, prefix) {
  return !prefix || name.toLowerCase().startsWith(prefix.toLowerCase());
}

function badgeFor(doc) {
  if (doc.kind === "constant") return "const";
  if (doc.kind === "component") return "doc";
  if (doc.kind === "symbol") return "sym";
  if (doc.kind === "field") return "field";
  if (doc.kind === "value") return doc.isDefault ? "default" : "option";
  return "fn";
}

// The suggestion list, as a React hook.
//
// The rules are the same as in the static host: the list offers functions,
// constants, and components, and — in the document writer — the fields of
// the object around the caret together with the allowed values of a field.
export function useAutocomplete({
  textareaRef,
  shellRef,
  kinds = ["function", "constant"],
  contextual = false,
  maxItems = 12
}) {
  const mirrorRef = useRef(null);
  const itemsRef = useRef([]);
  const selectedRef = useRef(0);
  const openRef = useRef(false);
  const tokenRef = useRef({ start: 0, end: 0, prefix: "" });

  const [view, setView] = useState({ open: false, items: [], selected: 0, position: null });

  const mirror = useCallback(() => {
    if (!mirrorRef.current) mirrorRef.current = new TextareaMirror(textareaRef.current);
    return mirrorRef.current;
  }, [textareaRef]);

  const show = useCallback((items) => {
    itemsRef.current = items;
    selectedRef.current = 0;
    openRef.current = true;
    setView({ open: true, items, selected: 0, position: null });
  }, []);

  const close = useCallback(() => {
    itemsRef.current = [];
    selectedRef.current = 0;
    openRef.current = false;
    setView((current) => (current.open ? { ...current, open: false, items: [] } : current));
  }, []);

  const update = useCallback(
    (options = {}) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const force = options.force === true;
      const allowOpen = options.allowOpen !== false;
      const caret = textarea.selectionStart;

      if (document.activeElement !== textarea) {
        close();
        return;
      }
      if (caret !== textarea.selectionEnd) {
        close();
        return;
      }

      const context = contextual ? completionContextAt(textarea.value, caret) : null;
      if (context?.type === "blocked") {
        close();
        return;
      }

      if (context?.type === "field" || context?.type === "value") {
        if (!allowOpen && !openRef.current) return;
        const prefix = force ? "" : context.prefix;
        const candidates = context.candidates.filter((doc) => matchesPrefix(doc.name, prefix));
        if (candidates.length === 0) {
          close();
          return;
        }
        tokenRef.current = { start: context.tokenStart, end: context.tokenEnd, prefix };
        show(candidates.slice(0, maxItems).map((doc) => ({ ...doc, badge: badgeFor(doc) })));
        return;
      }

      const before = textarea.value.slice(0, caret);
      const match = WORD_BEFORE_CARET.exec(before);
      const token = match ? { start: caret - match[0].length, text: match[0] } : null;
      const currentPrefix = token?.text ?? "";
      const nextChar = textarea.value[caret] ?? "";

      if (!token && !force) {
        close();
        return;
      }
      if (!force && currentPrefix && nextChar === "(") {
        close();
        return;
      }

      const candidates = matchDocumentation(currentPrefix, { all: force && currentPrefix === "", kinds });
      const usable = candidates.filter(
        (doc) => !(doc.name === currentPrefix && nextChar === "(" && !force)
      );
      if (usable.length === 0) {
        close();
        return;
      }
      if (!allowOpen && !openRef.current) return;

      tokenRef.current = { start: token?.start ?? caret, end: caret, prefix: currentPrefix };
      show(usable.slice(0, maxItems).map((doc) => ({ ...doc, badge: badgeFor(doc) })));
    },
    [close, contextual, kinds, maxItems, show, textareaRef]
  );

  // The list follows the caret. Its position is measured after the list is
  // rendered, so the effect below recomputes it whenever the items change.
  useEffect(() => {
    if (!view.open) return;
    const textarea = textareaRef.current;
    const shell = shellRef.current;
    if (!textarea || !shell) return;
    let anchor;
    try {
      anchor = mirror().caretPoint(tokenRef.current.start);
    } catch {
      // Without a layout engine the caret cannot be measured; the list stays
      // where the stylesheet puts it instead of breaking the editor.
      return;
    }
    const bounds = shell.getBoundingClientRect();
    const width = 430;
    const height = Math.min(view.items.length * 34 + 12, 320);
    let left = anchor.left;
    let top = anchor.top + anchor.height + 4;
    if (left + width > bounds.width - 8) left = Math.max(8, bounds.width - width - 8);
    if (top + height > bounds.height - 8) top = Math.max(8, anchor.top - height - 6);
    setView((current) =>
      current.position?.left === Math.max(8, left) && current.position?.top === Math.max(8, top)
        ? current
        : { ...current, position: { left: Math.max(8, left), top: Math.max(8, top), width } }
    );
  }, [mirror, shellRef, view.items, view.open, textareaRef]);

  const move = useCallback((delta) => {
    const count = itemsRef.current.length;
    if (count === 0) return;
    const next = (selectedRef.current + delta + count) % count;
    selectedRef.current = next;
    setView((current) => ({ ...current, selected: next }));
  }, []);

  const accept = useCallback(
    (index) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const doc = itemsRef.current[index ?? selectedRef.current];
      if (!doc) {
        close();
        return;
      }
      const { inserted, caretOffset } = completionInsertion(doc, {
        source: textarea.value,
        tokenStart: tokenRef.current.start,
        tokenEnd: tokenRef.current.end
      });
      textarea.setRangeText(inserted, tokenRef.current.start, tokenRef.current.end, "end");
      const caret = tokenRef.current.start + caretOffset;
      textarea.setSelectionRange(caret, caret);
      textarea.focus();
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      close();
    },
    [close, textareaRef]
  );

  const select = useCallback((index) => {
    if (index === selectedRef.current) return;
    selectedRef.current = index;
    setView((current) => ({ ...current, selected: index }));
  }, []);

  const handleKey = useCallback(
    (event) => {
      if (!openRef.current) return false;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          move(1);
          return true;
        case "ArrowUp":
          event.preventDefault();
          move(-1);
          return true;
        case "Enter":
        case "Tab":
          event.preventDefault();
          accept();
          return true;
        case "Escape":
          event.preventDefault();
          close();
          return true;
        default:
          return false;
      }
    },
    [accept, close, move]
  );

  const inputScheduled = useRef(false);
  const handleInput = useCallback(() => {
    if (inputScheduled.current) return;
    inputScheduled.current = true;
    queueMicrotask(() => {
      inputScheduled.current = false;
      update({ allowOpen: true });
    });
  }, [update]);

  const handleSelectionChange = useCallback(() => {
    if (openRef.current) update({ allowOpen: false });
  }, [update]);

  const openAll = useCallback(() => update({ allowOpen: true, force: true }), [update]);

  return {
    open: view.open,
    items: view.items,
    selected: view.selected,
    position: view.position,
    prefix: tokenRef.current.prefix,
    handleKey,
    handleInput,
    handleSelectionChange,
    openAll,
    close,
    accept,
    select
  };
}
