import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const studiesDir = resolve(here, "../singularity-studies");
const sourceLogo = readFileSync(join(studiesDir, "logo-oculus.svg"), "utf8");
const sourceMark = readFileSync(join(studiesDir, "mark-oculus.svg"), "utf8");

const sourceColors = {
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
};

const palettes = [
  {
    slug: "copper-teal",
    label: "Copper and teal",
    colors: sourceColors,
  },
  {
    slug: "solar-flare",
    label: "Solar flare",
    colors: {
      backgroundGlow: "#2c1008",
      backgroundMid: "#190a05",
      background: "#0e0603",
      primaryCore: "#fff0d2",
      primaryMid: "#ff9c43",
      primary: "#ff4a1f",
      secondaryCore: "#fffbd9",
      secondaryMid: "#ffe36d",
      secondary: "#ffc51f",
      primaryShadow: "#621c0d",
      secondaryShadow: "#5c4309",
      beamCore: "#fff9e8",
      accentWord: "#ff6935",
      word: "#fff8f2",
    },
  },
  {
    slug: "ultraviolet-ember",
    label: "Ultraviolet and ember",
    colors: {
      backgroundGlow: "#25112d",
      backgroundMid: "#160a1b",
      background: "#0d0711",
      primaryCore: "#fff0d7",
      primaryMid: "#ffad64",
      primary: "#ff5a24",
      secondaryCore: "#f4edff",
      secondaryMid: "#c19cff",
      secondary: "#7d54f4",
      primaryShadow: "#5c2110",
      secondaryShadow: "#30205b",
      beamCore: "#fff8ed",
      accentWord: "#ff7542",
      word: "#fbf5ff",
    },
  },
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
    slug: "abyss",
    label: "Abyss",
    colors: {
      backgroundGlow: "#102339",
      backgroundMid: "#091525",
      background: "#050b14",
      primaryCore: "#e9fdff",
      primaryMid: "#78ebff",
      primary: "#11bfe9",
      secondaryCore: "#edf1ff",
      secondaryMid: "#91a9ff",
      secondary: "#4b67e8",
      primaryShadow: "#0e4352",
      secondaryShadow: "#1d2b62",
      beamCore: "#f7fdff",
      accentWord: "#39d4f1",
      word: "#f3f7ff",
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
    slug: "moon-crimson",
    label: "Moon and crimson",
    colors: {
      backgroundGlow: "#251112",
      backgroundMid: "#14090a",
      background: "#0b0506",
      primaryCore: "#fffdf4",
      primaryMid: "#ded7c6",
      primary: "#aaa698",
      secondaryCore: "#ffe9e5",
      secondaryMid: "#ff7967",
      secondary: "#db302b",
      primaryShadow: "#39362f",
      secondaryShadow: "#561512",
      beamCore: "#fffcef",
      accentWord: "#ef4b3e",
      word: "#fffaf3",
    },
  },
];

function recolor(svg, colors) {
  let result = svg;
  for (const [name, source] of Object.entries(sourceColors)) {
    result = result.replaceAll(source, colors[name]);
  }
  return result;
}

function metadata(svg, palette, isMark) {
  const noun = isMark ? "mark" : "logo";
  const description = isMark
    ? `A mysterious laser eye in the ${palette.label} colorway`
    : `A mysterious laser eye in the ${palette.label} colorway beside the Strange Lasers wordmark`;
  return svg
    .replace(
      /<title id="logo-title">[^<]+<\/title>/,
      `<title id="logo-title">Strange Lasers Oculus ${noun}, ${palette.label}</title>`,
    )
    .replace(
      /<desc id="logo-desc">[^<]+<\/desc>/,
      `<desc id="logo-desc">${description}</desc>`,
    );
}

for (const palette of palettes) {
  writeFileSync(
    join(here, `logo-oculus-${palette.slug}.svg`),
    metadata(recolor(sourceLogo, palette.colors), palette, false),
  );
  writeFileSync(
    join(here, `mark-oculus-${palette.slug}.svg`),
    metadata(recolor(sourceMark, palette.colors), palette, true),
  );
}

console.log(`Generated ${palettes.length} Oculus colorways`);
