import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import runtime from "./cover-runtime.json" with { type: "json" };

const execute = promisify(execFile);
const require = createRequire(import.meta.url);
const COVER_PATH = fileURLToPath(new URL("../docs/screenshots/cover.png", import.meta.url));
const CAPTURE_TIMEOUT_MS = 120000;
const INSTALL_TIMEOUT_MS = 600000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function clientDirectory(name) {
  const path = require.resolve(name + "/package.json");
  if (require(path).version !== runtime.playwright) {
    throw new Error("Cover runtime and Playwright versions differ; update scripts/cover-runtime.json with the locked Playwright dependency and run npm run cover:install");
  }
  return dirname(path);
}

async function docker(args, options = {}) {
  try {
    return await execute("docker", args, { timeout: CAPTURE_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES, encoding: null, ...options });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    const missing = error.code === "ENOENT" || /No such image/.test(detail);
    const guidance = /bind source path does not exist/.test(detail)
      ? "Share the checkout and built output directories with the Docker engine; see docs/screenshots/README.md"
      : "Ensure Docker is running and run npm run cover:install";
    throw Object.assign(new Error((error.code === "ENOENT" ? "Docker is required for the project cover" : detail) + "\n" + guidance, { cause: error }), { exitCode: missing ? 3 : 1 });
  }
}

function mount(source, target) {
  return ["type=bind", "source=" + source, "target=" + target, "readonly"]
    .map((field) => /[",]/.test(field) ? '"' + field.replaceAll('"', '""') + '"' : field).join(",");
}

export async function installCoverRuntime() {
  clientDirectory("playwright");
  clientDirectory("playwright-core");
  console.error("[cover] Installing " + runtime.image + " (" + runtime.platform + ")");
  const { stdout, stderr } = await docker(["pull", "--platform", runtime.platform, runtime.image], { timeout: INSTALL_TIMEOUT_MS, encoding: "utf8" });
  process.stderr.write(stdout + stderr);
  return runtime.image;
}

export async function buildCover(outputDirectory, destination = COVER_PATH) {
  const started = performance.now();
  const id = randomUUID();
  const container = "strangelasers-cover-" + id;
  const temporary = destination + "." + id + ".tmp";
  let completed = false;
  let attempted = false;
  try {
    const site = await realpath(outputDirectory);
    const scripts = fileURLToPath(new URL(".", import.meta.url));
    const playwright = clientDirectory("playwright");
    const core = clientDirectory("playwright-core");
    attempted = true;
    const { stdout: image } = await docker([
      "run", "--rm", "--pull=never", "--name", container,
      "--platform", runtime.platform, "--network", "none", "--init", "--shm-size=512m",
      "--env", "TZ=UTC", "--env", "LANG=C.UTF-8",
      "--mount", mount(site, "/site"),
      "--mount", mount(scripts, "/capture/scripts"),
      "--mount", mount(playwright, "/capture/node_modules/playwright"),
      "--mount", mount(core, "/capture/node_modules/playwright-core"),
      runtime.image, "node", "/capture/scripts/capture-cover.mjs",
    ]);
    completed = true;
    if (!image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) throw new Error("Cover capture did not return a PNG");
    const previous = await readFile(destination).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const changed = !previous || !image.equals(previous);
    if (changed) {
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(temporary, image);
      await rename(temporary, destination);
    }
    console.error(`[cover] result=${changed ? "updated" : "unchanged"} path=${JSON.stringify(relative(process.cwd(), destination))} capture=${id} duration_ms=${Math.round(performance.now() - started)}`);
    return changed;
  } catch (error) {
    console.error(`[cover] result=failed capture=${id} duration_ms=${Math.round(performance.now() - started)} container=${container}`);
    throw error;
  } finally {
    if (attempted && !completed) {
      await execute("docker", ["rm", "--force", container], { timeout: 10000 }).catch((error) => {
        if (error.code !== "ENOENT" && !/No such container/.test(error.stderr || "")) console.error("[cover] Cleanup failed for " + container + ": " + error.message);
      });
    }
    await rm(temporary, { force: true });
  }
}
