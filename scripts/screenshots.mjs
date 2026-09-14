import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { installViewer, viewerMarkup, viewerStyles } from "./screenshot-viewer.mjs";

export const PRESETS = Object.freeze({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } });
const EXIT = Object.freeze({ runtime: 1, usage: 2, dependency: 3 });
const TIMEOUT_MS = 30000;
const BUILD_TIMEOUT_MS = 120000;
const DEFAULT_CAPTURE_TIME_MS = 6000;
const CLOCK_START = new Date("2024-01-01T00:00:00Z");
const ALIGNMENT_TOLERANCE = 1;
const TYPES = Object.freeze({ ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" });
const HELP = `Usage: npm run screenshots -- [options] BEFORE [AFTER]

Build two checkouts and capture matching before/after PNGs. AFTER defaults to .
Both paths refer to existing checkout roots, including their uncommitted edits.

  -h, --help              Show this help
  -p, --page PATH         Page path, optional query and #anchor (default /)
  -s, --selector CSS      Align this unique CSS selector instead of the #anchor
  -w, --viewport VIEW     both, desktop, mobile, or WIDTHxHEIGHT (default both)
  -d, --scale NUMBER      Integer pixel density from 1 to 4 (default 2)
  -y, --offset NUMBER     Target's distance from viewport top in CSS px (default 32)
  -m, --motion MODE       normal or reduced (default normal)
  -t, --time NUMBER       Animation time in ms, 0 to 10000 (default ${DEFAULT_CAPTURE_TIME_MS})
  -o, --output DIRECTORY  Empty output directory (default .screenshots/<unique-run>)
      --no-build         Use each checkout's existing dist without rebuilding

Examples:
  npm run screenshots -- ../before . --page /about/ --selector '#rohith'
  npm run screenshots -- ../before --page '/about/#rohith' --viewport mobile
  npm run screenshots -- ../before . -p/about/ -s'#rohith h2' -w390x1200 -d3

Requires Node.js 24+, npm, and this checkout's npm ci dependencies.
Install the capture browser once with npm run screenshots:install.
Each input checkout needs npm ci before building; --no-build needs only dist.
No environment variables are required. Outputs are PNGs, index.html, and
capture.json. Open index.html for comparison; attach the PNGs to your PR.
Viewport sizes are CSS pixels; PNG dimensions are multiplied by --scale.
Page clocks advance by --time then pause; CSS transitions are disabled and
CSS animations are held at the same time. Reduced motion may hide artwork.
Exit: 0 success, 1 runtime/capture failure, 2 usage/precondition error,
3 missing dependency. Output directory goes to stdout; progress to stderr.
`;

function failure(message, exitCode = EXIT.runtime) {
  return Object.assign(new Error(message), { exitCode });
}

export function parseOptions(args) {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
      help: { type: "boolean", short: "h" },
      page: { type: "string", short: "p", default: "/" },
      selector: { type: "string", short: "s" },
      viewport: { type: "string", short: "w", default: "both" },
      scale: { type: "string", short: "d", default: "2" },
      offset: { type: "string", short: "y", default: "32" },
      motion: { type: "string", short: "m", default: "normal" },
      time: { type: "string", short: "t", default: String(DEFAULT_CAPTURE_TIME_MS) },
      output: { type: "string", short: "o" },
      "no-build": { type: "boolean", default: false },
    } });
    if (values.help) return { help: true };
    if (positionals.length < 1 || positionals.length > 2 || positionals.some((path) => !path)) throw new Error("Provide BEFORE and optionally AFTER checkout paths");
    for (const [name, value] of Object.entries(values)) if (value === "") throw new Error("--" + name + " cannot be empty");
    if (!values.page.startsWith("/") || values.page.startsWith("//") || values.page.includes("\\")) throw new Error("--page must be a local absolute path such as /about/");
    const number = (name, min, max) => {
      if (!/^\d+$/.test(values[name]) || Number(values[name]) < min || Number(values[name]) > max) throw new Error("--" + name + " must be an integer from " + min + " to " + max);
      return Number(values[name]);
    };
    const scale = number("scale", 1, 4);
    const offset = number("offset", 0, 4095);
    const time = number("time", 0, 10000);
    if (!["normal", "reduced"].includes(values.motion)) throw new Error("--motion must be normal or reduced");
    let views;
    if (values.viewport === "both") views = Object.entries(PRESETS);
    else if (Object.hasOwn(PRESETS, values.viewport)) views = [[values.viewport, PRESETS[values.viewport]]];
    else {
      const match = /^(\d+)x(\d+)$/.exec(values.viewport);
      if (!match || match.slice(1).some((size) => Number(size) < 200 || Number(size) > 4096)) throw new Error("--viewport must be both, desktop, mobile, or WIDTHxHEIGHT with dimensions from 200 to 4096");
      views = [["custom", { width: Number(match[1]), height: Number(match[2]) }]];
    }
    if (views.some(([, view]) => offset >= view.height)) throw new Error("--offset must be smaller than every viewport height");
    return { ...values, scale, offset, time, views, before: resolve(positionals[0]), after: resolve(positionals[1] || ".") };
  } catch (error) {
    error.exitCode = EXIT.usage;
    throw error;
  }
}

async function command(name, args, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(name, args, { cwd, stdio: ["ignore", "pipe", "pipe"], timeout: BUILD_TIMEOUT_MS });
    let output = "";
    let errors = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { errors += data; });
    child.on("error", (error) => reject(failure(error.message, error.code === "ENOENT" ? EXIT.dependency : EXIT.runtime)));
    child.on("close", (code, signal) => code === 0 ? accept(output.trim()) : reject(failure(name + " " + args.join(" ") + " failed" + (signal ? " (" + signal + ")" : "") + ":\n" + errors + output)));
  });
}

function inside(root, path) {
  const part = relative(root, path);
  return part !== ".." && !part.startsWith(".." + sep) && !isAbsolute(part);
}

async function canonicalDestination(path) {
  const suffix = [];
  let ancestor = path;
  while (!existsSync(ancestor)) {
    suffix.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  return resolve(await realpath(ancestor), ...suffix);
}

export async function serve(directory) {
  const root = await realpath(directory);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const target = resolve(root, "." + pathname, pathname.endsWith("/") ? "index.html" : "");
      if (!inside(root, target) || !inside(root, await realpath(target))) throw new Error("Outside capture root");
      const data = await readFile(target);
      response.writeHead(200, { "Content-Type": TYPES[extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
      response.end(data);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
    }
  });
  await new Promise((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  return { url: "http://127.0.0.1:" + server.address().port, close: () => new Promise((accept, reject) => {
    server.close((error) => error ? reject(error) : accept());
    server.closeAllConnections();
  }) };
}

async function bounded(promise, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(failure(message)), TIMEOUT_MS); })]);
  } finally { clearTimeout(timer); }
}

export async function capture(browser, origin, options, viewport, file) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: options.scale, colorScheme: "dark", reducedMotion: options.motion === "reduced" ? "reduce" : "no-preference", locale: "en-US", timezoneId: "UTC" });
  const errors = [];
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) errors.push("HTTP " + response.status() + " " + new URL(response.url()).pathname); });
    page.on("requestfailed", (request) => errors.push("Request failed: " + request.url()));
    await page.clock.install({ time: new Date(CLOCK_START.getTime() - 1000) });
    await page.clock.pauseAt(CLOCK_START);
    const url = new URL(options.page, origin);
    const anchor = decodeURIComponent(url.hash.slice(1));
    url.hash = "";
    const response = await page.goto(url.href, { waitUntil: "load" });
    if (!response?.ok()) throw failure("Page failed to load: " + options.page);
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; } *, *::before, *::after { transition: none !important; caret-color: transparent !important; }" });
    await bounded(page.evaluate(async () => {
      for (const image of document.images) image.loading = "eager";
      await document.fonts.ready;
      await Promise.all([...document.images].map(async (image) => {
        if (!image.currentSrc && !image.src) return;
        try { await image.decode(); }
        catch { throw new Error("Image failed to decode: " + image.getAttribute("src")); }
        if (!image.naturalWidth) throw new Error("Image did not load: " + image.getAttribute("src"));
      }));
    }), "Timed out waiting for fonts and images");
    const target = options.selector || (anchor ? await page.evaluate((id) => "#" + CSS.escape(id), anchor) : null);
    const align = async () => {
      if (!target) return page.evaluate(() => scrollTo(0, 0));
      return page.evaluate(({ target, offset }) => {
        const elements = document.querySelectorAll(target);
        if (elements.length !== 1) throw new Error("Expected one element for " + target + "; found " + elements.length);
        const bounds = elements[0].getBoundingClientRect();
        if (!bounds.width || !bounds.height) throw new Error("Alignment target is hidden: " + target);
        scrollTo({ top: bounds.top + scrollY - offset, left: 0, behavior: "instant" });
        dispatchEvent(new Event("scroll"));
      }, { target, offset: options.offset });
    };
    await align();
    await page.clock.runFor(options.time);
    await page.evaluate((time) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
    }, options.time);
    const state = await page.evaluate((target) => ({
      viewport: { width: innerWidth, height: innerHeight },
      scale: devicePixelRatio,
      scrollY,
      targetTop: target ? document.querySelector(target).getBoundingClientRect().top : null,
      title: document.title,
    }), target);
    if (state.viewport.width !== viewport.width || state.viewport.height !== viewport.height || state.scale !== options.scale) throw failure("Browser viewport or pixel density did not match the requested capture");
    if (errors.length) throw failure("Page errors:\n" + errors.join("\n"));
    const png = await page.screenshot({ path: file, type: "png", scale: "device", animations: "allow" });
    const pixels = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    if (pixels.width !== viewport.width * options.scale || pixels.height !== viewport.height * options.scale) throw failure("Screenshot dimensions did not match the requested pixel density");
    return { ...state, pixels, target, file: basename(file) };
  } finally { await context.close(); }
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function report(metadata) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Before and after screenshots</title>
<style>body{margin:0;padding:24px;background:#111;color:#eee;font:16px system-ui}h1{font-size:24px}p{line-height:1.5}a{color:#78ebff}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}figure{margin:0;min-width:0}figcaption{padding:12px 0}img{display:block;width:100%;height:auto}section{margin:32px 0}code{overflow-wrap:anywhere}@media(max-width:700px){.pair{grid-template-columns:1fr}}${viewerStyles}</style>
<h1>Before and after screenshots</h1>
<p><code>${escapeHtml(metadata.page)}</code> &middot; ${escapeHtml(metadata.selector || "Page anchor or top")} &middot; ${metadata.scale}x density &middot; ${escapeHtml(metadata.motion)} motion &middot; ${metadata.time} ms</p>
<p>Click an image to enlarge it and toggle between Before and After. Attach the PNG files to the pull request.</p>
${metadata.pairs.map((pair) => `<section><h2>${escapeHtml(pair.view)}</h2><div class="pair">${["before", "after"].map((side) => `<figure><figcaption>${side === "before" ? "Before" : "After"} &middot; ${escapeHtml(metadata.sources[side].name)} &middot; ${pair[side].pixels.width} &times; ${pair[side].pixels.height}<br><code>${escapeHtml(metadata.sources[side].commit?.slice(0, 12) || "Unversioned")}</code>${metadata.sources[side].dirty ? " + uncommitted edits" : ""}</figcaption><a class="capture-link" data-side="${side}" data-width="${pair[side].pixels.width}" data-height="${pair[side].pixels.height}" href="${pair[side].file}"><img src="${pair[side].file}" style="max-width:${pair[side].pixels.width / metadata.scale}px" alt="${side} ${escapeHtml(pair.view)}"></a></figure>`).join("")}</div></section>`).join("\n")}
${viewerMarkup}
<script>(${installViewer.toString()})()</script>
</html>\n`;
}

async function describe(root) {
  try {
    return { name: basename(root), commit: await command("git", ["rev-parse", "HEAD"], root), dirty: Boolean(await command("git", ["status", "--porcelain", "--untracked-files=normal"], root)) };
  } catch { return { name: basename(root), commit: null, dirty: null }; }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) { process.stdout.write(HELP); return; }
  for (const root of new Set([options.before, options.after])) {
    if (!existsSync(join(root, options["no-build"] ? "dist/index.html" : "package.json"))) throw failure("Missing " + (options["no-build"] ? "dist/index.html" : "package.json") + " in " + root, EXIT.usage);
    if (!options["no-build"] && !existsSync(join(root, "node_modules/.bin/eleventy"))) throw failure("Missing build dependencies in " + root + "; run npm ci there", EXIT.dependency);
  }
  options.before = await realpath(options.before);
  options.after = await realpath(options.after);
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch { throw failure("Missing Playwright; run npm ci in the tooling checkout", EXIT.dependency); }
  if (!existsSync(chromium.executablePath())) throw failure("Missing Chromium; run npm run screenshots:install in the tooling checkout", EXIT.dependency);
  const output = await canonicalDestination(resolve(options.output || join(".screenshots", new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID().slice(0, 8))));
  if ([options.before, options.after].some((root) => inside(join(root, "dist"), output))) throw failure("Output must be outside both dist directories so builds cannot remove it", EXIT.usage);
  if (existsSync(output) && (await readdir(output)).length) throw failure("Output directory must be empty: " + output, EXIT.usage);
  await mkdir(output, { recursive: true });
  const metadata = { page: options.page, selector: options.selector || null, scale: options.scale, offset: options.offset, motion: options.motion, time: options.time, built: !options["no-build"], sources: {}, pairs: [] };
  const servers = [];
  let browser;
  try {
    for (const root of new Set([options.before, options.after])) {
      if (!options["no-build"]) { console.error("Building " + root); await command("npm", ["run", "build"], root); }
    }
    for (const side of ["before", "after"]) {
      metadata.sources[side] = await describe(options[side]);
      servers.push(await serve(join(options[side], "dist")));
    }
    browser = await chromium.launch();
    metadata.browser = browser.version();
    for (const [view, viewport] of options.views) {
      const pair = { view };
      for (const [index, side] of ["before", "after"].entries()) {
        console.error("Capturing " + view + " " + side);
        pair[side] = await bounded(capture(browser, servers[index].url, options, viewport, join(output, view + "-" + side + ".png")), "Timed out capturing " + view + " " + side);
      }
      if (Math.abs(pair.before.targetTop - pair.after.targetTop) > ALIGNMENT_TOLERANCE) throw failure("The " + view + " targets could not align within one CSS pixel (before " + pair.before.targetTop + ", after " + pair.after.targetTop + "). Try a different selector, smaller viewport height, or --offset 0");
      metadata.pairs.push(pair);
    }
    await writeFile(join(output, "capture.json"), JSON.stringify(metadata, null, 2) + "\n");
    await writeFile(join(output, "index.html"), report(metadata));
  } catch (error) {
    await writeFile(join(output, "failure.json"), JSON.stringify({ error: error.message, ...metadata }, null, 2) + "\n");
    console.error("Incomplete capture: " + output);
    throw error;
  } finally {
    const cleanup = await Promise.allSettled([...(browser ? [browser.close()] : []), ...servers.map((server) => server.close())]);
    const failed = cleanup.find((result) => result.status === "rejected");
    if (failed) throw failure("Capture cleanup failed: " + failed.reason.message);
  }
  console.log(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error("screenshots: " + error.message); process.exitCode = error.exitCode || EXIT.runtime; });
}
