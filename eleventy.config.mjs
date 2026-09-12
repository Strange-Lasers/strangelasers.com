const PUBLIC_ASSETS = [
  "*.svg",
  "*.png",
  "*.css",
  "logo-motion.js",
  "logo-webgl.js",
  "site-init.js",
  "manifest.webmanifest",
  "about/*.css",
  "about/*.js",
  "about/portraits/*.{png,jpg,jpeg,webp,avif}",
];
const PERSON_NUMBER_WIDTH = 2;

export default function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({
    autoescape: true,
    throwOnUndefined: true,
  });
  eleventyConfig.addFilter("personNumber", (index) => String(index).padStart(PERSON_NUMBER_WIDTH, "0"));
  for (const asset of PUBLIC_ASSETS) eleventyConfig.addPassthroughCopy(asset);

  return {
    dir: { input: "src", output: "dist" },
    templateFormats: ["njk"],
  };
}
