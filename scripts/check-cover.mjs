import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildCover } from "./build-cover.mjs";

const CLOCK_PROBE = `<script>
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) throw new Error('Motion must be disabled');
if (getComputedStyle(document.querySelector('h1')).animationName !== 'none') throw new Error('CSS animation must be disabled');
const advance = () => { document.querySelector('h1').textContent = 'Clock advanced'; };
setTimeout(advance, 1);
requestAnimationFrame(advance);
</script>`;
const fixture = (title) => `<!doctype html><html><meta charset="utf-8"><title>Cover fixture</title><style>
body { margin: 0; background: black; color: white; font: 40px sans-serif; }
h1 { animation: move 1s infinite; }
@keyframes move { to { transform: translateX(400px); } }
@media (prefers-reduced-motion: reduce) { h1 { animation: none; } }
</style><h1>${title}</h1></html>`;

test("cover stays at second zero, refreshes changed pixels, and preserves the last valid image on failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "project-cover-"));
  try {
    const output = join(root, "dist");
    const destination = join(root, "docs/screenshots/cover.png");
    await mkdir(output);
    await writeFile(join(output, "index.html"), fixture("Opening frame") + CLOCK_PROBE);
    assert.equal(await buildCover(output, destination), true);
    const original = await readFile(destination);
    const modifiedAt = (await stat(destination)).mtimeMs;
    assert.equal(original.readUInt32BE(16), 1440);
    assert.equal(original.readUInt32BE(20), 1000);
    assert.equal(await buildCover(output, destination), false);
    assert.equal((await stat(destination)).mtimeMs, modifiedAt, "Identical builds must not rewrite the PNG");

    await writeFile(join(output, "index.html"), fixture("Opening frame"));
    assert.equal(await buildCover(output, destination), false, "Timers and animation frames must leave the cover identical to the static opening frame");

    await writeFile(join(output, "index.html"), fixture("Updated source") + CLOCK_PROBE);
    assert.equal(await buildCover(output, destination), true);
    const updated = await readFile(destination);
    assert.notDeepEqual(updated, original, "A rendered source change must refresh the cover");

    await writeFile(join(output, "index.html"), fixture("Broken page") + '<img src="missing.png">');
    await assert.rejects(buildCover(output, destination), /missing.png/);
    assert.deepEqual(await readFile(destination), updated, "A failed capture must preserve the last valid cover");
    assert.deepEqual(await readdir(join(root, "docs/screenshots")), ["cover.png"], "Capture temporary files must be cleaned up");
  } finally { await rm(root, { recursive: true, force: true }); }
});
