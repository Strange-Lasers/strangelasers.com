import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
const HELP = [
  "Usage: node scripts/build-brand.mjs [options]",
  "",
  "Generate self-contained mark, wordmark, and combined-logo SVGs from",
  "brand/*.svg.template and palette.css in this checkout.",
  "",
  "  -h, --help     Show this help",
  "  -c, --check    Check static SVGs without writing (not with -p or -o)",
  "  -p, --png      Also regenerate icon-192.png and icon-512.png",
  "  -o, --opening  Also capture mark-motion-initial.svg from the SVG renderer",
  "",
  "Requires Node.js 22+. No environment variables or npm packages are needed.",
  "PNG generation requires ImageMagick 7 with SVG support (magick on PATH).",
  "Opening capture requires agent-browser and its installed Chromium.",
  "Templates use {{token-name}} placeholders for CSS custom properties.",
  "Colors are six-digit hex values; treatment widths and stops are numbers.",
  "",
  "Exit: 0 success, 1 stale outputs or runtime failure, 2 usage/precondition",
  "error, 3 missing optional dependency. Generated paths go to stdout;",
  "diagnostics go to stderr.",
  "",
].join("\n");

export function parseOptions(args) {
  try {
    const { values } = parseArgs({
      args,
      options: {
        help: { type: "boolean", short: "h" },
        check: { type: "boolean", short: "c" },
        png: { type: "boolean", short: "p" },
        opening: { type: "boolean", short: "o" },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.check && (values.png || values.opening)) {
      throw new Error("--check cannot be combined with --png or --opening");
    }
    return values;
  } catch (error) {
    error.exitCode = 2;
    throw error;
  }
}

export function parsePalette(css) {
  return new Map([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)]
    .map(([, name, value]) => [name, value.trim()]));
}

export function renderTemplate(template, palette) {
  return template.replace(/\{\{([\w-]+)\}\}/g, (_, token) => {
    const value = palette.get(token);
    if (!value || !/^(#[\da-f]{6}|\d*\.?\d+)$/i.test(value)) {
      throw new Error("Missing or invalid palette token: " + token);
    }
    return value;
  });
}

function svgParts(svg) {
  const definitions = svg.match(/<defs>([\s\S]*?)<\/defs>/)?.[1];
  if (!definitions) throw new Error("Brand template has no SVG definitions");
  const body = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/g, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/g, "")
    .replace(/<defs>[\s\S]*?<\/defs>/, "").trim();
  return { definitions: "\n" + definitions.trim() + "\n", body };
}

export function buildStaticAssets(root = ROOT) {
  const palette = parsePalette(readFileSync(resolve(root, "palette.css"), "utf8"));
  const render = (name) => renderTemplate(
    readFileSync(resolve(root, "brand", name + ".svg.template"), "utf8"),
    palette,
  );
  const mark = render("mark");
  const wordmark = render("wordmark");
  const markParts = svgParts(mark);
  const wordParts = svgParts(wordmark);
  const tile = mark.replace("</defs>", '</defs>\n  <rect width="512" height="512" fill="url(#background)"/>');
  const logo = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 360" role="img" aria-labelledby="logo-title logo-desc">',
    '  <title id="logo-title">Strange Lasers</title>',
    '  <desc id="logo-desc">A cyan and violet laser-eye mark beside the outlined Strange Lasers wordmark with woven laser beams and colored flares</desc>',
    "  <defs>" + markParts.definitions + wordParts.definitions + "</defs>",
    '  <g transform="translate(34 34) scale(.57)">' + markParts.body + "</g>",
    '  <g transform="translate(305 48)">' + wordParts.body + "</g>",
    "</svg>",
    "",
  ].join("\n");
  return new Map([
    ["mark-transparent.svg", mark],
    ["mark.svg", tile],
    ["wordmark.svg", wordmark],
    ["logo.svg", logo],
  ]);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 60000,
    ...options,
  });
  if (result.error?.code === "ENOENT") {
    throw Object.assign(new Error("Missing dependency: " + command), { exitCode: 3 });
  }
  if (result.error || result.status !== 0) {
    throw new Error(command + " failed: " + (result.error?.message || result.stderr || result.stdout));
  }
  return result.stdout;
}

function captureOpening() {
  pauseAnimation();
  for (const mark of renderedMarks) {
    mark.eyeDot.classList.remove(EYE_TRACKING_ACTIVE_CLASS);
    mark.currentEyeOffset = EYE_CENTER_OFFSET;
    mark.currentEyeColorProgress = 0;
    positionEyeDot(mark);
  }
  renderPhase(0, 0, 0);
  const source = renderedMarks[0].svg;
  const svg = source.cloneNode(true);
  const originalNodes = [source, ...source.querySelectorAll("*")];
  const copiedNodes = [svg, ...svg.querySelectorAll("*")];
  const properties = [
    "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "fill-opacity", "stroke-opacity", "opacity", "filter", "mask", "display",
  ];
  originalNodes.forEach((original, index) => {
    const copy = copiedNodes[index];
    if (!["svg", "g", "path", "circle", "rect", "use"].includes(original.localName)) return;
    const computed = getComputedStyle(original);
    copy.removeAttribute("style");
    for (const property of properties) {
      const value = computed.getPropertyValue(property)
        .replace(/url\(["']?[^)"']*#([^)"']+)["']?\)/g, "url(#$1)");
      if (value) copy.setAttribute(property, value);
    }
    if (computed.mixBlendMode !== "normal") {
      copy.style.setProperty("mix-blend-mode", computed.mixBlendMode);
    }
  });
  svg.removeAttribute("aria-hidden");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-labelledby", "opening-title");
  const title = document.createElementNS(svg.namespaceURI, "title");
  title.id = "opening-title";
  title.textContent = "Strange Lasers animated mark opening";
  svg.prepend(title);
  for (const node of svg.querySelectorAll('[display="none"], path[d=""]')) node.remove();
  for (const node of svg.querySelectorAll("[class]")) node.removeAttribute("class");
  svg.removeAttribute("class");
  const paths = [...svg.querySelectorAll("path[d]")];
  const counts = new Map();
  const geometryIds = new Map();
  for (const path of paths) {
    const data = path.getAttribute("d");
    counts.set(data, (counts.get(data) || 0) + 1);
  }
  for (const path of paths) {
    const data = path.getAttribute("d");
    if (counts.get(data) < 2) continue;
    if (!geometryIds.has(data)) {
      const geometry = document.createElementNS(svg.namespaceURI, "path");
      geometry.id = "opening-path-" + geometryIds.size;
      geometry.setAttribute("d", data);
      svg.querySelector("defs").append(geometry);
      geometryIds.set(data, geometry.id);
    }
    const use = document.createElementNS(svg.namespaceURI, "use");
    for (const attribute of path.attributes) {
      if (attribute.name !== "d") use.setAttribute(attribute.name, attribute.value);
    }
    use.setAttribute("href", "#" + geometryIds.get(data));
    path.replaceWith(use);
  }
  return new XMLSerializer().serializeToString(svg).replace(/></g, ">\n<") + "\n";
}

function buildOpening() {
  run("npm", ["run", "build"], { cwd: ROOT });
  const session = "brand-export-" + process.pid;
  const browser = (args, options) => {
    const response = JSON.parse(run("agent-browser", ["--session", session, "--json", ...args], options));
    if (!response.success) throw new Error(response.error || "Browser export failed");
    return response.data;
  };
  try {
    const url = pathToFileURL(resolve(ROOT, "dist/index.html"));
    url.search = "?renderer=svg";
    browser(["open", url.href]);
    const { result } = browser(["eval", "--stdin"], {
      input: "(" + captureOpening.toString() + ")()",
    });
    if (typeof result !== "string" || !result.startsWith("<svg") ||
        /file:\/\/|var\(--|\{\{/.test(result)) {
      throw new Error("Opening export is not a self-contained SVG");
    }
    writeFileSync(resolve(ROOT, "mark-motion-initial.svg"), result);
    run("npm", ["run", "build"], { cwd: ROOT });
    console.log("mark-motion-initial.svg");
  } finally {
    browser(["close"]);
  }
}

export function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (options.png) run("magick", ["-version"]);
  if (options.opening) run("agent-browser", ["--version"]);
  const assets = buildStaticAssets();
  let stale = false;
  for (const [name, content] of assets) {
    const path = resolve(ROOT, name);
    if (options.check) {
      let existing;
      try { existing = readFileSync(path, "utf8"); } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (existing !== content) {
        console.error("Stale brand asset: " + name);
        stale = true;
      }
    } else {
      writeFileSync(path, content);
      console.log(name);
    }
  }
  if (options.png) {
    for (const size of [192, 512]) {
      const name = "icon-" + size + ".png";
      run("magick", [
        "-background", "none", "-density", "192",
        resolve(ROOT, "mark.svg"), "-resize", size + "x" + size,
        "-strip", "PNG32:" + resolve(ROOT, name),
      ]);
      console.log(name);
    }
  }
  if (options.opening) buildOpening();
  return stale ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = main(); } catch (error) {
    console.error("build-brand: " + error.message);
    process.exitCode = error.exitCode || 1;
  }
}
