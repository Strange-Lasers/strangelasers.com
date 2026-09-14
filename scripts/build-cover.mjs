import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { capture, PRESETS, serve } from "./screenshots.mjs";

const COVER_PATH = fileURLToPath(new URL("../docs/screenshots/cover.png", import.meta.url));
const COVER_OPTIONS = Object.freeze({ page: "/", scale: 1, motion: "reduced", time: 0, offset: 0 });

export async function buildCover(outputDirectory, destination = COVER_PATH) {
  if (!existsSync(chromium.executablePath())) {
    throw new Error("Project cover needs Chromium; run npm run screenshots:install (on Linux, add -- --with-deps)");
  }
  const started = performance.now();
  const temporary = destination + "." + randomUUID() + ".tmp";
  let browser;
  let server;
  try {
    browser = await chromium.launch();
    server = await serve(outputDirectory);
    await mkdir(dirname(destination), { recursive: true });
    await capture(browser, server.url, COVER_OPTIONS, PRESETS.desktop, temporary);
    const image = await readFile(temporary);
    const previous = await readFile(destination).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const changed = !previous || !image.equals(previous);
    if (changed) await rename(temporary, destination);
    console.error("[cover] " + (changed ? "Updated " : "Unchanged ") + relative(process.cwd(), destination) + " (0 ms, reduced motion; " + Math.round(performance.now() - started) + " ms capture)");
    return changed;
  } finally {
    const cleanup = await Promise.allSettled([
      ...(browser ? [browser.close()] : []),
      ...(server ? [server.close()] : []),
      rm(temporary, { force: true }),
    ]);
    const failed = cleanup.find((result) => result.status === "rejected");
    if (failed) throw new Error("Project cover cleanup failed: " + failed.reason.message);
  }
}
