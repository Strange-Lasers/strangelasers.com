import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { serve } from "./screenshots.mjs";

const SITE = fileURLToPath(new URL("../dist", import.meta.url));
const ABOUT = fileURLToPath(new URL("../dist/about/index.html", import.meta.url));
const VIEWPORTS = Object.freeze([
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 650, height: 900 },
  { width: 768, height: 900 },
  { width: 1440, height: 1000 },
]);
const MIN_VISIBLE_FRACTION = 0.75;
const MIN_PEAK_OPACITY = 0.15;
const MIN_SHOULDER_OPACITY = 0.09;
const SCROLL_PROGRESS_TOLERANCE = 0.02;
const BRIGHT_WINDOW_OFFSETS = Object.freeze([-0.08, 0, 0.08]);

test("background interests remain visible throughout their bright scroll windows", async (suite) => {
  assert.ok(existsSync(ABOUT), "Build the site with npm run build before checking interest visibility");
  assert.ok(existsSync(chromium.executablePath()), "Install Chromium with npm run screenshots:install");

  const server = await serve(SITE);
  let browser;
  try {
    browser = await chromium.launch();
    for (const viewport of VIEWPORTS) {
      await suite.test(`${viewport.width}x${viewport.height}`, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
        try {
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          const response = await page.goto(server.url + "/about/", { waitUntil: "load" });
          assert.ok(response?.ok(), "About page failed to load");
          await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
          await page.evaluate(async () => {
            for (const image of document.images) image.loading = "eager";
            await document.fonts.ready;
            await Promise.all([...document.images].map((image) => image.decode()));
          });

          const measures = await page.evaluate(async (offsets) => {
            const results = [];
            const clips = new Set(["hidden", "clip", "auto", "scroll"]);
            const intersection = (start, end, clipStart, clipEnd) => Math.max(0, Math.min(end, clipEnd) - Math.max(start, clipStart));
            for (const section of document.querySelectorAll(".person")) {
              const sectionTop = section.getBoundingClientRect().top + scrollY;
              const sectionHeight = section.getBoundingClientRect().height;
              const layer = section.querySelector(".interest-background");
              for (const word of layer.querySelectorAll(".interest")) {
                const peak = Number(word.dataset.peak);
                for (const offset of offsets) {
                  const target = peak + offset;
                  scrollTo({ top: sectionTop - innerHeight + target * (sectionHeight + innerHeight), left: 0, behavior: "instant" });
                  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                  const bounds = word.getBoundingClientRect();
                  const layerBounds = layer.getBoundingClientRect();
                  const layerStyle = getComputedStyle(layer);
                  const wordStyle = getComputedStyle(word);
                  let left = 0;
                  let right = innerWidth;
                  let top = 0;
                  let bottom = innerHeight;
                  if (clips.has(layerStyle.overflowX)) {
                    left = Math.max(left, layerBounds.left);
                    right = Math.min(right, layerBounds.right);
                  }
                  if (clips.has(layerStyle.overflowY)) {
                    top = Math.max(top, layerBounds.top);
                    bottom = Math.min(bottom, layerBounds.bottom);
                  }
                  if (layerStyle.clipPath !== "none") {
                    const match = /^inset\(([^)]+)\)$/.exec(layerStyle.clipPath);
                    if (!match) throw new Error("Unsupported interest clip path: " + layerStyle.clipPath);
                    const values = match[1].split(/\s+/).map((value) => {
                      if (!/^-?\d+(?:\.\d+)?px$/.test(value)) throw new Error("Unsupported interest clip inset: " + value);
                      return Number.parseFloat(value);
                    });
                    const [insetTop, insetRight, insetBottom, insetLeft] = [values[0], values[1] ?? values[0], values[2] ?? values[0], values[3] ?? values[1] ?? values[0]];
                    left = Math.max(left, layerBounds.left + insetLeft);
                    right = Math.min(right, layerBounds.right - insetRight);
                    top = Math.max(top, layerBounds.top + insetTop);
                    bottom = Math.min(bottom, layerBounds.bottom - insetBottom);
                  }

                  results.push({
                    person: section.id,
                    word: word.textContent.trim(),
                    target,
                    offset,
                    progress: (scrollY + innerHeight - sectionTop) / (sectionHeight + innerHeight),
                    horizontal: intersection(bounds.left, bounds.right, left, right) / bounds.width,
                    vertical: intersection(bounds.top, bounds.bottom, top, bottom) / bounds.height,
                    opacity: Number(wordStyle.opacity),
                    display: wordStyle.display,
                    visibility: wordStyle.visibility,
                    layerDisplay: layerStyle.display,
                  });
                }
              }
            }
            return results;
          }, BRIGHT_WINDOW_OFFSETS);

          assert.ok(measures.length, "About page has no background interests");
          assert.deepEqual(errors, [], "About page script errors");
          for (const measure of measures) {
            const label = `${measure.person} ${measure.word} at progress ${measure.target.toFixed(2)}`;
            assert.ok(Math.abs(measure.progress - measure.target) <= SCROLL_PROGRESS_TOLERANCE, `${label} did not reach the requested scroll position`);
            assert.notEqual(measure.layerDisplay, "none", `${label} background layer is hidden`);
            assert.notEqual(measure.display, "none", `${label} word is hidden`);
            assert.equal(measure.visibility, "visible", `${label} word is not visible`);
            const minimumOpacity = measure.offset === 0 ? MIN_PEAK_OPACITY : MIN_SHOULDER_OPACITY;
            assert.ok(measure.opacity >= minimumOpacity, `${label} opacity ${measure.opacity} is below ${minimumOpacity}`);
            assert.ok(measure.horizontal >= MIN_VISIBLE_FRACTION, `${label} has only ${(measure.horizontal * 100).toFixed(1)}% of its width visible`);
            assert.ok(measure.vertical >= MIN_VISIBLE_FRACTION, `${label} has only ${(measure.vertical * 100).toFixed(1)}% of its height visible`);
          }
        } finally { await context.close(); }
      });
    }
  } finally {
    await Promise.all([browser?.close(), server.close()].filter(Boolean));
  }
});
