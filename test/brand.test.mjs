import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ROOT, buildStaticAssets, parseOptions, parsePalette, renderTemplate } from "../scripts/build-brand.mjs";

const read = (name) => readFileSync(resolve(ROOT, name), "utf8");
const assets = buildStaticAssets();
const palette = parsePalette(read("palette.css"));
const script = resolve(ROOT, "scripts/build-brand.mjs");

test("generated static SVGs match the source templates and palette", () => {
  for (const [name, expected] of assets) assert.equal(read(name), expected, name);
});

test("exports are self-contained with unique IDs and resolved local references", () => {
  for (const [name, svg] of [...assets, ["mark-motion-initial.svg", read("mark-motion-initial.svg")]]) {
    assert.doesNotMatch(svg, /\{\{|var\(--|file:\/\/|#5955df/i, name);
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, name + " duplicate IDs");
    for (const [, urlId, hrefId] of svg.matchAll(/url\(#([^)]+)\)|\bhref="#([^"]+)"/g)) {
      assert.ok(unique.has(urlId || hrefId), name + " unresolved reference " + (urlId || hrefId));
    }
  }
});

test("mark uses fine white cores and the shared purple-to-cyan eye edge", () => {
  const mark = assets.get("mark-transparent.svg");
  assert.match(mark, /id="eye-edge" x1="0%" y1="0%" x2="0%" y2="100%"/);
  assert.ok(mark.includes('offset="0.25" stop-color="' + palette.get("laser-purple-body") + '"'));
  assert.ok(mark.includes('offset="0.75" stop-color="' + palette.get("laser-cyan-body") + '"'));
  assert.match(mark, /stroke="url\(#eye-edge\)" stroke-width="10"/);
  assert.match(mark, /stroke="#f7fdff" stroke-width="3" opacity="0.88"/);
  assert.match(mark, /stroke="#f7fdff" stroke-width="1"/);
  assert.doesNotMatch(mark, /<rect width="512" height="512"/);
  assert.match(assets.get("mark.svg"), /<rect width="512" height="512" fill="url\(#background\)"/);
});

test("wordmark preserves letter colors, A masks, and opaque fine-outline flares", () => {
  const wordmark = assets.get("wordmark.svg");
  assert.match(wordmark, /viewBox="40 15 680 250"/);
  assert.match(wordmark, /translate\(95 130\)[^>]+fill="#7857ff"/);
  assert.match(wordmark, /translate\(95 240\)[^>]+fill="#78ebff"/);
  assert.match(wordmark, /mask="url\(#strange-angle-a-through-cut\)"/);
  assert.match(wordmark, /mask="url\(#lasers-angle-a-through-cut\)"/);
  const flareStart = wordmark.indexOf('transform="rotate(');
  assert.ok(flareStart > 0);
  const flares = wordmark.slice(flareStart);
  assert.match(flares, /stroke-width="1"/);
  assert.match(flares, /stroke-width="2.15"/);
  assert.match(flares, /stroke-width="1.9"/);
  for (const element of flares.match(/<(?:g|path|line|circle)\b[^>]*>/g)) {
    if (!element.includes("filter=")) {
      assert.doesNotMatch(element, /(?:fill-|stroke-)?opacity="0\./, element);
    }
  }
});

test("palette substitution rejects missing or unsafe values", () => {
  assert.equal(renderTemplate("{{color}} {{width}}", new Map([["color", "#123abc"], ["width", ".88"]])), "#123abc .88");
  assert.throws(() => renderTemplate("{{missing}}", palette), /Missing or invalid/);
  assert.throws(() => renderTemplate("{{color}}", new Map([["color", 'red" onload="alert(1)']])), /Missing or invalid/);
});

test("CLI parses aliases, bundled flags, terminators, and invalid combinations", () => {
  assert.ok(parseOptions(["-h"]).help);
  assert.ok(parseOptions(["--check", "--"]).check);
  assert.deepEqual({ ...parseOptions(["-po"]) }, { png: true, opening: true });
  for (const args of [["--unknown"], ["file.svg"], ["--check=true"], ["-cp"], ["--check", "--opening"]]) {
    assert.throws(() => parseOptions(args), (error) => error.exitCode === 2);
  }
});

test("help and check require no optional tools and errors use stderr", () => {
  const run = (...args) => spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", env: { ...process.env, PATH: "" },
  });
  const help = run("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^Usage:/);
  assert.equal(help.stderr, "");
  const check = run("--check");
  assert.equal(check.status, 0, check.stderr);
  assert.equal(check.stdout + check.stderr, "");
  const invalid = run("--unknown");
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /build-brand:/);
  for (const flag of ["--png", "--opening"]) {
    const missing = run(flag);
    assert.equal(missing.status, 3);
    assert.equal(missing.stdout, "");
    assert.match(missing.stderr, /Missing dependency:/);
  }
});

test("manifest PNGs have the required dimensions", () => {
  for (const size of [192, 512]) {
    const png = readFileSync(resolve(ROOT, "icon-" + size + ".png"));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
