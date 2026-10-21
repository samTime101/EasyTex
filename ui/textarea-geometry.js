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

// The width of the scrollbar the browser draws.
//
// A textarea that keeps a stable scrollbar gutter reserves this space, so the
// text inside it is narrower than the box of the textarea. A layer painted
// under the textarea has to give the same space back, or its text wraps at
// another place than the text of the textarea, and the caret of the textarea
// no longer sits on the letters the reader sees.
//
// The width is a property of the browser, so it is measured once per document
// with a probe element.
const gutterCache = new WeakMap();

export function scrollbarGutter(doc = document) {
  if (gutterCache.has(doc)) return gutterCache.get(doc);
  let width = 0;
  try {
    const probe = doc.createElement("div");
    probe.style.cssText =
      "position:absolute;top:-9999px;left:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden";
    doc.body.append(probe);
    width = probe.offsetWidth - probe.clientWidth;
    probe.remove();
  } catch {
    width = 0;
  }
  gutterCache.set(doc, width);
  return width;
}

// Copy the box of a textarea onto a layer painted under it: the same place,
// the same size, the same font, and the same text area.
//
// The layer is placed by its own box, so the size is given as the border box
// of the textarea minus the scrollbar gutter: the layer has no scrollbar of
// its own, and the space the textarea keeps empty must stay empty.
export function syncLayerBox(textarea, layer) {
  const style = getComputedStyle(textarea);
  const rect = textarea.getBoundingClientRect();
  const parent = layer.offsetParent;

  let left = textarea.offsetLeft;
  let top = textarea.offsetTop;
  if (parent) {
    // The layer is placed against the padding box of its parent, so the
    // borders of that parent are left out of the distance.
    const parentRect = parent.getBoundingClientRect();
    const parentStyle = getComputedStyle(parent);
    const borderLeft = parseFloat(parentStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(parentStyle.borderTopWidth) || 0;
    left = rect.left - parentRect.left - borderLeft;
    top = rect.top - parentRect.top - borderTop;
  }

  const gutter = scrollbarGutter(textarea.ownerDocument ?? document);
  const border =
    (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
  const padding =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);

  for (const prop of TEXTAREA_STYLE_PROPS) layer.style[prop] = style[prop];

  layer.style.left = `${left}px`;
  layer.style.top = `${top}px`;
  // The width is the border box of the textarea, but a layer may lay its box
  // out like a content box, so the frame is taken off when it does.
  const frame = style.boxSizing === "border-box" ? 0 : border + padding;
  layer.style.width = `${rect.width - gutter - frame}px`;
  layer.style.height = `${rect.height - frame}px`;
  layer.scrollTop = textarea.scrollTop;
  layer.scrollLeft = textarea.scrollLeft;
}

export class TextareaMirror {
  constructor(textarea) {
    this.textarea = textarea;
    this.mirror = null;
    this.lastValue = null;
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

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.overflow = "hidden";
    mirror.style.zIndex = "0";

    // The mirror must lay its text out exactly like the textarea, so it takes
    // the box of the textarea, scrollbar gutter included.
    syncLayerBox(textarea, mirror);

    if (this.lastValue !== textarea.value) {
      mirror.textContent = textarea.value.length > 0 ? textarea.value : "";
      this.lastValue = textarea.value;
    }

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
