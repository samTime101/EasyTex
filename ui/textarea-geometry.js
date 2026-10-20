// The style properties a mirror or highlight layer must copy from a textarea
// so that text laid out in one wraps exactly like text laid out in the other.
export const TEXTAREA_STYLE_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textIndent",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "boxSizing",
  "tabSize",
  "whiteSpace",
  "wordWrap",
  "overflowWrap",
  "textAlign",
  "direction"
];

export class TextareaMirror {
  constructor(textarea) {
    this.textarea = textarea;
    this.mirror = null;
    this.lastValue = null;
    this.lastWidth = -1;
    this.lastHeight = -1;
  }

  ensure() {
    if (this.mirror?.isConnected) return this.mirror;
    const mirror = document.createElement("div");
    mirror.className = "textarea-mirror";
    mirror.setAttribute("aria-hidden", "true");
    this.textarea.parentElement.append(mirror);
    this.mirror = mirror;
    return mirror;
  }

  sync() {
    const { textarea } = this;
    const mirror = this.ensure();
    const style = getComputedStyle(textarea);

    mirror.style.position = "absolute";
    mirror.style.left = `${textarea.offsetLeft}px`;
    mirror.style.top = `${textarea.offsetTop}px`;
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.overflow = "hidden";
    mirror.style.zIndex = "0";

    if (mirror.style.width !== `${textarea.offsetWidth}px`) {
      mirror.style.width = `${textarea.offsetWidth}px`;
      mirror.style.height = `${textarea.offsetHeight}px`;
      this.lastWidth = textarea.offsetWidth;
      this.lastHeight = textarea.offsetHeight;
    } else if (this.lastWidth !== textarea.offsetWidth || this.lastHeight !== textarea.offsetHeight) {
      mirror.style.width = `${textarea.offsetWidth}px`;
      mirror.style.height = `${textarea.offsetHeight}px`;
      this.lastWidth = textarea.offsetWidth;
      this.lastHeight = textarea.offsetHeight;
    }

    for (const prop of TEXTAREA_STYLE_PROPS) {
      mirror.style[prop] = style[prop];
    }

    if (this.lastValue !== textarea.value) {
      mirror.textContent = textarea.value.length > 0 ? textarea.value : "";
      this.lastValue = textarea.value;
    }

    mirror.scrollTop = textarea.scrollTop;
    mirror.scrollLeft = textarea.scrollLeft;

    return mirror;
  }

  textNode() {
    const mirror = this.ensure();
    return mirror.firstChild;
  }

  rectAt(offset) {
    const mirror = this.ensure();
    const text = this.textarea.value;
    if (text.length === 0) {
      const rect = mirror.getBoundingClientRect();
      const style = getComputedStyle(this.textarea);
      return {
        left: rect.left + parseFloat(style.paddingLeft || "0"),
        top: rect.top + parseFloat(style.paddingTop || "0"),
        bottom: rect.top + parseFloat(style.paddingTop || "0") + parseFloat(style.lineHeight || "20"),
        height: parseFloat(style.lineHeight || "20")
      };
    }
    const node = this.textNode() ?? mirror;
    const start = Math.max(0, Math.min(offset, text.length));
    const end = Math.min(start + 1, text.length);
    const range = document.createRange();
    try {
      range.setStart(node, start);
      range.setEnd(node, end);
    } catch {
      range.selectNodeContents(mirror);
    }
    return range.getBoundingClientRect();
  }

  caretPoint(offset) {
    this.sync();
    const rect = this.rectAt(offset);
    const shell = this.textarea.parentElement.getBoundingClientRect();
    return {
      left: rect.left - shell.left,
      top: rect.top - shell.top,
      height: rect.height || parseFloat(getComputedStyle(this.textarea).lineHeight || "20")
    };
  }

  offsetFromPoint(clientX, clientY) {
    const { textarea } = this;
    const bounds = textarea.getBoundingClientRect();
    if (clientX < bounds.left || clientX > bounds.right) return null;
    if (clientY < bounds.top || clientY > bounds.bottom) return null;

    const text = textarea.value;
    if (text.length === 0) return 0;

    this.sync();

    let low = 0;
    let high = text.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      const rect = this.rectAt(mid);
      if (rect.bottom <= clientY + 0.5) low = mid + 1;
      else high = mid;
    }

    const lineStart = low;
    let best = lineStart;
    const limit = Math.min(text.length, lineStart + 600);
    for (let index = lineStart; index < limit; index += 1) {
      const rect = this.rectAt(index);
      if (rect.bottom <= clientY + 0.5) break;
      if (rect.left <= clientX + 1) best = index;
      else break;
    }
    return best;
  }
}
