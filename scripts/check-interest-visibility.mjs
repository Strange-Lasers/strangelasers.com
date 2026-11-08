import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { serve } from "./screenshots.mjs";

const SITE = fileURLToPath(new URL("../dist", import.meta.url));
const ABOUT = fileURLToPath(new URL("../dist/about/index.html", import.meta.url));
const MOBILE_MAX_WIDTH = 650;
const LAYOUT_CHANGE_VIEWPORT = Object.freeze({ width: 430, height: 844 });
const DESKTOP_VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const LAZY_LOAD_VIEWPORT = Object.freeze({ width: 844, height: 390 });
const VIEWPORTS = Object.freeze([
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  LAYOUT_CHANGE_VIEWPORT,
  { width: 500, height: 900 },
  { width: 568, height: 320 },
  { width: MOBILE_MAX_WIDTH, height: 900 },
  { width: 768, height: 900 },
  LAZY_LOAD_VIEWPORT,
  { width: 1024, height: 900 },
  DESKTOP_VIEWPORT,
]);
const MIN_VISIBLE_FRACTION = 0.75;
const MIN_PEAK_OPACITY = 0.15;
const MIN_SHOULDER_OPACITY = 0.09;
const GEOMETRY_EPSILON_PX = 0.1;
const SCROLL_PROGRESS_TOLERANCE = 0.02;
const BRIGHT_WINDOW_OFFSETS = Object.freeze([-0.08, -0.04, 0, 0.04, 0.08]);

async function paintedWordBounds(page) {
  const png = await page.screenshot();
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let top = canvas.height;
    let bottom = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (data[(y * canvas.width + x) * 4] > 127) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y + 1);
        }
      }
    }
    return { top, bottom };
  }, png.toString("base64"));
}

test("portrait clearance follows visible letters rather than line-height whitespace", async () => {
  const server = await serve(SITE);
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: DESKTOP_VIEWPORT, reducedMotion: "no-preference", deviceScaleFactor: 1 });
    await page.goto(server.url + "/about/");
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      for (const image of document.images) image.loading = "eager";
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      const word = document.querySelector("#bismeet .interest--one");
      word.style.setProperty("--interest-position-y", "15%");
      word.style.setProperty("--interest-offset-x", "0px");
      word.style.right = "10%";
    });
    await page.addStyleTag({ content: "html, body { background: #000 !important; } body * { visibility: hidden !important; } #bismeet .interest--one, #bismeet .interest--one * { visibility: visible !important; } #bismeet .interest--one { color: #fff !important; opacity: 1 !important; }" });
    const gaps = [];
    for (const fixture of [{ lineHeight: "1" }, { lineHeight: "2" }, { lineHeight: "1", fontFamily: "serif", fontStyle: "italic", text: "gyp" }]) {
      const portraitTop = await page.evaluate(async (fixture) => {
        const section = document.getElementById("bismeet");
        const word = section.querySelector(".interest--one");
        word.style.lineHeight = fixture.lineHeight;
        if (fixture.fontFamily) word.style.fontFamily = fixture.fontFamily;
        if (fixture.fontStyle) word.style.fontStyle = fixture.fontStyle;
        if (fixture.text) {
          word.lastChild.textContent = fixture.text;
          word.style.textTransform = "none";
        }
        dispatchEvent(new Event("resize"));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const bounds = section.getBoundingClientRect();
        const progress = Number(word.dataset.peak) - 0.08;
        scrollTo({ top: bounds.top + scrollY - innerHeight + progress * (bounds.height + innerHeight), behavior: "instant" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return section.querySelector(".portrait-window").getBoundingClientRect().top;
      }, fixture);
      const ink = await paintedWordBounds(page);
      assert.ok(ink.bottom > ink.top, "The screenshot must contain the isolated word");
      const gap = portraitTop - ink.bottom;
      assert.ok(gap >= -1 && gap <= 8, `Visible letters should approach the portrait without line-box padding; got ${gap.toFixed(1)}px`);
      gaps.push(gap);
    }
    assert.ok(Math.abs(gaps[0] - gaps[1]) <= 1, "Extra line height must not increase visible portrait clearance");
  } finally { await Promise.all([browser?.close(), server.close()].filter(Boolean)); }
});

test("background interests remain visible throughout their bright scroll windows", async (suite) => {
  assert.ok(existsSync(ABOUT), "Build the site with npm run build before checking interest visibility");
  assert.ok(existsSync(chromium.executablePath()), "Install Chromium with npm run screenshots:install");

  const server = await serve(SITE);
  let browser;
  try {
    browser = await chromium.launch();
    for (const viewport of VIEWPORTS) {
      await suite.test(`${viewport.width}x${viewport.height}`, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: "no-preference", isMobile: viewport.width <= MOBILE_MAX_WIDTH, hasTouch: viewport.width <= MOBILE_MAX_WIDTH });
        try {
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          const response = await page.goto(server.url + "/about/", { waitUntil: "load" });
          assert.ok(response?.ok(), "About page failed to load");
          await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
          await page.evaluate(async (keepLazyLoading) => {
            await document.fonts.ready;
            if (!keepLazyLoading) {
              for (const image of document.images) image.loading = "eager";
              await Promise.all([...document.images].map((image) => image.decode()));
            }
          }, viewport === LAZY_LOAD_VIEWPORT);

          const scenarios = [{ name: "initial" }];
          if (viewport === LAYOUT_CHANGE_VIEWPORT) {
            scenarios.push({ name: "resized", prepare: async () => {
              await page.setViewportSize(DESKTOP_VIEWPORT);
              await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
              await page.setViewportSize(viewport);
            } });
            scenarios.push({ name: "larger biography text", prepare: () => page.addStyleTag({ content: ".person-bio { font-size: 1.125rem; } .person-intro { font-family: serif; }" }) });
            scenarios.push({ name: "alternate label metrics", prepare: () => page.addStyleTag({ content: ".interest { font-family: serif; }" }) });
          }
          if (viewport === DESKTOP_VIEWPORT) {
            scenarios.push({ name: "changed portrait shape", prepare: () => page.addStyleTag({ content: ".portrait-window { aspect-ratio: 1 / 2; }" }) });
          }
          let initialPositions;
          for (const scenario of scenarios) {
            await scenario.prepare?.();
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const measures = await page.evaluate(async ({ offsets, overlapTolerance }) => {
              const results = [];
              const clips = new Set(["hidden", "clip", "auto", "scroll"]);
              const intersection = (start, end, clipStart, clipEnd) => Math.max(0, Math.min(end, clipEnd) - Math.max(start, clipStart));
              const portraits = [...document.querySelectorAll(".portrait-window")];
              const textContext = document.createElement("canvas").getContext("2d");
              const visibleLetters = (word) => {
                const style = getComputedStyle(word);
                textContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
                textContext.textBaseline = "alphabetic";
                textContext.textAlign = style.direction === "rtl" ? "right" : "left";
                textContext.direction = style.direction;
                textContext.fontKerning = style.fontKerning;
                textContext.textRendering = style.textRendering;
                textContext.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
                textContext.wordSpacing = style.wordSpacing === "normal" ? "0px" : style.wordSpacing;
                const language = word.closest("[lang]")?.lang || undefined;
                let text = word.textContent.trim().replace(/\s+/g, " ");
                if (style.textTransform.includes("uppercase")) text = text.toLocaleUpperCase(language);
                if (style.textTransform.includes("lowercase")) text = text.toLocaleLowerCase(language);
                const metrics = textContext.measureText(text);
                const baseline = word.querySelector(".interest-baseline").getBoundingClientRect();
                const left = baseline.left - metrics.actualBoundingBoxLeft;
                const right = baseline.left + metrics.actualBoundingBoxRight;
                const top = baseline.top - metrics.actualBoundingBoxAscent;
                const bottom = baseline.top + metrics.actualBoundingBoxDescent;
                return { left, right, top, bottom, width: right - left, height: bottom - top };
              };
              for (const section of document.querySelectorAll(".person")) {
                const image = section.querySelector(".portrait img");
                if (!image.complete || !image.naturalWidth) {
                  section.scrollIntoView({ block: "start", behavior: "instant" });
                  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                  await image.decode();
                  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }
                const sectionTop = section.getBoundingClientRect().top + scrollY;
                const sectionHeight = section.getBoundingClientRect().height;
                const layer = section.querySelector(".interest-background");
                for (const word of layer.querySelectorAll(".interest")) {
                  const peak = Number(word.dataset.peak);
                  for (const offset of offsets) {
                    const target = peak + offset;
                    scrollTo({ top: sectionTop - innerHeight + target * (sectionHeight + innerHeight), left: 0, behavior: "instant" });
                    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                    const bounds = visibleLetters(word);
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
                      left: bounds.left,
                      top: bounds.top,
                      progress: (scrollY + innerHeight - sectionTop) / (sectionHeight + innerHeight),
                      horizontal: intersection(bounds.left, bounds.right, left, right) / bounds.width,
                      vertical: intersection(bounds.top, bounds.bottom, top, bottom) / bounds.height,
                      portraitCollisions: portraits.flatMap((portrait) => {
                        const box = portrait.getBoundingClientRect();
                        const width = intersection(bounds.left, bounds.right, box.left, box.right);
                        const height = intersection(bounds.top, bounds.bottom, box.top, box.bottom);
                        return width > overlapTolerance && height > overlapTolerance ? [portrait.closest(".person").id] : [];
                      }),
                      opacity: Number(wordStyle.opacity),
                      display: wordStyle.display,
                      visibility: wordStyle.visibility,
                      layerDisplay: layerStyle.display,
                    });
                  }
                }
              }
              return results;
            }, { offsets: BRIGHT_WINDOW_OFFSETS, overlapTolerance: GEOMETRY_EPSILON_PX });

            assert.ok(measures.length, "About page has no background interests");
            assert.deepEqual(errors, [], "About page script errors");
            for (const measure of measures) {
              const label = `${scenario.name}: ${measure.person} ${measure.word} at progress ${measure.target.toFixed(2)}`;
              assert.ok(Math.abs(measure.progress - measure.target) <= SCROLL_PROGRESS_TOLERANCE, `${label} did not reach the requested scroll position`);
              assert.notEqual(measure.layerDisplay, "none", `${label} background layer is hidden`);
              assert.notEqual(measure.display, "none", `${label} word is hidden`);
              assert.equal(measure.visibility, "visible", `${label} word is not visible`);
              const minimumOpacity = measure.offset === 0 ? MIN_PEAK_OPACITY : MIN_SHOULDER_OPACITY;
              assert.ok(measure.opacity >= minimumOpacity, `${label} opacity ${measure.opacity} is below ${minimumOpacity}`);
              assert.ok(measure.horizontal >= MIN_VISIBLE_FRACTION, `${label} has only ${(measure.horizontal * 100).toFixed(1)}% of its width visible`);
              assert.ok(measure.vertical >= MIN_VISIBLE_FRACTION, `${label} has only ${(measure.vertical * 100).toFixed(1)}% of its height visible`);
              assert.deepEqual(measure.portraitCollisions, [], `${label} overlaps a portrait`);
            }
            const positions = measures.map(({ left, top }) => [left, top]);
            if (scenario.name === "initial") initialPositions = positions;
            if (scenario.name === "resized") {
              positions.forEach(([left, top], index) => {
                assert.ok(Math.abs(left - initialPositions[index][0]) < 1 && Math.abs(top - initialPositions[index][1]) < 1, "Resizing must not accumulate placement corrections");
              });
            }
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Background words must not create horizontal page scrolling");
          }
        } finally { await context.close(); }
      });
    }
  } finally {
    await Promise.all([browser?.close(), server.close()].filter(Boolean));
  }
});
