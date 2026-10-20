import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef
} from "react";
import {
  autoCloseEdit,
  deletePairEdit,
  formatEdit,
  highlightSource,
  indentEdit,
  smartEnterEdit,
  TEXTAREA_STYLE_PROPS
} from "../lib/engine.js";
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
    onRenderNow
  },
  ref
) {
  const textareaRef = useRef(null);
  const shellRef = useRef(null);
  const layerRef = useRef(null);
  const pendingSelection = useRef(null);

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
  // follows its scroll position.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const layer = layerRef.current;
    if (!textarea || !layer) return;
    const style = getComputedStyle(textarea);
    layer.style.left = `${textarea.offsetLeft}px`;
    layer.style.top = `${textarea.offsetTop}px`;
    layer.style.width = `${textarea.offsetWidth}px`;
    layer.style.height = `${textarea.offsetHeight}px`;
    for (const prop of TEXTAREA_STYLE_PROPS) layer.style[prop] = style[prop];
    layer.scrollTop = textarea.scrollTop;
    layer.scrollLeft = textarea.scrollLeft;
  }, [value]);

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

  // After an edit the caret has to move to the position the editing rules
  // asked for, which only exists once the new value is in the DOM.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const selection = pendingSelection.current;
    if (!textarea || !selection) return;
    pendingSelection.current = null;
    textarea.setSelectionRange(selection.start, selection.end);
  }, [value]);

  const applyEdit = useCallback(
    (edit) => {
      if (!edit) return;
      const next = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
      pendingSelection.current = { start: edit.selectionStart, end: edit.selectionEnd };
      onChange(next);
    },
    [onChange, value]
  );

  const format = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const edit = formatEdit(value, textarea.selectionStart, textarea.selectionEnd);
    if (edit.source === value) return;
    applyEdit({
      start: 0,
      end: value.length,
      text: edit.source,
      selectionStart: edit.selectionStart,
      selectionEnd: edit.selectionEnd
    });
  }, [applyEdit, value]);

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
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (autocomplete.handleKey(event)) return;

      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart: start, selectionEnd: end } = textarea;
      const key = event.key;

      if (key === "Enter") {
        event.preventDefault();
        applyEdit(smartEnterEdit(value, start, end));
        return;
      }
      if (key === "Tab") {
        event.preventDefault();
        applyEdit(indentEdit(value, start, end, { unindent: event.shiftKey, indent: INDENT }));
        return;
      }
      if (key === "Backspace") {
        const edit = deletePairEdit(value, start, end);
        if (edit) {
          event.preventDefault();
          applyEdit(edit);
        }
        return;
      }
      if (key.length !== 1) return;

      const edit = autoCloseEdit(value, start, end, key);
      if (edit) {
        event.preventDefault();
        applyEdit(edit);
      }
    },
    [applyEdit, autocomplete, format, onRenderNow, value]
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
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
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
