import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const brandDir = resolve(here, "..");
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

const palettes = [
  {
    slug: "acid-green",
    label: "Acid green",
    colors: {
      backgroundGlow: "#10251a",
      backgroundMid: "#0a1a12",
      background: "#07110c",
      primaryCore: "#f5ffd2",
      primaryMid: "#d8ff79",
      primary: "#a8f51d",
      secondaryCore: "#e8fff4",
      secondaryMid: "#7fffc2",
      secondary: "#20db8e",
      primaryShadow: "#2f4d0d",
      secondaryShadow: "#0f5138",
      beamCore: "#f1ffdf",
      accentWord: "#a8f51d",
      word: "#f4fff8",
    },
  },
  {
    slug: "amber-cobalt",
    label: "Amber and cobalt",
    colors: {
      backgroundGlow: "#111a2b",
      backgroundMid: "#0d1320",
      background: "#0a0d14",
      primaryCore: "#fff1ad",
      primaryMid: "#ffd56a",
      primary: "#ff9f1c",
      secondaryCore: "#eef3ff",
      secondaryMid: "#8aafff",
      secondary: "#356dff",
      primaryShadow: "#4a3014",
      secondaryShadow: "#152c59",
      beamCore: "#fff6d6",
      accentWord: "#ffb13c",
      word: "#f5f7ff",
    },
  },
  {
    slug: "uv-infrared",
    label: "UV and infrared",
    colors: {
      backgroundGlow: "#1b1024",
      backgroundMid: "#120b19",
      background: "#0c0a12",
      primaryCore: "#f4edff",
      primaryMid: "#b99cff",
      primary: "#7957ff",
      secondaryCore: "#fff0c9",
      secondaryMid: "#ffad58",
      secondary: "#ff641f",
      primaryShadow: "#2c2158",
      secondaryShadow: "#562211",
      beamCore: "#fff5dd",
      accentWord: "#9a7cff",
      word: "#f8f4ff",
    },
  },
  {
    slug: "monochrome-red",
    label: "Monochrome red",
    colors: {
      backgroundGlow: "#2a0b0b",
      backgroundMid: "#170707",
      background: "#0d0505",
      primaryCore: "#ffe7df",
      primaryMid: "#ff7a61",
      primary: "#ff321e",
      secondaryCore: "#fff0e5",
      secondaryMid: "#ffad7a",
      secondary: "#ff6a2a",
      primaryShadow: "#5b160e",
      secondaryShadow: "#59270f",
      beamCore: "#fff4e7",
      accentWord: "#ff5138",
      word: "#fff7f4",
    },
  },
  {
    slug: "ice-blue",
    label: "Ice blue",
    colors: {
      backgroundGlow: "#131b30",
      backgroundMid: "#0a1020",
      background: "#060912",
      primaryCore: "#f8fbff",
      primaryMid: "#b7ceff",
      primary: "#6c8cff",
      secondaryCore: "#f9fdff",
      secondaryMid: "#c8ecff",
      secondary: "#64c6ff",
      primaryShadow: "#26355b",
      secondaryShadow: "#17455f",
      beamCore: "#f8fbff",
      accentWord: "#8ea8ff",
      word: "#f5f7ff",
    },
  },
  {
    slug: "copper-teal",
    label: "Copper and teal",
    colors: {
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
  },
];

function recolor(svg, colors) {
  let result = svg;
  for (const [name, original] of Object.entries(baseColors)) {
    result = result.replaceAll(original, colors[name]);
  }
  return result;
}

function retitle(svg, label, isMark) {
  const noun = isMark ? "mark" : "logo";
  return svg.replace(
    `<title id="logo-title">Strange Lasers ${noun}</title>`,
    `<title id="logo-title">Strange Lasers ${noun}, ${label} colorway</title>`,
  );
}

function replaceLogoMark(svg, mark) {
  const pattern = /    <g id="beam-mark"[\s\S]*?^    <\/g>/m;
  const result = svg.replace(pattern, mark);
  if (result === svg) throw new Error("Logo mark replacement failed");
  return result;
}

function replaceSquareMark(svg, mark) {
  const pattern = /  <g fill="none"[\s\S]*?  <circle cx="416" cy="392" r="11" fill="[^"]+"\/>\n/;
  const result = svg.replace(pattern, mark);
  if (result === svg) throw new Error("Square mark replacement failed");
  return result;
}

function writePair(slug, label, logo, mark) {
  writeFileSync(join(here, `logo-${slug}.svg`), retitle(logo, label, false));
  writeFileSync(join(here, `mark-${slug}.svg`), retitle(mark, label, true));
}

mkdirSync(here, { recursive: true });

for (const palette of palettes) {
  writePair(
    palette.slug,
    palette.label,
    recolor(baseLogo, palette.colors),
    recolor(baseMark, palette.colors),
  );
}

const acid = palettes.find((palette) => palette.slug === "acid-green").colors;
const acidLogo = recolor(baseLogo, acid);
const acidMark = recolor(baseMark, acid);
const spectrumLogoMark = `    <g id="beam-mark" fill="none" stroke-linecap="square" stroke-linejoin="round">
      <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="${acid.primary}" stroke-width="78" opacity="0.18" filter="url(#glow)"/>
      <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="${acid.secondaryShadow}" stroke-width="58" transform="translate(11 12)"/>
      <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="url(#infrared-beam)" stroke-width="48"/>
      <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="${acid.beamCore}" stroke-width="5" opacity="0.76"/>
      <circle cx="400" cy="112" r="11" fill="${acid.beamCore}" stroke="none"/>
      <rect x="100" y="388" width="24" height="24" fill="${acid.beamCore}" stroke="none"/>
    </g>`;
const spectrumSquareMark = `  <g fill="none" stroke-linecap="square" stroke-linejoin="round">
    <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="${acid.primary}" stroke-width="78" opacity="0.18" filter="url(#glow)"/>
    <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="${acid.secondaryShadow}" stroke-width="58" transform="translate(11 12)"/>
    <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="url(#infrared-beam)" stroke-width="48"/>
    <path d="M400 112H182C138 112 112 132 112 166C112 194 130 210 166 224L346 288C382 302 400 323 400 352C400 384 374 400 330 400H112" stroke="${acid.beamCore}" stroke-width="5" opacity="0.76"/>
  </g>
  <circle cx="400" cy="112" r="11" fill="${acid.beamCore}"/>
  <rect x="100" y="388" width="24" height="24" fill="${acid.beamCore}"/>
`;
writePair(
  "spectrum-s",
  "curved spectrum S design",
  replaceLogoMark(acidLogo, spectrumLogoMark).replace(
    "Two bent laser beams beside the Strange Lasers wordmark",
    "A continuous curved laser draws an S beside the Strange Lasers wordmark",
  ),
  replaceSquareMark(acidMark, spectrumSquareMark).replace(
    "Two bright laser beams make impossible turns to form an S from a pair of L shapes",
    "A continuous curved laser draws an S through impossible space",
  ),
);

const copper = palettes.find((palette) => palette.slug === "copper-teal").colors;
const orbitLogo = recolor(baseLogo, copper);
const orbitMark = recolor(baseMark, copper);
const orbitLogoMark = `    <g id="beam-mark" fill="none" stroke-linecap="round">
      <path d="M76 382C112 96 400 96 436 382" stroke="${copper.primary}" stroke-width="72" opacity="0.18" filter="url(#glow)"/>
      <path d="M76 130C112 416 400 416 436 130" stroke="${copper.secondary}" stroke-width="72" opacity="0.18" filter="url(#glow)"/>
      <path d="M76 382C112 96 400 96 436 382" stroke="${copper.primaryShadow}" stroke-width="50" transform="translate(9 10)"/>
      <path d="M76 130C112 416 400 416 436 130" stroke="${copper.secondaryShadow}" stroke-width="50" transform="translate(9 10)"/>
      <path d="M76 382C112 96 400 96 436 382" stroke="url(#infrared-beam)" stroke-width="40"/>
      <path d="M76 130C112 416 400 416 436 130" stroke="url(#gold-beam)" stroke-width="40"/>
      <path d="M76 382C112 96 400 96 436 382M76 130C112 416 400 416 436 130" stroke="${copper.beamCore}" stroke-width="4" opacity="0.72"/>
      <circle cx="256" cy="256" r="48" fill="${copper.background}" stroke="${copper.beamCore}" stroke-width="8"/>
      <circle cx="256" cy="256" r="13" fill="${copper.beamCore}" stroke="none"/>
    </g>`;
const orbitSquareMark = `  <g fill="none" stroke-linecap="round">
    <path d="M76 382C112 96 400 96 436 382" stroke="${copper.primary}" stroke-width="72" opacity="0.18" filter="url(#glow)"/>
    <path d="M76 130C112 416 400 416 436 130" stroke="${copper.secondary}" stroke-width="72" opacity="0.18" filter="url(#glow)"/>
    <path d="M76 382C112 96 400 96 436 382" stroke="${copper.primaryShadow}" stroke-width="50" transform="translate(9 10)"/>
    <path d="M76 130C112 416 400 416 436 130" stroke="${copper.secondaryShadow}" stroke-width="50" transform="translate(9 10)"/>
    <path d="M76 382C112 96 400 96 436 382" stroke="url(#infrared-beam)" stroke-width="40"/>
    <path d="M76 130C112 416 400 416 436 130" stroke="url(#gold-beam)" stroke-width="40"/>
    <path d="M76 382C112 96 400 96 436 382M76 130C112 416 400 416 436 130" stroke="${copper.beamCore}" stroke-width="4" opacity="0.72"/>
  </g>
  <circle cx="256" cy="256" r="48" fill="${copper.background}" stroke="${copper.beamCore}" stroke-width="8"/>
  <circle cx="256" cy="256" r="13" fill="${copper.beamCore}"/>
`;
writePair(
  "singularity",
  "curved singularity design",
  replaceLogoMark(orbitLogo, orbitLogoMark).replace(
    "Two bent laser beams beside the Strange Lasers wordmark",
    "Two curved laser paths orbit a singularity beside the Strange Lasers wordmark",
  ),
  replaceSquareMark(orbitMark, orbitSquareMark).replace(
    "Two bright laser beams make impossible turns to form an S from a pair of L shapes",
    "Two curved laser paths orbit a bright singularity",
  ),
);

console.log(`Generated ${palettes.length + 2} logo and mark pairs`);
