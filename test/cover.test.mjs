import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import runtime from "../scripts/cover-runtime.json" with { type: "json" };

const script = fileURLToPath(new URL("../scripts/cover.mjs", import.meta.url));
const withoutDocker = { PATH: "/nonexistent" };
const BUILD_TIMEOUT_MS = 10000;

test("site builds without Docker and leaves the documentation cover unchanged", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const cover = join(root, "docs/screenshots/cover.png");
  const original = await readFile(cover);
  const modifiedAt = (await stat(cover)).mtimeMs;
  const output = await mkdtemp(join(tmpdir(), "strangelasers-build-"));
  try {
    const result = spawnSync(process.execPath, [join(root, "node_modules/@11ty/eleventy/cmd.cjs"), "--output=" + output], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ...withoutDocker },
      timeout: BUILD_TIMEOUT_MS,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    for (const page of ["index.html", "about/index.html"]) {
      assert.match(await readFile(join(output, page), "utf8"), /<!doctype html>/i);
    }
    await assert.rejects(readFile(join(output, "docs/screenshots/cover.png")), { code: "ENOENT" });
    assert.deepEqual(await readFile(cover), original);
    assert.equal((await stat(cover)).mtimeMs, modifiedAt);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test("cover help and invalid arguments do not require Docker", () => {
  for (const args of [["-h"], ["--help"], ["-ih"], ["--help", "--"]]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: withoutDocker });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.equal(result.stderr, "");
  }
  for (const args of [["--bogus"], ["extra"], ["--install=true"], ["--", "extra"]]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: withoutDocker });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /cover:/);
  }
});

test("cover setup reports a missing Docker executable with actionable diagnostics", () => {
  for (const flag of ["-i", "--install"]) {
    const result = spawnSync(process.execPath, [script, flag], { encoding: "utf8", env: withoutDocker });
    assert.equal(result.status, 3);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Docker is required/);
    assert.match(result.stderr, /npm run cover:install/);
  }
});

test("cover image pins the locked Playwright version and a single CPU architecture", async () => {
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(runtime.playwright, lock.packages["node_modules/playwright"].version);
  assert.equal(runtime.playwright, lock.packages["node_modules/playwright-core"].version);
  assert.equal(runtime.platform, "linux/amd64");
  assert.ok(runtime.image.startsWith("mcr.microsoft.com/playwright:v" + runtime.playwright + "-noble@sha256:"));
  assert.match(runtime.image, /@sha256:[a-f0-9]{64}$/);
});
