import { matchDocumentation } from "../src/docs/index.js";
import { TextareaMirror } from "./textarea-geometry.js";

const WORD_BEFORE_CARET = /[A-Za-z][A-Za-z0-9_]*$/;

export function createAutocomplete({ textarea, container, maxItems = 12 }) {
  const mirror = new TextareaMirror(textarea);
  const list = document.createElement("div");
  list.className = "autocomplete hidden";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Function and constant suggestions");
  container.append(list);

  let items = [];
  let selected = 0;
  let tokenStart = 0;
  let tokenEnd = 0;
  let prefix = "";
  let isOpen = false;
  let forcedOpen = false;

  function close() {
    if (!isOpen) return;
    isOpen = false;
    forcedOpen = false;
    list.classList.add("hidden");
    list.replaceChildren();
    items = [];
    selected = 0;
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

    if (caret !== textarea.selectionEnd) {
      close();
      return;
    }
    if (inComment(caret)) {
      close();
      return;
    }

    const token = tokenAt(caret);
    if (!token && !force) {
      if (forcedOpen && !allowOpen) {
        tokenStart = caret;
        tokenEnd = caret;
        prefix = "";
        items = matchDocumentation("").slice(0, maxItems);
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

    const candidates = matchDocumentation(currentPrefix, { all: force && currentPrefix === "" });
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
      item.title = doc.summary;

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
      kind.textContent = doc.kind === "constant" ? "const" : "fn";

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
    const isFunction = doc.kind !== "constant";
    const inserted = isFunction ? `${doc.name}()` : doc.name;
    textarea.setRangeText(inserted, tokenStart, tokenEnd, "end");
    const caret = tokenStart + (isFunction ? doc.name.length + 1 : inserted.length);
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
  textarea.addEventListener("scroll", () => close());

  return {
    isOpen: () => isOpen,
    close,
    handleKey,
    handleInput: () => update({ allowOpen: true }),
    handleSelectionChange: () => {
      if (isOpen) update({ allowOpen: false });
    },
    openAll: () => update({ allowOpen: true, force: true })
  };
}
