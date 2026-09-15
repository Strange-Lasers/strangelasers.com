import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { capture, PRESETS, serve } from "./screenshots.mjs";

const COVER_OPTIONS = Object.freeze({ page: "/", scale: 1, motion: "reduced", time: 0, offset: 0 });
const BROWSER_ARGS = Object.freeze([
  "--disable-gpu",
  "--disable-skia-runtime-opts",
  "--force-color-profile=srgb",
]);
const OUTPUT_PATH = "/tmp/cover.png";

async function main() {
  if (process.platform !== "linux" || process.arch !== "x64") throw new Error("Cover capture must run in the pinned linux/amd64 container; use npm run cover");
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  let server;
  let image;
  try {
    server = await serve("/site");
    await capture(browser, server.url, COVER_OPTIONS, PRESETS.desktop, OUTPUT_PATH);
    image = await readFile(OUTPUT_PATH);
  } finally {
    const cleanup = await Promise.allSettled([browser.close(), ...(server ? [server.close()] : [])]);
    const failed = cleanup.find((result) => result.status === "rejected");
    if (failed) throw new Error("Cover capture cleanup failed: " + failed.reason.message);
  }
  process.stdout.write(image);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
