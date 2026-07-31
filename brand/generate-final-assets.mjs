import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(here);
const AVATAR_SIZE = 1024;
const SITE_ICON_SIZES = Object.freeze([192, 512]);
const REAR_PATH = "M70 362C110 84 402 84 442 362";
const FRONT_PATH = "M64 142C124 426 388 426 448 142";
const WORDMARK_GROUP_FILLS = Object.freeze([
  "#f3f7ff",
  "#39d4f1",
]);
const paletteStyles = readFileSync(
  join(projectRoot, "palette.css"),
  "utf8",
);

function paletteColor(property) {
  const escapedProperty = property.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const match = paletteStyles.match(
    new RegExp(`${escapedProperty}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
  );

  if (!match) {
    throw new Error(`Missing brand color ${property}`);
  }

  return match[1].toLowerCase();
}

const PALETTES = Object.freeze([
  Object.freeze({
    slug: "abyss",
    label: "Abyss",
    sourceSlug: "abyss",
    rear: paletteColor("--laser-cyan-body"),
    rearMid: paletteColor("--laser-cyan-highlight"),
    front: paletteColor("--laser-purple-body"),
    frontMid: paletteColor("--laser-purple-highlight"),
    core: paletteColor("--laser-core"),
    background: paletteColor("--laser-background"),
  }),
  Object.freeze({
    slug: "moon-crimson",
    label: "Moon Crimson",
    sourceSlug: "moon-crimson",
    rear: "#aaa698",
    rearMid: "#fffdf4",
    front: "#db302b",
    frontMid: "#ff7967",
    core: "#fffcef",
    background: "#0b0506",
  }),
]);

function sourcePath(palette, kind) {
  return join(
    here,
    "archive",
    `variants_oculus-shortlist_endpoint-studies_${kind}-${palette.sourceSlug}-counterflow.svg`,
  );
}

function definitions(palette) {
  return `    <linearGradient id="corona-rear" gradientUnits="userSpaceOnUse" x1="64" y1="0" x2="448" y2="0">
      <stop offset="0" stop-color="${palette.rear}"/>
      <stop offset="0.5" stop-color="${palette.rearMid}"/>
      <stop offset="1" stop-color="${palette.rear}"/>
    </linearGradient>
    <linearGradient id="corona-front" gradientUnits="userSpaceOnUse" x1="64" y1="0" x2="448" y2="0">
      <stop offset="0" stop-color="${palette.front}"/>
      <stop offset="0.5" stop-color="${palette.frontMid}"/>
      <stop offset="1" stop-color="${palette.front}"/>
    </linearGradient>
    <filter id="corona-tight-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="corona-wide-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>`;
}

function beam(path, color, core, gradient) {
  return [
    `<path d="${path}" stroke="${color}" stroke-width="90" opacity="0.14" filter="url(#corona-wide-glow)"/>`,
    `<path d="${path}" stroke="${color}" stroke-width="48" opacity="0.22" filter="url(#corona-tight-glow)"/>`,
    `<path d="${path}" stroke="url(#${gradient})" stroke-width="30"/>`,
    `<path d="${path}" stroke="${core}" stroke-width="5" opacity="0.88"/>`,
    `<path d="${path}" stroke="${core}" stroke-width="2"/>`,
  ];
}

function endpointHalos(palette) {
  return [
    `<circle cx="64" cy="142" r="20" fill="${palette.front}" opacity="0.2" filter="url(#corona-tight-glow)"/>`,
    `<rect x="428" y="122" width="40" height="40" rx="8" fill="${palette.front}" opacity="0.2" filter="url(#corona-tight-glow)"/>`,
    `<rect x="50" y="342" width="40" height="40" rx="8" fill="${palette.rear}" opacity="0.2" filter="url(#corona-tight-glow)"/>`,
    `<circle cx="442" cy="362" r="20" fill="${palette.rear}" opacity="0.2" filter="url(#corona-tight-glow)"/>`,
  ];
}

function endpoints(palette) {
  return [
    `<circle cx="64" cy="142" r="9" fill="${palette.core}"/>`,
    `<rect x="439" y="133" width="18" height="18" fill="${palette.core}"/>`,
    `<rect x="61" y="353" width="18" height="18" fill="${palette.core}"/>`,
    `<circle cx="442" cy="362" r="9" fill="${palette.core}"/>`,
  ];
}

function coronaElements(palette) {
  return [
    ...beam(REAR_PATH, palette.rear, palette.core, "corona-rear"),
    ...beam(FRONT_PATH, palette.front, palette.core, "corona-front"),
    ...endpointHalos(palette),
    ...endpoints(palette),
    `<circle cx="256" cy="256" r="66" fill="none" stroke="${palette.front}" stroke-width="14" opacity="0.16" filter="url(#corona-wide-glow)"/>`,
    `<circle cx="256" cy="256" r="47" fill="${palette.background}" stroke="${palette.core}" stroke-width="6"/>`,
    `<circle cx="256" cy="256" r="12" fill="${palette.core}"/>`,
  ];
}

function group(elements, isMark) {
  const indent = isMark ? "    " : "      ";
  const opening = isMark
    ? '  <g fill="none" stroke-linecap="round" stroke-linejoin="round">'
    : '    <g id="beam-mark" fill="none" stroke-linecap="round" stroke-linejoin="round">';
  const closing = isMark ? "  </g>" : "    </g>";
  return `${opening}\n${elements.map((element) => `${indent}${element}`).join("\n")}\n${closing}`;
}

function removeLegacyDefinitions(svg) {
  return svg
    .replace(
      /\n    <linearGradient id="(?:infrared-beam|gold-beam)"[\s\S]*?<\/linearGradient>/g,
      "",
    )
    .replace(
      /\n    <filter id="glow"[\s\S]*?<\/filter>/g,
      "",
    );
}

function addDefinitions(svg, palette) {
  const closing = "  </defs>";
  if (!svg.includes(closing)) throw new Error("Definitions insertion failed");
  return svg.replace(closing, `${definitions(palette)}\n${closing}`);
}

function replaceLogoMark(svg, mark) {
  const pattern = /    <g id="beam-mark"[\s\S]*?^    <\/g>/m;
  if (!pattern.test(svg)) throw new Error("Logo mark replacement failed");
  return svg.replace(pattern, mark);
}

function replaceSquareMark(svg, mark) {
  const pattern = /  <g fill="none"[\s\S]*?(?=\n<\/svg>)/;
  if (!pattern.test(svg)) throw new Error("Square mark replacement failed");
  return svg.replace(pattern, mark);
}

function metadata(svg, palette, isMark, generic) {
  const noun = isMark ? "mark" : "logo";
  const title = generic
    ? `Strange Lasers ${noun}`
    : `Strange Lasers ${palette.label} Laser Corona ${noun}`;
  const placement = isMark ? "" : " beside the Strange Lasers wordmark";
  const description = `A symmetrical Counterflow laser eye with bright coherent cores and a restrained neon corona${placement}`;
  return svg
    .replace(
      /<title id="logo-title">[^<]+<\/title>/,
      `<title id="logo-title">${title}</title>`,
    )
    .replace(
      /<desc id="logo-desc">[^<]+<\/desc>/,
      `<desc id="logo-desc">${description}</desc>`,
    );
}

function buildSvg(palette, isMark, generic = false) {
  const source = readFileSync(
    sourcePath(palette, isMark ? "mark" : "logo"),
    "utf8",
  );
  const mark = group(coronaElements(palette), isMark);
  const replaced = isMark
    ? replaceSquareMark(source, mark)
    : replaceLogoMark(source, mark);
  return metadata(
    addDefinitions(removeLegacyDefinitions(replaced), palette),
    palette,
    isMark,
    generic,
  );
}

function transparentMark(svg) {
  const pattern =
    /\n  <rect width="512" height="512" fill="url\(#background\)"\/>/;

  if (!pattern.test(svg)) {
    throw new Error("Mark background removal failed");
  }

  return svg.replace(pattern, "");
}

function wordmark(svg) {
  const glyphs = svg.match(
    /    <path id="glyph-[^"]+" d="[^"]+"\/>/g,
  );
  const groups = WORDMARK_GROUP_FILLS.map((fill) => {
    const pattern = new RegExp(
      `  <g fill="${fill}"[\\s\\S]*?^  <\\/g>`,
      "m",
    );
    const match = svg.match(pattern);

    if (!match) {
      throw new Error(`Wordmark group ${fill} not found`);
    }

    return match[0];
  });

  if (!glyphs) {
    throw new Error("Wordmark glyphs not found");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="390 70 605 230" role="img" aria-labelledby="wordmark-title wordmark-desc">
  <title id="wordmark-title">Strange Lasers</title>
  <desc id="wordmark-desc">The Strange Lasers wordmark</desc>
  <defs>
${glyphs.join("\n")}
  </defs>
${groups.join("\n")}
</svg>
`;
}

function renderPng(svgPath, pngPath, size) {
  const png = execFileSync("rsvg-convert", [
    "-w",
    String(size),
    "-h",
    String(size),
    svgPath,
  ]);
  writeFileSync(pngPath, png);
}

for (const palette of PALETTES) {
  const logoPath = join(here, `logo-${palette.slug}.svg`);
  const markPath = join(here, `mark-${palette.slug}.svg`);
  writeFileSync(logoPath, buildSvg(palette, false));
  writeFileSync(markPath, buildSvg(palette, true));
  renderPng(
    markPath,
    join(here, `mark-${palette.slug}.png`),
    AVATAR_SIZE,
  );
}

const primary = PALETTES[0];
const primaryLogoPath = join(projectRoot, "logo.svg");
const primaryMarkPath = join(projectRoot, "mark.svg");
const transparentMarkPath = join(
  projectRoot,
  "mark-transparent.svg",
);
const wordmarkPath = join(projectRoot, "wordmark.svg");
const primaryLogo = buildSvg(primary, false, true);
const primaryMark = buildSvg(primary, true, true);
writeFileSync(primaryLogoPath, primaryLogo);
writeFileSync(primaryMarkPath, primaryMark);
writeFileSync(
  transparentMarkPath,
  transparentMark(primaryMark),
);
writeFileSync(wordmarkPath, wordmark(primaryLogo));
renderPng(
  primaryMarkPath,
  join(here, "mark.png"),
  AVATAR_SIZE,
);

for (const size of SITE_ICON_SIZES) {
  renderPng(
    primaryMarkPath,
    join(projectRoot, `icon-${size}.png`),
    size,
  );
}

console.log(
  `Generated Laser Corona assets in ${PALETTES.length} palettes, primary aliases, wordmark, and site icons`,
);
