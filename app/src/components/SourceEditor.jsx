import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef
} from "react";
import {
  applyTextEdit,
  autoCloseEdit,
  callEnd,
  deletePairEdit,
  formatEdit,
  highlightSource,
  indentEdit,
  nextPlaceholder,
  smartEnterEdit
} from "../lib/engine.js";
import { syncLayerBox } from "@ui/textarea-geometry.js";
import { useAutocomplete } from "../hooks/useAutocomplete.js";
import { useHoverDocs } from "../hooks/useHoverDocs.js";
import { HoverCard } from "./HoverCard.jsx";

const INDENT = "  ";

// The source editor: a textarea with a painted highlight layer underneath,
// the suggestion list, and the hover card.
//
// The editing rules are the same as in the static host: brackets and quotes
// close themselves, Backspace removes an empty pair, Enter keeps the
// indentation, and Tab indents the selected lines.
export const SourceEditor = forwardRef(function SourceEditor(
  {
    value,
    onChange,
    ariaLabel = "Source",
    placeholder,
    autocompleteKinds = ["function", "constant"],
    hoverKinds = ["function", "constant", "symbol"],
    contextual = false,
    maxItems = 12,
    onRenderNow,
    onZoom,
    fontSize
  },
  ref
) {
  const textareaRef = useRef(null);
  const shellRef = useRef(null);
  const layerRef = useRef(null);

  const autocomplete = useAutocomplete({
    textareaRef,
    shellRef,
    kinds: autocompleteKinds,
    contextual,
    maxItems
  });

  const isSuppressed = useCallback(() => autocomplete.open, [autocomplete.open]);

  const hover = useHoverDocs({
    textareaRef,
    shellRef,
    kinds: hoverKinds,
    isSuppressed
  });

  // The highlight layer copies the textarea's box, font, and wrapping, and
  // follows its scroll position. The box has to be copied again whenever the
  // textarea resizes — the panel grows when the diagnostics appear, and a stale
  // box would cut the text off.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const layer = layerRef.current;
    if (!textarea || !layer) return undefined;

    function syncBox() {
      syncLayerBox(textarea, layer);
    }

    syncBox();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(syncBox);
      observer.observe(textarea);
      return () => observer.disconnect();
    }
    return undefined;
  }, [value, fontSize]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const layer = layerRef.current;
    if (!textarea || !layer) return undefined;
    const sync = () => {
      layer.scrollTop = textarea.scrollTop;
      layer.scrollLeft = textarea.scrollLeft;
    };
    textarea.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      textarea.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // The textarea owns its text. React is not allowed to write it, so a
  // re-render — the preview compiling, the hover card opening — can never
  // take a letter away from the reader in the middle of an edit. The source
  // in the state follows the textarea, and a source that changes from the
  // outside (an example, the format button) is written into the textarea.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (textarea.value === value) return;
    textarea.value = value;
    textarea.setSelectionRange(value.length, value.length);
  }, [value]);

  // The suggestion list follows the caret: a browser fires the select event
  // when the selection of a textarea changes, and the list is told about it.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return undefined;
    const onSelect = () => autocomplete.handleSelectionChange();
    textarea.addEventListener("select", onSelect);
    return () => textarea.removeEventListener("select", onSelect);
  }, [autocomplete]);

  // The edit is written into the textarea itself. The browser keeps its undo
  // stack that way, and the caret lands where the editing rules wanted it.
  const applyEdit = useCallback((edit) => {
    if (!edit) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyTextEdit(textarea, edit);
  }, []);

  const format = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const edit = formatEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd);
    if (edit.source === textarea.value) return;
    applyEdit({
      start: 0,
      end: textarea.value.length,
      text: edit.source,
      selectionStart: edit.selectionStart,
      selectionEnd: edit.selectionEnd
    });
  }, [applyEdit]);

  useImperativeHandle(
    ref,
    () => ({
      format,
      focus: () => textareaRef.current?.focus(),
      element: () => textareaRef.current
    }),
    [format]
  );

  const onKeyDown = useCallback(
    (event) => {
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && (event.key === " " || event.code === "Space")) {
        event.preventDefault();
        autocomplete.openAll();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        onRenderNow?.();
        return;
      }
      if (event.shiftKey && event.altKey && (event.key === "F" || event.key === "f")) {
        event.preventDefault();
        format();
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "=" || event.key === "+") {
          event.preventDefault();
          onZoom?.("in");
          return;
        }
        if (event.key === "-") {
          event.preventDefault();
          onZoom?.("out");
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          onZoom?.("reset");
          return;
        }
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (autocomplete.handleKey(event)) return;

      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart: start, selectionEnd: end } = textarea;
      // The text of the textarea is the ground truth: the source held in the
      // state may still be one keystroke behind it.
      const source = textarea.value;
      const key = event.key;

      if (key === "Enter") {
        event.preventDefault();
        applyEdit(smartEnterEdit(source, start, end));
        return;
      }
      if (key === "Tab") {
        event.preventDefault();
        // Tab walks the placeholders of a call that is being written:
        // integral(variable, start, end, expression).
        const placeholder = nextPlaceholder(source, start);
        if (placeholder) {
          // The source does not change, so the selection is set directly.
          textarea.focus();
          textarea.setSelectionRange(placeholder.start, placeholder.end);
          return;
        }
        const end = callEnd(source, start);
        if (end !== null) {
          // The last placeholder is written: the caret leaves the call.
          textarea.focus();
          textarea.setSelectionRange(end, end);
          return;
        }
        applyEdit(indentEdit(source, start, end, { unindent: event.shiftKey, indent: INDENT }));
        return;
      }
      if (key === "Backspace") {
        const edit = deletePairEdit(source, start, end);
        if (edit) {
          event.preventDefault();
          applyEdit(edit);
        }
        return;
      }
      if (key.length !== 1) return;

      const edit = autoCloseEdit(source, start, end, key);
      if (edit) {
        event.preventDefault();
        applyEdit(edit);
      }
    },
    [applyEdit, autocomplete, format, onRenderNow, onZoom]
  );

  const onInput = useCallback(
    (event) => {
      onChange(event.target.value);
      autocomplete.handleInput();
    },
    [autocomplete, onChange]
  );

  const layerHtml = highlightSource(value, { components: contextual, fields: contextual });

  return (
    <div className="editor-shell" ref={shellRef}>
      <textarea
        id="editor"
        className="has-highlight"
        spellCheck="false"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        defaultValue={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
        ref={textareaRef}
      />
      <pre
        className="editor-highlight"
        aria-hidden="true"
        ref={layerRef}
        dangerouslySetInnerHTML={{ __html: `${layerHtml}\n` }}
      />

      {autocomplete.open ? (
        <div
          className="autocomplete"
          role="listbox"
          aria-label="Editor suggestions"
          aria-activedescendant={`autocomplete-item-${autocomplete.selected}`}
          style={autocomplete.position ?? undefined}
        >
          {autocomplete.items.map((item, index) => (
            <button
              type="button"
              className={
                index === autocomplete.selected
                  ? "autocomplete-item selected"
                  : "autocomplete-item"
              }
              role="option"
              id={`autocomplete-item-${index}`}
              aria-selected={index === autocomplete.selected}
              key={`${item.kind}:${item.name}`}
              title={item.snippet ? `${item.summary} (inserts a starter snippet)` : item.summary}
              onMouseDown={(event) => {
                event.preventDefault();
                autocomplete.accept(index);
              }}
              onMouseMove={() => autocomplete.select(index)}
            >
              <span className="ac-name">
                {autocomplete.prefix &&
                item.name.toLowerCase().startsWith(autocomplete.prefix.toLowerCase()) ? (
                  <>
                    <mark>{item.name.slice(0, autocomplete.prefix.length)}</mark>
                    {item.name.slice(autocomplete.prefix.length)}
                  </>
                ) : (
                  item.name
                )}
              </span>
              <span className="ac-signature">{item.signature}</span>
              <span className="ac-kind">{item.badge}</span>
            </button>
          ))}
        </div>
      ) : null}

      {hover.card ? (
        <div
          className="hover-docs"
          role="tooltip"
          style={{ left: `${hover.card.left}px`, top: `${hover.card.top}px` }}
        >
          <HoverCard doc={hover.card.doc} kind={hover.card.kind} />
        </div>
      ) : null}
    </div>
  );
});
