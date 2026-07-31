import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baseLogo = readFileSync(
  join(
    here,
    "archive",
    "variants_oculus-shortlist_endpoint-studies_logo-abyss-counterflow.svg",
  ),
  "utf8",
);
const baseMark = readFileSync(
  join(
    here,
    "archive",
    "variants_oculus-shortlist_endpoint-studies_mark-abyss-counterflow.svg",
  ),
  "utf8",
);

const COLORS = Object.freeze({
  background: "#050b14",
  backgroundLine: "#0b1a2a",
  rear: "#11bfe9",
  rearMid: "#78ebff",
  rearShadow: "#0e4352",
  front: "#4b67e8",
  frontMid: "#91a9ff",
  frontShadow: "#1d2b62",
  core: "#f7fdff",
});

const BEAMS = Object.freeze([
  {
    path: "M70 362C110 84 402 84 442 362",
    color: COLORS.rear,
    shadow: COLORS.rearShadow,
    gradient: "rear-balanced",
  },
  {
    path: "M64 142C124 426 388 426 448 142",
    color: COLORS.front,
    shadow: COLORS.frontShadow,
    gradient: "front-balanced",
  },
]);

const STYLE_DEFINITIONS = `    <linearGradient id="rear-balanced" gradientUnits="userSpaceOnUse" x1="64" y1="0" x2="448" y2="0">
      <stop offset="0" stop-color="${COLORS.rear}"/>
      <stop offset="0.5" stop-color="${COLORS.rearMid}"/>
      <stop offset="1" stop-color="${COLORS.rear}"/>
    </linearGradient>
    <linearGradient id="front-balanced" gradientUnits="userSpaceOnUse" x1="64" y1="0" x2="448" y2="0">
      <stop offset="0" stop-color="${COLORS.front}"/>
      <stop offset="0.5" stop-color="${COLORS.frontMid}"/>
      <stop offset="1" stop-color="${COLORS.front}"/>
    </linearGradient>
    <filter id="tight-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="wide-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>`;

function filledEndpoints() {
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
    `<circle cx="64" cy="142" r="20" fill="${COLORS.front}" opacity="0.2" filter="url(#tight-glow)"/>`,
    `<rect x="428" y="122" width="40" height="40" rx="8" fill="${COLORS.front}" opacity="0.2" filter="url(#tight-glow)"/>`,
    `<rect x="50" y="342" width="40" height="40" rx="8" fill="${COLORS.rear}" opacity="0.2" filter="url(#tight-glow)"/>`,
    `<circle cx="442" cy="362" r="20" fill="${COLORS.rear}" opacity="0.2" filter="url(#tight-glow)"/>`,
  ];
}

function cathodeIris() {
  return [
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" opacity="0.72" filter="url(#tight-glow)"/>`,
    `<circle cx="256" cy="256" r="52" fill="${COLORS.background}" stroke="#02060b" stroke-width="10"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function schematicIris() {
  return [
    `<circle cx="256" cy="256" r="61" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="10 8" opacity="0.78"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="256" r="5" fill="${COLORS.core}"/>`,
  ];
}

function cathodeBalanced() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="62" opacity="0.16" filter="url(#tight-glow)"/>`,
      `<path d="${beam.path}" stroke="#02060b" stroke-width="50"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="38"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="7" opacity="0.82"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2" opacity="0.98"/>`,
    );
  }
  return [...elements, ...filledEndpoints(), ...cathodeIris()];
}

function cathodeCollimated() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="50" opacity="0.18" filter="url(#tight-glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="34"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="24"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3.5" opacity="0.94"/>`,
    );
  }
  return [
    ...elements,
    ...filledEndpoints(),
    `<circle cx="256" cy="256" r="58" fill="none" stroke="${COLORS.rear}" stroke-width="2" opacity="0.7"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="4"/>`,
    `<circle cx="256" cy="256" r="10" fill="${COLORS.core}"/>`,
  ];
}

function cathodeCorona() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="90" opacity="0.14" filter="url(#wide-glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="48" opacity="0.22" filter="url(#tight-glow)"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="30"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="5" opacity="0.88"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2" opacity="1"/>`,
    );
  }
  return [
    ...elements,
    ...endpointHalos(),
    ...filledEndpoints(),
    `<circle cx="256" cy="256" r="66" fill="none" stroke="${COLORS.front}" stroke-width="14" opacity="0.16" filter="url(#wide-glow)"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="6"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function schematicClean() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="36"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="28"/>`,
      `<path d="${beam.path}" stroke="${COLORS.backgroundLine}" stroke-width="16"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" opacity="0.9"/>`,
    );
  }
  return [...elements, ...hollowEndpoints(), ...schematicIris()];
}

function schematicLiveBeam() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="42" opacity="0.13" filter="url(#tight-glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="38"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="30"/>`,
      `<path d="${beam.path}" stroke="${COLORS.backgroundLine}" stroke-width="18"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="8"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2.5" opacity="0.96"/>`,
    );
  }
  return [
    ...elements,
    ...filledEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="10 8" opacity="0.72"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}" filter="url(#tight-glow)"/>`,
  ];
}

function schematicOpticalBench() {
  const elements = [
    `<path d="M256 132V176M256 336V380" stroke="${COLORS.core}" stroke-width="2" stroke-dasharray="4 6" opacity="0.65"/>`,
  ];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="34"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="26"/>`,
      `<path d="${beam.path}" stroke="${COLORS.backgroundLine}" stroke-width="16"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="10" opacity="0.24" filter="url(#tight-glow)"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" opacity="0.94"/>`,
    );
  }
  return [
    ...elements,
    ...hollowEndpoints(),
    `<circle cx="256" cy="154" r="9" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="355" r="9" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="256" r="64" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="12 8" opacity="0.72"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

const STYLES = [
  {
    slug: "cathode-balanced",
    label: "Balanced Cathode",
    description: "symmetrical cathode tubes with dark housings and center-balanced light",
    elements: cathodeBalanced,
  },
  {
    slug: "cathode-collimated",
    label: "Collimated Beam",
    description: "narrow coherent laser paths with tight bloom and equal endpoint intensity",
    elements: cathodeCollimated,
  },
  {
    slug: "cathode-corona",
    label: "Laser Corona",
    description: "narrow coherent cores surrounded by symmetrical electrical bloom",
    elements: cathodeCorona,
  },
  {
    slug: "schematic-clean",
    label: "Clean Schematic",
    description: "hollow technical rails, outlined terminals, and a calibrated iris",
    elements: schematicClean,
  },
  {
    slug: "schematic-live",
    label: "Live Schematic",
    description: "technical rails containing a bright coherent laser core",
    elements: schematicLiveBeam,
  },
  {
    slug: "schematic-optical-bench",
    label: "Optical Bench",
    description: "instrument rails with collimator nodes and live laser centerlines",
    elements: schematicOpticalBench,
  },
];

function addStyleDefinitions(svg) {
  const closing = "  </defs>";
  if (!svg.includes(closing)) throw new Error("Definitions insertion failed");
  return svg.replace(closing, `${STYLE_DEFINITIONS}\n${closing}`);
}

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
      `<desc id="logo-desc">An aligned Counterflow laser eye rendered as ${style.description}${placement}</desc>`,
    );
}

for (const style of STYLES) {
  const logo = metadata(
    addStyleDefinitions(
      replaceLogoMark(baseLogo, group(style.elements(), false)),
    ),
    style,
    false,
  );
  const mark = metadata(
    addStyleDefinitions(
      replaceSquareMark(baseMark, group(style.elements(), true)),
    ),
    style,
    true,
  );
  writeFileSync(join(here, `study-${style.slug}-logo.svg`), logo);
  writeFileSync(join(here, `study-${style.slug}-mark.svg`), mark);
}

console.log(`Generated ${STYLES.length} Counterflow style studies`);
