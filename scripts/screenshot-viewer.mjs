export const viewerStyles = `
.capture-link { cursor: zoom-in; }
#image-viewer { width: calc(100vw - 32px); height: calc(100dvh - 32px); max-width: none; max-height: none; padding: 0; border: 1px solid #555; border-radius: 8px; background: #111; color: #eee; }
#image-viewer[open] { display: flex; flex-direction: column; }
#image-viewer::backdrop { background: rgb(0 0 0 / 85%); }
.viewer-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #444; }
.viewer-toolbar h2 { margin: 0 auto 0 0; font-size: 18px; }
.viewer-toolbar button { padding: 8px 12px; border: 1px solid #777; border-radius: 4px; color: inherit; background: #222; font: inherit; cursor: pointer; }
.viewer-toolbar button[aria-pressed="true"] { background: #78ebff; border-color: #78ebff; color: #111; }
.viewer-toolbar button:focus-visible, .viewer-viewport:focus-visible { outline: 2px solid #78ebff; outline-offset: -2px; }
.viewer-help { margin: 0; padding: 10px 16px; font-size: 14px; }
.viewer-viewport { min-height: 0; flex: 1; overflow: auto; display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); padding: 12px; overscroll-behavior: contain; }
.viewer-canvas { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); width: 100%; height: 100%; min-width: 0; min-height: 0; align-self: center; justify-self: center; }
.viewer-canvas img { grid-area: 1 / 1; width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: contain; cursor: zoom-in; }
.viewer-canvas img[aria-hidden="true"] { visibility: hidden; }
.viewer-viewport.is-native .viewer-canvas { width: var(--image-width); height: var(--image-height); align-self: start; justify-self: start; }
.viewer-viewport.is-native img { cursor: zoom-out; }
`;

export const viewerMarkup = `
<dialog id="image-viewer" aria-labelledby="viewer-title" aria-describedby="viewer-help">
  <header class="viewer-toolbar">
    <h2 id="viewer-title" aria-live="polite">Screenshot comparison</h2>
    <div role="group" aria-label="Image version">
      <button type="button" data-side="before" aria-pressed="true">Before</button>
      <button type="button" data-side="after" aria-pressed="false">After</button>
    </div>
    <button type="button" id="viewer-size" aria-pressed="false">Full resolution</button>
    <a id="viewer-original" target="_blank" rel="noopener">Open PNG</a>
    <button type="button" id="viewer-close" aria-label="Close image viewer">Close</button>
  </header>
  <p class="viewer-help" id="viewer-help">Click the image to zoom in or out. Buttons, Left/Right, or Space switch Before/After. Escape closes. Full resolution lets you scroll through the original pixels.</p>
  <div class="viewer-viewport" tabindex="0" role="region" aria-label="Screenshot, click to zoom, Space switches Before and After">
    <div class="viewer-canvas">
      <img id="viewer-before" alt="Before" aria-hidden="false">
      <img id="viewer-after" alt="After" aria-hidden="true">
    </div>
  </div>
</dialog>
`;

export function installViewer() {
  const dialog = document.querySelector("#image-viewer");
  if (typeof dialog.showModal !== "function") return;
  const viewport = dialog.querySelector(".viewer-viewport");
  const title = dialog.querySelector("#viewer-title");
  const size = dialog.querySelector("#viewer-size");
  const original = dialog.querySelector("#viewer-original");
  const buttons = [...dialog.querySelectorAll("[data-side]")];
  const images = { before: dialog.querySelector("#viewer-before"), after: dialog.querySelector("#viewer-after") };
  let selected = "before";
  let view = "";
  let trigger;
  let previousOverflow;

  function select(side) {
    selected = side;
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.side === side));
    for (const [name, image] of Object.entries(images)) image.setAttribute("aria-hidden", String(name !== side));
    title.textContent = (side === "before" ? "Before" : "After") + " / " + view;
    original.href = images[side].src;
  }

  const toggle = () => select(selected === "before" ? "after" : "before");

  function toggleSize(point) {
    const native = viewport.classList.toggle("is-native");
    size.setAttribute("aria-pressed", String(native));
    size.textContent = native ? "Fit to window" : "Full resolution";
    viewport.scrollTo(0, 0);
    if (native && point) {
      const imageBounds = images[selected].getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      viewport.scrollTo(point.x + imageBounds.left - bounds.left - viewport.clientWidth / 2, point.y + imageBounds.top - bounds.top - viewport.clientHeight / 2);
    }
  }

  for (const link of document.querySelectorAll(".capture-link")) {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      const section = link.closest("section");
      view = section.querySelector("h2").textContent;
      for (const side of ["before", "after"]) {
        images[side].src = section.querySelector('.capture-link[data-side="' + side + '"]').href;
        images[side].alt = side + " " + view;
      }
      viewport.style.setProperty("--image-width", link.dataset.width + "px");
      viewport.style.setProperty("--image-height", link.dataset.height + "px");
      viewport.classList.remove("is-native");
      size.setAttribute("aria-pressed", "false");
      size.textContent = "Full resolution";
      select(link.dataset.side);
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      viewport.scrollTo(0, 0);
      viewport.focus({ preventScroll: true });
    });
  }
  for (const button of buttons) button.addEventListener("click", () => select(button.dataset.side));
  viewport.addEventListener("click", (event) => {
    const image = event.target;
    if (image.tagName !== "IMG") return;
    let point;
    if (!viewport.classList.contains("is-native") && image.naturalWidth) {
      const bounds = image.getBoundingClientRect();
      const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      point = {
        x: (event.clientX - bounds.left - (bounds.width - image.naturalWidth * scale) / 2) / scale,
        y: (event.clientY - bounds.top - (bounds.height - image.naturalHeight * scale) / 2) / scale,
      };
    }
    toggleSize(point);
    viewport.focus({ preventScroll: true });
  });
  size.addEventListener("click", () => toggleSize());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      select(event.key === "ArrowLeft" ? "before" : "after");
    } else if (event.key === " " && event.target === viewport) {
      event.preventDefault();
      toggle();
    }
  });
  dialog.querySelector("#viewer-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    trigger?.focus({ preventScroll: true });
  });
}
