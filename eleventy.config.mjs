import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildCover } from "./scripts/build-cover.mjs";

const PUBLIC_ASSETS = [
  "*.svg",
  "*.png",
  "*.css",
  "logo-motion.js",
  "logo-webgl.js",
  "edge-smoke.js",
  "site-init.js",
  "manifest.webmanifest",
  "_headers",
  "about/*.css",
  "about/*.js",
  "about/portraits/*.{png,jpg,jpeg,webp,avif}",
];
const PERSON_NUMBER_WIDTH = 2;
const ASSET_VERSION_LENGTH = 12;

export default function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({
    autoescape: true,
    throwOnUndefined: true,
  });
  eleventyConfig.addFilter("personNumber", (index) => String(index).padStart(PERSON_NUMBER_WIDTH, "0"));
  eleventyConfig.addFilter("displayUrl", (url) => url.replace(/^https?:\/\//i, ""));
  eleventyConfig.addFilter("canonicalUrl", (url, origin) => new URL(url.replace(/index\.html$/, ""), origin).href);
  eleventyConfig.addFilter("assetVersion", (path) => createHash("sha256")
    .update(readFileSync(new URL(path, import.meta.url)))
    .digest("hex").slice(0, ASSET_VERSION_LENGTH));
  eleventyConfig.addWatchTarget("./*.css");
  eleventyConfig.addWatchTarget("./about/*.css");
  for (const asset of PUBLIC_ASSETS) eleventyConfig.addPassthroughCopy(asset);
  eleventyConfig.on("eleventy.after", async ({ directories, outputMode }) => {
    if (outputMode === "fs") await buildCover(directories.output);
  });

  return {
    dir: { input: "src", output: "dist" },
    templateFormats: ["njk"],
  };
}
