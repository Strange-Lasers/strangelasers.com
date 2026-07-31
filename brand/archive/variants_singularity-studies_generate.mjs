import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const brandDir = resolve(here, "../..");
const baseLogo = readFileSync(join(brandDir, "logo.svg"), "utf8");
const baseMark = readFileSync(join(brandDir, "logo-square.svg"), "utf8");

const baseColors = {
  backgroundGlow: "#24120a",
  backgroundMid: "#160c08",
  background: "#100b08",
  primaryCore: "#fff0b5",
  primaryMid: "#ff9b45",
  primary: "#ff481f",
  secondaryCore: "#fff7c2",
  secondaryMid: "#ffe36b",
  secondary: "#ffc400",
  primaryShadow: "#541d10",
  secondaryShadow: "#584100",
  beamCore: "#fff7d5",
  accentWord: "#ff6b2c",
  word: "#f7f4ff",
};

const palettes = {
  copperTeal: {
    backgroundGlow: "#14201a",
    backgroundMid: "#0b130f",
    background: "#070b08",
    primaryCore: "#fff0d0",
    primaryMid: "#efa56a",
    primary: "#c96f33",
    secondaryCore: "#e6fff8",
    secondaryMid: "#6de1c4",
    secondary: "#1bae93",
    primaryShadow: "#4b2d1c",
    secondaryShadow: "#12483e",
    beamCore: "#fff8e8",
    accentWord: "#e78649",
    word: "#f4fff9",
  },
  cyanGold: {
    backgroundGlow: "#102435",
    backgroundMid: "#091724",
    background: "#050c13",
    primaryCore: "#e9fdff",
    primaryMid: "#79e9ff",
    primary: "#13bde8",
    secondaryCore: "#fff8cf",
    secondaryMid: "#ffd768",
    secondary: "#f5a623",
    primaryShadow: "#0e4150",
    secondaryShadow: "#54340d",
    beamCore: "#f8ffff",
    accentWord: "#43d8f4",
    word: "#f4fbff",
  },
  emberViolet: {
    backgroundGlow: "#251329",
    backgroundMid: "#160b1c",
    background: "#0d0712",
    primaryCore: "#fff0d5",
    primaryMid: "#ffad61",
    primary: "#ff5a24",
    secondaryCore: "#f6edff",
    secondaryMid: "#c59aff",
    secondary: "#8457ff",
    primaryShadow: "#5c2212",
    secondaryShadow: "#30205e",
    beamCore: "#fff8ec",
    accentWord: "#ff7340",
    word: "#fbf5ff",
  },
  solarRed: {
    backgroundGlow: "#2b1010",
    backgroundMid: "#170909",
    background: "#0d0505",
    primaryCore: "#fff2da",
    primaryMid: "#ffad54",
    primary: "#ff4a20",
    secondaryCore: "#fffad8",
    secondaryMid: "#ffe071",
    secondary: "#ffc928",
    primaryShadow: "#5b1d10",
    secondaryShadow: "#59430d",
    beamCore: "#fff9e9",
    accentWord: "#ff6535",
    word: "#fff8f3",
  },
  acidUltraviolet: {
    backgroundGlow: "#15241a",
    backgroundMid: "#0c1410",
    background: "#070b09",
    primaryCore: "#f4ffd8",
    primaryMid: "#cfff6e",
    primary: "#92e620",
    secondaryCore: "#f4edff",
    secondaryMid: "#b89aff",
    secondary: "#7957ed",
    primaryShadow: "#314c13",
    secondaryShadow: "#2d2158",
    beamCore: "#f8ffe9",
    accentWord: "#a5ef35",
    word: "#f7fff5",
  },
  iceEmber: {
    backgroundGlow: "#172135",
    backgroundMid: "#0c1220",
    background: "#070a11",
    primaryCore: "#f5fbff",
    primaryMid: "#a9d9ff",
    primary: "#4aa8f4",
    secondaryCore: "#fff1df",
    secondaryMid: "#ffad72",
    secondary: "#f0642d",
    primaryShadow: "#1c3b58",
    secondaryShadow: "#562613",
    beamCore: "#fbfdff",
    accentWord: "#75c1ff",
    word: "#f5f8ff",
  },
};

function recolor(svg, colors) {
  let result = svg;
  for (const [name, original] of Object.entries(baseColors)) {
    result = result.replaceAll(original, colors[name]);
  }
  return result;
}

function replaceLogoMark(svg, mark) {
  const pattern = /    <g id="beam-mark"[\s\S]*?^    <\/g>/m;
  const result = svg.replace(pattern, mark);
  if (result === svg) throw new Error("Logo mark replacement failed");
  return result;
}

function replaceSquareMark(svg, mark) {
  const pattern = /  <g fill="none"[\s\S]*?(?=\n<\/svg>)/;
  const result = svg.replace(pattern, mark);
  if (result === svg) throw new Error("Square mark replacement failed");
  return result;
}

function metadata(svg, label, description, isMark) {
  const noun = isMark ? "mark" : "logo";
  return svg
    .replace(
      /<title id="logo-title">[^<]+<\/title>/,
      `<title id="logo-title">Strange Lasers ${label} ${noun}</title>`,
    )
    .replace(
      /<desc id="logo-desc">[^<]+<\/desc>/,
      `<desc id="logo-desc">${description}</desc>`,
    );
}

function beam(path, colors, tone, width = 40) {
  const primary = tone === "primary";
  const color = primary ? colors.primary : colors.secondary;
  const shadow = primary ? colors.primaryShadow : colors.secondaryShadow;
  const gradient = primary ? "infrared-beam" : "gold-beam";
  return [
    `<path d="${path}" stroke="${color}" stroke-width="${width + 34}" opacity="0.18" filter="url(#glow)"/>`,
    `<path d="${path}" stroke="${shadow}" stroke-width="${width + 10}" transform="translate(8 9)"/>`,
    `<path d="${path}" stroke="url(#${gradient})" stroke-width="${width}"/>`,
    `<path d="${path}" stroke="${colors.beamCore}" stroke-width="4" opacity="0.72"/>`,
  ];
}

function core(colors, radius = 48, dotRadius = 12) {
  return [
    `<circle cx="256" cy="256" r="${radius + 14}" fill="${colors.background}" opacity="0.75" filter="url(#glow)"/>`,
    `<circle cx="256" cy="256" r="${radius}" fill="${colors.background}" stroke="${colors.beamCore}" stroke-width="7"/>`,
    `<circle cx="256" cy="256" r="${dotRadius}" fill="${colors.beamCore}"/>`,
  ];
}

function endpoint(x, y, colors, shape = "circle") {
  if (shape === "square") {
    return `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" fill="${colors.beamCore}"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="9" fill="${colors.beamCore}"/>`;
}

function group(elements, isMark) {
  const indent = isMark ? "    " : "      ";
  const opening = isMark
    ? '  <g fill="none" stroke-linecap="round" stroke-linejoin="round">'
    : '    <g id="beam-mark" fill="none" stroke-linecap="round" stroke-linejoin="round">';
  const closing = isMark ? "  </g>" : "    </g>";
  return `${opening}\n${elements.map((element) => `${indent}${element}`).join("\n")}\n${closing}`;
}

const concepts = [
  {
    slug: "oculus",
    label: "Oculus",
    description: "Two asymmetrical laser arcs frame a bright central singularity like an eye",
    colors: palettes.copperTeal,
    elements(colors) {
      return [
        ...beam("M70 374C110 92 392 76 442 350", colors, "primary", 40),
        ...beam("M66 146C124 422 388 430 448 138", colors, "secondary", 40),
        endpoint(70, 374, colors),
        endpoint(448, 138, colors, "square"),
        ...core(colors, 47, 12),
      ];
    },
  },
  {
    slug: "lensing",
    label: "Lensing",
    description: "Parallel laser paths bend around a dark central singularity",
    colors: palettes.cyanGold,
    elements(colors) {
      return [
        ...beam("M48 196H166C216 196 212 152 256 152C300 152 296 196 346 196H464", colors, "primary", 35),
        ...beam("M48 316H166C216 316 212 360 256 360C300 360 296 316 346 316H464", colors, "secondary", 35),
        endpoint(48, 196, colors, "square"),
        endpoint(464, 316, colors),
        ...core(colors, 48, 11),
      ];
    },
  },
  {
    slug: "accretion",
    label: "Accretion",
    description: "A tilted laser ring and opposing jet wrap around a black-hole core",
    colors: palettes.emberViolet,
    elements(colors) {
      return [
        ...beam("M70 326C116 126 370 92 444 250C488 346 302 420 138 370", colors, "primary", 37),
        ...beam("M78 386L434 126", colors, "secondary", 29),
        endpoint(70, 326, colors),
        endpoint(434, 126, colors, "square"),
        ...core(colors, 54, 10),
      ];
    },
  },
  {
    slug: "eclipse",
    label: "Eclipse",
    description: "A broken event horizon surrounds an eclipsed laser crossing",
    colors: palettes.solarRed,
    elements(colors) {
      return [
        ...beam("M52 256H174M338 256H460", colors, "secondary", 33),
        ...beam("M126 368A168 168 0 1 1 414 350", colors, "primary", 38),
        endpoint(52, 256, colors, "square"),
        endpoint(460, 256, colors),
        `<circle cx="256" cy="256" r="75" fill="${colors.background}" stroke="${colors.beamCore}" stroke-width="8"/>`,
        `<circle cx="273" cy="238" r="17" fill="${colors.beamCore}"/>`,
      ];
    },
  },
  {
    slug: "vortex",
    label: "Vortex",
    description: "Three curved laser arms spiral into a compact singularity",
    colors: palettes.acidUltraviolet,
    elements(colors) {
      return [
        ...beam("M72 116C202 70 294 126 306 220", colors, "primary", 34),
        ...beam("M446 138C462 266 386 350 292 326", colors, "secondary", 34),
        ...beam("M108 432C196 356 224 312 220 238", colors, "primary", 34),
        endpoint(72, 116, colors),
        endpoint(446, 138, colors, "square"),
        endpoint(108, 432, colors),
        ...core(colors, 43, 11),
      ];
    },
  },
  {
    slug: "portal",
    label: "Portal",
    description: "Nested broken laser horizons form a tunnel around a bright core",
    colors: palettes.iceEmber,
    elements(colors) {
      return [
        ...beam("M92 198A174 174 0 1 1 132 388", colors, "primary", 27),
        ...beam("M390 160A132 132 0 1 0 378 368", colors, "secondary", 30),
        ...beam("M178 214A86 86 0 1 1 196 318", colors, "primary", 24),
        endpoint(92, 198, colors, "square"),
        endpoint(378, 368, colors),
        ...core(colors, 35, 10),
      ];
    },
  },
];

for (const concept of concepts) {
  const logoElements = concept.elements(concept.colors);
  const markElements = concept.elements(concept.colors);
  const logo = metadata(
    replaceLogoMark(recolor(baseLogo, concept.colors), group(logoElements, false)),
    concept.label,
    `${concept.description} beside the Strange Lasers wordmark`,
    false,
  );
  const mark = metadata(
    replaceSquareMark(recolor(baseMark, concept.colors), group(markElements, true)),
    concept.label,
    concept.description,
    true,
  );
  writeFileSync(join(here, `logo-${concept.slug}.svg`), logo);
  writeFileSync(join(here, `mark-${concept.slug}.svg`), mark);
}

console.log(`Generated ${concepts.length} singularity studies`);
