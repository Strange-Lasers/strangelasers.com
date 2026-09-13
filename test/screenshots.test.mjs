import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseOptions, report, serve } from "../scripts/screenshots.mjs";

const script = fileURLToPath(new URL("../scripts/screenshots.mjs", import.meta.url));

test("screenshot CLI accepts option forms, positionals, anchors, and viewport presets", () => {
  const a = parseOptions(["before", "--page=/about/", "after", "--selector=#rohith", "--scale=3", "--no-build"]);
  const b = parseOptions(["-p/about/", "-s#rohith", "-d3", "--no-build", "--", "before", "after"]);
  assert.deepEqual(a, b);
  assert.equal(a.views.length, 2);
  assert.equal(parseOptions(["before", "-w", "390x1200"]).views[0][1].height, 1200);
  assert.equal(parseOptions(["before", "-w", "mobile"]).views[0][1].width, 390);
  assert.equal(parseOptions(["before", "-hp/about/"]).help, true);
  assert.equal(parseOptions(["before", "-p", "/about/#rohith"]).page, "/about/#rohith");
  assert.equal(parseOptions(["--", "-before"]).before.endsWith("-before"), true);
});

test("screenshot CLI rejects invalid or incomplete capture requests", () => {
  for (const args of [[], ["a", "b", "c"], ["a", "--bogus"], ["a", "--page"], ["a", "--page="], ["a", "--selector="], ["a", "-p", "https://example.com"], ["a", "-p", "//example.com"], ["a", "-p", "/\\example.com"], ["a", "-d", "0"], ["a", "-d", "2.5"], ["a", "-w", "3x4"], ["a", "-w", "desktop,mobile"], ["a", "-t", "NaN"], ["a", "-m", "auto"], ["a", "-y", "999"], ["a", "-o", ""]]) {
    assert.throws(() => parseOptions(args), (error) => error.exitCode === 2, args.join(" "));
  }
});

test("screenshot help and usage errors work without capture dependencies", () => {
  for (const flag of ["-h", "--help"]) {
    const result = spawnSync(process.execPath, [script, flag], { encoding: "utf8", env: { PATH: "/nonexistent" } });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.equal(result.stderr, "");
  }
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Provide BEFORE/);
});

test("screenshot server serves nested pages and rejects traversal and escaping symlinks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "screenshots-server-"));
  let server;
  try {
    await mkdir(join(directory, "dist/about"), { recursive: true });
    await writeFile(join(directory, "dist/about/index.html"), "<h1>About</h1>");
    await writeFile(join(directory, "private.txt"), "private");
    await symlink(join(directory, "private.txt"), join(directory, "dist/leak.txt"));
    server = await serve(join(directory, "dist"));
    const response = await fetch(server.url + "/about/?v=1");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/html");
    assert.equal(await response.text(), "<h1>About</h1>");
    for (const path of ["/%2e%2e%2fprivate.txt", "/leak.txt", "/missing", "/%zz"]) assert.equal((await fetch(server.url + path)).status, 404, path);
    await server.close();
    await assert.rejects(fetch(server.url));
    server = null;
  } finally {
    if (server) await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("comparison report escapes page and checkout labels", () => {
  const capture = { pixels: { width: 2880, height: 2000 }, file: "desktop-before.png" };
  const html = report({ page: '/<script>alert("x")</script>', selector: "#target", scale: 2, time: 1000, motion: "normal", sources: { before: { name: "<before>" }, after: { name: "after" } }, pairs: [{ view: "desktop", before: capture, after: capture }] });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;before&gt;/);
  assert.match(html, /href="desktop-before.png"/);
});
