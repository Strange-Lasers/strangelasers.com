import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

const script = fileURLToPath(new URL("screenshots.mjs", import.meta.url));
const fixture = (height, title) => `<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title><style>body{margin:0;font:32px sans-serif;background:#fff}header{height:${height}px}section{height:1000px;background:#def}footer{height:1000px}</style><header>Intro</header><section id="target"><h1>${title}</h1><output></output></section><footer>End</footer><script>const tick=()=>{document.querySelector('output').textContent=performance.now();requestAnimationFrame(tick)};requestAnimationFrame(tick)</script></html>`;

async function run(args, env = process.env) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, [script, "--time", "1000", ...args], { env, timeout: 60000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("exit", (status) => accept({ status, stdout, stderr }));
  });
}

async function checkViewer(output) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = pathToFileURL(join(output, "index.html")).href;
    await page.goto(url);
    const beforeLink = page.locator('.capture-link[data-side="before"]').first();
    await beforeLink.click();
    assert.equal(await page.locator("#image-viewer").isVisible(), true);
    assert.equal(await page.locator("#viewer-before").getAttribute("aria-hidden"), "false");
    const bounds = await page.locator(".viewer-viewport").evaluate((element) => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight }));
    assert.ok(bounds.width > 1000, "Viewer should be larger than the thumbnail");
    assert.ok(bounds.scrollWidth <= bounds.width && bounds.scrollHeight <= bounds.height, "Fit mode should show the entire image without scrolling");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#viewer-after").getAttribute("aria-hidden"), "false");
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#viewer-before").getAttribute("aria-hidden"), "false");
    await page.locator("#viewer-before").click();
    assert.equal(await page.locator("#viewer-before").getAttribute("aria-hidden"), "false", "Zooming should keep the selected version");
    assert.equal(await page.locator("#viewer-size").getAttribute("aria-pressed"), "true");
    const zoomed = await page.locator(".viewer-viewport").evaluate((element) => ({ x: element.scrollLeft, y: element.scrollTop }));
    assert.ok(zoomed.x > 0 && zoomed.y > 0, "Clicking near the image center should zoom into that area");
    assert.equal(await page.locator("#viewer-before").evaluate((element) => getComputedStyle(element).cursor), "zoom-out");
    await page.locator("#viewer-before").click();
    assert.equal(await page.locator("#viewer-size").getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator("#viewer-before").getAttribute("aria-hidden"), "false");
    assert.equal(await page.locator("#viewer-before").evaluate((element) => getComputedStyle(element).cursor), "zoom-in");
    await page.getByRole("button", { name: "Full resolution", exact: true }).click();
    const position = await page.locator(".viewer-viewport").evaluate((element) => {
      element.scrollTo(300, 400);
      return { x: element.scrollLeft, y: element.scrollTop };
    });
    assert.deepEqual(position, { x: 300, y: 400 });
    for (const side of ["Before", "After", "Before", "After"]) {
      await page.getByRole("button", { name: side, exact: true }).click();
      assert.deepEqual(await page.locator(".viewer-viewport").evaluate((element) => ({ x: element.scrollLeft, y: element.scrollTop })), position);
    }
    assert.match(await page.locator("#viewer-original").getAttribute("href"), /desktop-after\.png$/);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#image-viewer").isVisible(), false);
    assert.equal(await beforeLink.evaluate((element) => document.activeElement === element), true);
    await page.locator('.capture-link[data-side="after"]').last().click();
    assert.match(await page.locator("#viewer-after").getAttribute("src"), /mobile-after\.png$/);
    assert.equal(await page.locator("#viewer-size").getAttribute("aria-pressed"), "false");
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileBounds = await page.locator("#image-viewer").boundingBox();
    assert.ok(mobileBounds.x >= 0 && mobileBounds.x + mobileBounds.width <= 390);
    await page.getByRole("button", { name: "Close image viewer" }).click();
    assert.equal(await page.locator("#image-viewer").isVisible(), false);
    assert.deepEqual(errors, []);
    const fallback = await browser.newPage({ javaScriptEnabled: false });
    await fallback.goto(url);
    await fallback.locator(".capture-link").first().click();
    assert.match(fallback.url(), /desktop-before\.png$/);
  } finally { await browser.close(); }
}

test("browser captures shifted sections at matching positions and full pixel density", async () => {
  const root = await mkdtemp(join(tmpdir(), "screenshots-browser-"));
  try {
    const before = join(root, "before");
    const after = join(root, "after");
    for (const path of [before, after]) await mkdir(join(path, "dist"), { recursive: true });
    await writeFile(join(before, "dist/index.html"), fixture(500, "Before"));
    await writeFile(join(after, "dist/index.html"), fixture(800, "After"));
    const output = join(root, "captures");
    const args = [before, after, "--no-build", "--selector", "#target", "--output", output];
    const result = await run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), await realpath(output));
    assert.match(result.stderr, /Capturing mobile after/);
    const metadata = JSON.parse(await readFile(join(output, "capture.json")));
    for (const pair of metadata.pairs) {
      assert.ok(Math.abs(pair.before.targetTop - 32) <= 0.5);
      assert.equal(pair.after.targetTop, pair.before.targetTop);
      assert.equal(pair.after.scrollY - pair.before.scrollY, 300);
      for (const side of ["before", "after"]) {
        const png = await readFile(join(output, pair[side].file));
        assert.equal(png.readUInt32BE(16), pair[side].viewport.width * 2);
        assert.equal(png.readUInt32BE(20), pair[side].viewport.height * 2);
      }
      assert.notDeepEqual(await readFile(join(output, pair.before.file)), await readFile(join(output, pair.after.file)));
    }
    assert.match(await readFile(join(output, "index.html"), "utf8"), /mobile-after.png/);
    await checkViewer(output);
    const same = join(root, "same");
    const repeat = await run([before, before, "--no-build", "--page", "/#target", "--viewport", "mobile", "--output", same]);
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.deepEqual(await readFile(join(same, "mobile-before.png")), await readFile(join(same, "mobile-after.png")), "Identical input and clock settings should produce identical pixels");
    const custom = join(root, "custom");
    const dense = await run([before, after, "--no-build", "--selector", "#target", "--viewport", "390x1200", "--scale", "3", "--motion", "reduced", "--output", custom]);
    assert.equal(dense.status, 0, dense.stderr);
    const customMetadata = JSON.parse(await readFile(join(custom, "capture.json")));
    assert.deepEqual(customMetadata.pairs[0].after.pixels, { width: 1170, height: 3600 });
    const overwrite = await run(args);
    assert.equal(overwrite.status, 2);
    assert.match(overwrite.stderr, /must be empty/);
    const unsafeOutput = await run([before, after, "--no-build", "--output", join(before, "dist/captures")]);
    assert.equal(unsafeOutput.status, 2);
    assert.match(unsafeOutput.stderr, /outside both dist/);
    await symlink(join(before, "dist"), join(root, "build-alias"));
    const aliasedOutput = await run([before, after, "--no-build", "--output", join(root, "build-alias/captures")]);
    assert.equal(aliasedOutput.status, 2);
    assert.match(aliasedOutput.stderr, /outside both dist/);
    for (const [name, extra] of [["selector", ["--selector", "#missing"]], ["page", ["--page", "/missing/"]]]) {
      const failed = await run([before, after, "--no-build", "--viewport", "mobile", "--output", join(root, name), ...extra]);
      assert.equal(failed.status, 1, failed.stderr);
      assert.equal(failed.stdout, "");
      assert.ok(JSON.parse(await readFile(join(root, name, "failure.json"))).error);
    }
    await writeFile(join(after, "dist/index.html"), fixture(800, "After") + '<img src="missing.png">');
    const broken = await run([before, after, "--no-build", "--viewport", "mobile", "--output", join(root, "broken")]);
    assert.equal(broken.status, 1, broken.stderr);
    assert.match(broken.stderr, /missing.png/);
    await writeFile(join(after, "dist/index.html"), fixture(800, "After").replace("section{height:1000px", "section{height:100px").replace("footer{height:1000px", "footer{height:0"));
    const misaligned = await run([before, after, "--no-build", "--selector", "#target", "--viewport", "mobile", "--output", join(root, "misaligned")]);
    assert.equal(misaligned.status, 1, misaligned.stderr);
    assert.match(misaligned.stderr, /could not align/);
    const dependency = await run([before, after, "--no-build"], { ...process.env, PLAYWRIGHT_BROWSERS_PATH: join(root, "no-browser") });
    assert.equal(dependency.status, 3);
    assert.match(dependency.stderr, /screenshots:install/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
