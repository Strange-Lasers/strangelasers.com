import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baseLogo = readFileSync(join(here, "logo-abyss.svg"), "utf8");
const baseMark = readFileSync(join(here, "mark-abyss.svg"), "utf8");

const COLORS = Object.freeze({
  background: "#050b14",
  backgroundLine: "#0b1a2a",
  rear: "#11bfe9",
  rearShadow: "#0e4352",
  front: "#4b67e8",
  frontShadow: "#1d2b62",
  core: "#f7fdff",
});

const PATHS = Object.freeze({
  rear: "M70 362C110 84 402 84 442 362",
  front: "M64 142C124 426 388 426 448 142",
});

const BEAMS = Object.freeze([
  {
    path: PATHS.rear,
    color: COLORS.rear,
    shadow: COLORS.rearShadow,
    gradient: "infrared-beam",
  },
  {
    path: PATHS.front,
    color: COLORS.front,
    shadow: COLORS.frontShadow,
    gradient: "gold-beam",
  },
]);

function standardEndpoints() {
  return [
    `<circle cx="64" cy="142" r="9" fill="${COLORS.core}"/>`,
    `<rect x="439" y="133" width="18" height="18" fill="${COLORS.core}"/>`,
    `<rect x="61" y="353" width="18" height="18" fill="${COLORS.core}"/>`,
    `<circle cx="442" cy="362" r="9" fill="${COLORS.core}"/>`,
  ];
}

function hollowEndpoints() {
  return [
    `<circle cx="64" cy="142" r="9" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="4"/>`,
    `<rect x="439" y="133" width="18" height="18" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="4"/>`,
    `<rect x="61" y="353" width="18" height="18" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="4"/>`,
    `<circle cx="442" cy="362" r="9" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="4"/>`,
  ];
}

function endpointHalos() {
  return [
    `<circle cx="64" cy="142" r="22" fill="${COLORS.front}" opacity="0.2" filter="url(#glow)"/>`,
    `<rect x="426" y="120" width="44" height="44" rx="8" fill="${COLORS.front}" opacity="0.2" filter="url(#glow)"/>`,
    `<rect x="48" y="340" width="44" height="44" rx="8" fill="${COLORS.rear}" opacity="0.2" filter="url(#glow)"/>`,
    `<circle cx="442" cy="362" r="22" fill="${COLORS.rear}" opacity="0.2" filter="url(#glow)"/>`,
  ];
}

function standardIris() {
  return [
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" opacity="0.75" filter="url(#glow)"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="7"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function neonElements() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="74" opacity="0.18" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="50" transform="translate(8 9)"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="40"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="4" opacity="0.72"/>`,
    );
  }
  return [...elements, ...standardEndpoints(), ...standardIris()];
}

function precisionElements() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="54" opacity="0.12" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="36"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="28"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" opacity="0.86"/>`,
    );
  }
  return [
    ...elements,
    ...standardEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" stroke="#17334c" stroke-width="2"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function flatElements() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="40"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="4" opacity="0.8"/>`,
    );
  }
  return [
    ...elements,
    ...standardEndpoints(),
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="6"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function glassElements() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="78" opacity="0.12" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="50" opacity="0.24"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="40" opacity="0.88"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="6" opacity="0.28"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2" opacity="0.92"/>`,
    );
  }
  return [
    ...elements,
    ...endpointHalos(),
    ...standardEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" opacity="0.7" filter="url(#glow)"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="#bdefff" stroke-width="7" opacity="0.32"/>`,
    `<circle cx="256" cy="256" r="47" fill="none" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function schematicElements() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="36"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="28"/>`,
      `<path d="${beam.path}" stroke="${COLORS.backgroundLine}" stroke-width="16"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" opacity="0.9"/>`,
    );
  }
  return [
    ...elements,
    ...hollowEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="10 8" opacity="0.78"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="256" r="5" fill="${COLORS.core}"/>`,
  ];
}

function pulseElements() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="64" stroke-dasharray="66 18" opacity="0.15" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="42" stroke-dasharray="66 18"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="32" stroke-dasharray="66 18"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" stroke-dasharray="66 18" opacity="0.82"/>`,
    );
  }
  return [...elements, ...standardEndpoints(), ...standardIris()];
}

const STYLES = [
  {
    slug: "neon",
    label: "Neon observatory",
    description: "layered neon laser tubes with colored shadows and soft glow",
    elements: neonElements,
  },
  {
    slug: "precision",
    label: "Precision optics",
    description: "narrow optical paths with restrained glow and crisp cores",
    elements: precisionElements,
  },
  {
    slug: "flat",
    label: "Flat vector",
    description: "solid vector paths without glow or dimensional shadows",
    elements: flatElements,
    postprocess(svg) {
      return svg.replace('fill="url(#background)"', 'fill="#07111f"');
    },
  },
  {
    slug: "glass",
    label: "Glass tube",
    description: "translucent fiber-optic tubes with broad halos and specular cores",
    elements: glassElements,
  },
  {
    slug: "schematic",
    label: "Instrument schematic",
    description: "hollow technical rails, outlined terminals, and a calibrated iris",
    elements: schematicElements,
  },
  {
    slug: "pulse",
    label: "Pulse train",
    description: "segmented laser signals traveling in opposing directions",
    elements: pulseElements,
  },
];

function group(elements, isMark) {
  const indent = isMark ? "    " : "      ";
  const opening = isMark
    ? '  <g fill="none" stroke-linecap="round" stroke-linejoin="round">'
    : '    <g id="beam-mark" fill="none" stroke-linecap="round" stroke-linejoin="round">';
  const closing = isMark ? "  </g>" : "    </g>";
  return `${opening}\n${elements.map((element) => `${indent}${element}`).join("\n")}\n${closing}`;
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

function metadata(svg, style, isMark) {
  const noun = isMark ? "mark" : "logo";
  const placement = isMark ? "" : " beside the Strange Lasers wordmark";
  return svg
    .replace(
      /<title id="logo-title">[^<]+<\/title>/,
      `<title id="logo-title">Strange Lasers ${style.label} ${noun}</title>`,
    )
    .replace(
      /<desc id="logo-desc">[^<]+<\/desc>/,
      `<desc id="logo-desc">A Counterflow laser eye rendered as ${style.description}${placement}</desc>`,
    );
}

for (const style of STYLES) {
  let logo = metadata(
    replaceLogoMark(baseLogo, group(style.elements(), false)),
    style,
    false,
  );
  let mark = metadata(
    replaceSquareMark(baseMark, group(style.elements(), true)),
    style,
    true,
  );
  if (style.postprocess) {
    logo = style.postprocess(logo);
    mark = style.postprocess(mark);
  }
  writeFileSync(join(here, `study-${style.slug}-logo.svg`), logo);
  writeFileSync(join(here, `study-${style.slug}-mark.svg`), mark);
}

console.log(`Generated ${STYLES.length} Counterflow style studies`);
