import { matchDocumentation } from "../src/docs/index.js";
import { prepareSnippet, lineIndent } from "./snippets.js";
import { completionContextAt } from "./completion-context.js";
import { TextareaMirror } from "./textarea-geometry.js";

const WORD_BEFORE_CARET = /[A-Za-z][A-Za-z0-9_]*$/;

function matchesPrefix(name, prefix) {
  return !prefix || name.toLowerCase().startsWith(prefix.toLowerCase());
}

export function createAutocomplete({
  textarea,
  container,
  maxItems = 12,
  kinds = ["function", "constant"],
  contextual = false
}) {
  const mirror = new TextareaMirror(textarea);
  const list = document.createElement("div");
  list.className = "autocomplete hidden";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Editor suggestions");
  container.append(list);

  let items = [];
  let selected = 0;
  let tokenStart = 0;
  let tokenEnd = 0;
  let prefix = "";
  let isOpen = false;
  let forcedOpen = false;

  let inputScheduled = false;

  function close() {
    if (!isOpen) return;
    isOpen = false;
    forcedOpen = false;
    list.classList.add("hidden");
    list.replaceChildren();
    items = [];
    selected = 0;
  }

  // Auto-pair edits dispatch their input event from inside execCommand, before
  // attachEditing() moves the caret between the inserted quotes. Deferring the
  // update by one microtask lets completion see the final caret position.
  function scheduleInput() {
    if (inputScheduled) return;
    inputScheduled = true;
    queueMicrotask(() => {
      inputScheduled = false;
      update({ allowOpen: true });
    });
  }

  function tokenAt(caret) {
    const before = textarea.value.slice(0, caret);
    const match = WORD_BEFORE_CARET.exec(before);
    if (!match) return null;
    return { start: caret - match[0].length, text: match[0] };
  }

  function inComment(caret) {
    const lineStart = textarea.value.lastIndexOf("\n", caret - 1) + 1;
    return textarea.value.slice(lineStart, caret).includes("//");
  }

  function update(options = {}) {
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
    if (inComment(caret)) {
      close();
      return;
    }

    const context = contextual ? completionContextAt(textarea.value, caret) : null;
    if (context?.type === "blocked") {
      close();
      return;
    }
    if (context?.type === "field" || context?.type === "value") {
      if (!allowOpen && !isOpen) return;
      const currentPrefix = force ? "" : context.prefix;
      const contextItems = context.candidates.filter((doc) => matchesPrefix(doc.name, currentPrefix));
      if (contextItems.length === 0) {
        close();
        return;
      }
      items = contextItems.slice(0, maxItems);
      selected = 0;
      tokenStart = context.tokenStart;
      tokenEnd = context.tokenEnd;
      prefix = currentPrefix;
      forcedOpen = force;
      render();
      list.classList.remove("hidden");
      isOpen = true;
      position();
      return;
    }

    const token = tokenAt(caret);
    if (!token && !force) {
      if (forcedOpen && !allowOpen) {
        tokenStart = caret;
        tokenEnd = caret;
        prefix = "";
        items = matchDocumentation("", { kinds }).slice(0, maxItems);
        selected = 0;
        render();
        position();
        return;
      }
      close();
      return;
    }

    const currentPrefix = token?.text ?? "";
    const nextChar = textarea.value[caret] ?? "";
    if (!force && currentPrefix && nextChar === "(") {
      close();
      return;
    }

    const candidates = matchDocumentation(currentPrefix, { all: force && currentPrefix === "", kinds });
    const usable = candidates.filter((doc) => !(doc.name === currentPrefix && nextChar === "(" && !force));
    if (usable.length === 0) {
      close();
      return;
    }
    if (!allowOpen && !isOpen) return;

    items = usable.slice(0, maxItems);
    selected = 0;
    tokenStart = token?.start ?? caret;
    tokenEnd = caret;
    prefix = currentPrefix;
    forcedOpen = force;
    render();
    list.classList.remove("hidden");
    isOpen = true;
    position();
  }

  function render() {
    list.replaceChildren();
    items.forEach((doc, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "autocomplete-item";
      item.setAttribute("role", "option");
      item.id = `autocomplete-item-${index}`;
      item.setAttribute("aria-selected", String(index === selected));
      if (index === selected) item.classList.add("selected");
      item.title = doc.snippet ? `${doc.summary} (inserts a starter snippet)` : doc.summary;

      const name = document.createElement("span");
      name.className = "ac-name";
      if (prefix && doc.name.toLowerCase().startsWith(prefix.toLowerCase())) {
        const mark = document.createElement("mark");
        mark.textContent = doc.name.slice(0, prefix.length);
        name.append(mark, document.createTextNode(doc.name.slice(prefix.length)));
      } else {
        name.textContent = doc.name;
      }

      const signature = document.createElement("span");
      signature.className = "ac-signature";
      signature.textContent = doc.signature;

      const kind = document.createElement("span");
      kind.className = "ac-kind";
      kind.textContent =
        doc.kind === "constant"
          ? "const"
          : doc.kind === "component"
            ? "doc"
            : doc.kind === "symbol"
              ? "sym"
              : doc.kind === "field"
                ? "field"
                : doc.kind === "value"
                  ? doc.isDefault
                    ? "default"
                    : "option"
                  : "fn";

      item.append(name, signature, kind);
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selected = index;
        accept();
      });
      item.addEventListener("mousemove", () => {
        if (selected === index) return;
        selected = index;
        updateSelection();
      });
      list.append(item);
    });
    list.setAttribute("aria-activedescendant", `autocomplete-item-${selected}`);
  }

  function updateSelection() {
    const children = [...list.children];
    children.forEach((child, index) => {
      child.classList.toggle("selected", index === selected);
      child.setAttribute("aria-selected", String(index === selected));
    });
    list.setAttribute("aria-activedescendant", `autocomplete-item-${selected}`);
    children[selected]?.scrollIntoView({ block: "nearest" });
  }

  function position() {
    const anchor = mirror.caretPoint(tokenStart);
    const boundsWidth = container.clientWidth;
    const boundsHeight = container.clientHeight;
    const width = list.offsetWidth;
    const height = list.offsetHeight;

    let left = anchor.left;
    left = Math.min(left, boundsWidth - width - 8);
    left = Math.max(8, left);

    let top = anchor.top + anchor.height + 4;
    if (top + height > boundsHeight - 8) {
      top = anchor.top - height - 6;
    }
    top = Math.max(8, Math.min(top, boundsHeight - height - 8));

    list.style.left = `${left}px`;
    list.style.top = `${top}px`;
  }

  function move(delta) {
    if (items.length === 0) return;
    selected = (selected + delta + items.length) % items.length;
    updateSelection();
  }

  function accept() {
    const doc = items[selected];
    if (!doc) {
      close();
      return;
    }
    const isFunction = doc.kind === "function" || doc.kind === "component";
    let inserted;
    let caretOffset;
    if (doc.kind === "field") {
      const nextChar = textarea.value[tokenEnd] ?? "";
      inserted = nextChar === ":" || nextChar === "=" ? doc.name : `${doc.name}: `;
      caretOffset = inserted.length;
    } else if (doc.kind === "value") {
      inserted = doc.quote ? `"${doc.value}"` : doc.value;
      caretOffset = inserted.length;
    } else if (doc.snippet) {
      const prepared = prepareSnippet(doc.snippet, lineIndent(textarea.value, tokenStart));
      inserted = prepared.text;
      caretOffset = prepared.caret;
    } else {
      inserted = isFunction ? `${doc.name}()` : doc.name;
      caretOffset = isFunction ? doc.name.length + 1 : inserted.length;
    }
    textarea.setRangeText(inserted, tokenStart, tokenEnd, "end");
    const caret = tokenStart + caretOffset;
    textarea.setSelectionRange(caret, caret);
    close();
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function handleKey(event) {
    if (!isOpen) return false;
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
  }

  textarea.addEventListener("blur", () => close());
  textarea.addEventListener("scroll", () => {
    if (isOpen) position();
  });
  window.addEventListener("resize", () => {
    if (isOpen) position();
  });

  return {
    isOpen: () => isOpen,
    close,
    reposition: () => {
      if (isOpen) position();
    },
    handleKey,
    handleInput: scheduleInput,
    handleSelectionChange: () => {
      if (isOpen) update({ allowOpen: false });
    },
    openAll: () => update({ allowOpen: true, force: true })
  };
}
