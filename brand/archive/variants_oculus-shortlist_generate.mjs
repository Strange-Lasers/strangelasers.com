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
  {
    slug: "blood-moon",
    label: "Blood moon",
    colors: {
      backgroundGlow: "#2b0e08",
      backgroundMid: "#170806",
      background: "#0d0504",
      primaryCore: "#fff0c8",
      primaryMid: "#e8a34e",
      primary: "#aa5e23",
      secondaryCore: "#ffe5df",
      secondaryMid: "#ff6b63",
      secondary: "#d52b37",
      primaryShadow: "#4b2611",
      secondaryShadow: "#510f18",
      beamCore: "#fff2df",
      accentWord: "#d8393c",
      word: "#fff7ef",
    },
  },
  {
    slug: "ultraviolet-ash",
    label: "Ultraviolet ash",
    colors: {
      backgroundGlow: "#21152e",
      backgroundMid: "#150d1d",
      background: "#0d0913",
      primaryCore: "#fbf7ff",
      primaryMid: "#c4bbd0",
      primary: "#817989",
      secondaryCore: "#f6edff",
      secondaryMid: "#b78aff",
      secondary: "#7041d9",
      primaryShadow: "#353039",
      secondaryShadow: "#2b165d",
      beamCore: "#fff8ff",
      accentWord: "#9a68f2",
      word: "#faf6ff",
    },
  },
  {
    slug: "sodium-vapor",
    label: "Sodium vapor",
    colors: {
      backgroundGlow: "#2a210d",
      backgroundMid: "#171106",
      background: "#0e0b05",
      primaryCore: "#fff7dc",
      primaryMid: "#ded2ae",
      primary: "#a7a08d",
      secondaryCore: "#fff3bf",
      secondaryMid: "#ffc248",
      secondary: "#d88b12",
      primaryShadow: "#3f3a2e",
      secondaryShadow: "#57370a",
      beamCore: "#fff9e8",
      accentWord: "#eda62b",
      word: "#fffaf0",
    },
  },
  {
    slug: "deep-field",
    label: "Deep field",
    colors: {
      backgroundGlow: "#17152f",
      backgroundMid: "#0c0b1e",
      background: "#050713",
      primaryCore: "#f2edff",
      primaryMid: "#b19bff",
      primary: "#765de3",
      secondaryCore: "#edf5ff",
      secondaryMid: "#77a4ff",
      secondary: "#2d66d6",
      primaryShadow: "#30265f",
      secondaryShadow: "#142d60",
      beamCore: "#f8f7ff",
      accentWord: "#8d7aef",
      word: "#f7f6ff",
    },
  },
  {
    slug: "cold-ember",
    label: "Cold ember",
    colors: {
      backgroundGlow: "#172530",
      backgroundMid: "#0b161d",
      background: "#070d12",
      primaryCore: "#ffede3",
      primaryMid: "#f08b60",
      primary: "#c8552f",
      secondaryCore: "#effcff",
      secondaryMid: "#8ddcf3",
      secondary: "#38a8cc",
      primaryShadow: "#522517",
      secondaryShadow: "#154452",
      beamCore: "#f8feff",
      accentWord: "#ef7049",
      word: "#f4fbff",
    },
  },
  {
    slug: "occultation",
    label: "Occultation",
    colors: {
      backgroundGlow: "#27132c",
      backgroundMid: "#170c1c",
      background: "#0d0813",
      primaryCore: "#f5edff",
      primaryMid: "#b68cff",
      primary: "#7140ce",
      secondaryCore: "#fff3c7",
      secondaryMid: "#ffc857",
      secondary: "#d88b0f",
      primaryShadow: "#2b1454",
      secondaryShadow: "#533407",
      beamCore: "#fff9e8",
      accentWord: "#e9a72a",
      word: "#fbf7ff",
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

console.log(`Generated ${palettes.length} shortlisted Oculus colorways`);
