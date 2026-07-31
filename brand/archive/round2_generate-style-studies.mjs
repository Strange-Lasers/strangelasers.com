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

const BEAMS = Object.freeze([
  {
    path: "M70 362C110 84 402 84 442 362",
    color: COLORS.rear,
    shadow: COLORS.rearShadow,
    gradient: "infrared-beam",
  },
  {
    path: "M64 142C124 426 388 426 448 142",
    color: COLORS.front,
    shadow: COLORS.frontShadow,
    gradient: "gold-beam",
  },
]);

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
    `<circle cx="64" cy="142" r="22" fill="${COLORS.front}" opacity="0.22" filter="url(#glow)"/>`,
    `<rect x="426" y="120" width="44" height="44" rx="8" fill="${COLORS.front}" opacity="0.22" filter="url(#glow)"/>`,
    `<rect x="48" y="340" width="44" height="44" rx="8" fill="${COLORS.rear}" opacity="0.22" filter="url(#glow)"/>`,
    `<circle cx="442" cy="362" r="22" fill="${COLORS.rear}" opacity="0.22" filter="url(#glow)"/>`,
  ];
}

function classicIris() {
  return [
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" opacity="0.75" filter="url(#glow)"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="7"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function technicalIris() {
  return [
    `<circle cx="256" cy="256" r="61" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="10 8" opacity="0.78"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="256" r="5" fill="${COLORS.core}"/>`,
  ];
}

function neonClassic() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="74" opacity="0.18" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="50" transform="translate(8 9)"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="40"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="4" opacity="0.72"/>`,
    );
  }
  return [...elements, ...filledEndpoints(), ...classicIris()];
}

function neonCathode() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="64" opacity="0.14" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="#02060b" stroke-width="50"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="38"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="7" opacity="0.82"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2" opacity="0.98"/>`,
    );
  }
  return [
    ...elements,
    ...filledEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" opacity="0.7" filter="url(#glow)"/>`,
    `<circle cx="256" cy="256" r="52" fill="${COLORS.background}" stroke="#02060b" stroke-width="12"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function neonOverdrive() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="102" opacity="0.24" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="${beam.shadow}" stroke-width="56" transform="translate(6 7)"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="58" opacity="0.24"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="46"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="8" opacity="0.62"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" opacity="0.96"/>`,
    );
  }
  return [
    ...elements,
    ...endpointHalos(),
    ...filledEndpoints(),
    `<circle cx="256" cy="256" r="70" fill="none" stroke="${COLORS.front}" stroke-width="18" opacity="0.2" filter="url(#glow)"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="9"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function neonVacuum() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="76" opacity="0.12" filter="url(#glow)"/>`,
      `<path d="${beam.path}" stroke="#010409" stroke-width="60" transform="translate(5 6)"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="48" opacity="0.36"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="36" opacity="0.88"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="3" opacity="0.9"/>`,
    );
  }
  return [
    ...elements,
    ...filledEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="${COLORS.background}" stroke="#010409" stroke-width="13"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="#bdefff" stroke-width="8" opacity="0.42"/>`,
    `<circle cx="256" cy="256" r="47" fill="none" stroke="${COLORS.core}" stroke-width="3"/>`,
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
  return [...elements, ...hollowEndpoints(), ...technicalIris()];
}

function schematicBlueprint() {
  const elements = [
    `<path d="M40 256H472M256 40V472" stroke="#1a4561" stroke-width="1.5" stroke-dasharray="7 11" opacity="0.72"/>`,
    `<circle cx="256" cy="256" r="110" stroke="#12344d" stroke-width="1.5" stroke-dasharray="6 10" opacity="0.8"/>`,
    `<circle cx="256" cy="256" r="176" stroke="#12344d" stroke-width="1.5" stroke-dasharray="6 10" opacity="0.58"/>`,
  ];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="28" opacity="0.34"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="20"/>`,
      `<path d="${beam.path}" stroke="#061426" stroke-width="12"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2.5" opacity="0.92"/>`,
    );
  }
  return [
    ...elements,
    ...hollowEndpoints(),
    `<circle cx="256" cy="256" r="61" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="8 7"/>`,
    `<circle cx="256" cy="256" r="47" fill="#061426" stroke="${COLORS.core}" stroke-width="4"/>`,
    `<circle cx="256" cy="256" r="12" fill="#061426" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="256" r="4" fill="${COLORS.core}"/>`,
  ];
}

function schematicEngraved() {
  const elements = [];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="#010409" stroke-width="44" transform="translate(6 7)"/>`,
      `<path d="${beam.path}" stroke="url(#${beam.gradient})" stroke-width="32" opacity="0.72"/>`,
      `<path d="${beam.path}" stroke="${COLORS.background}" stroke-width="20"/>`,
      `<path d="${beam.path}" stroke="#9bd7e8" stroke-width="4" opacity="0.82"/>`,
    );
  }
  return [
    ...elements,
    ...hollowEndpoints(),
    `<circle cx="262" cy="262" r="61" fill="none" stroke="#010409" stroke-width="9"/>`,
    `<circle cx="256" cy="256" r="61" fill="none" stroke="${COLORS.rear}" stroke-width="4" opacity="0.7"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="#9bd7e8" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

function schematicTelemetry() {
  const elements = [
    `<path d="M256 174V190M256 322V338M174 256H190M322 256H338" stroke="${COLORS.core}" stroke-width="3" opacity="0.8"/>`,
  ];
  for (const beam of BEAMS) {
    elements.push(
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="32" opacity="0.2"/>`,
      `<path d="${beam.path}" stroke="${beam.color}" stroke-width="22"/>`,
      `<path d="${beam.path}" stroke="${COLORS.backgroundLine}" stroke-width="13"/>`,
      `<path d="${beam.path}" stroke="${COLORS.core}" stroke-width="2.5" stroke-dasharray="13 9" opacity="0.92"/>`,
    );
  }
  return [
    ...elements,
    ...hollowEndpoints(),
    `<circle cx="256" cy="154" r="8" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="355" r="8" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="3"/>`,
    `<circle cx="256" cy="256" r="66" fill="none" stroke="${COLORS.rear}" stroke-width="3" stroke-dasharray="12 8" opacity="0.72"/>`,
    `<circle cx="256" cy="256" r="47" fill="${COLORS.background}" stroke="${COLORS.core}" stroke-width="5"/>`,
    `<circle cx="256" cy="256" r="12" fill="${COLORS.core}"/>`,
  ];
}

const STYLES = [
  {
    slug: "neon-classic",
    label: "Neon Classic",
    description: "layered neon tubes with colored shadows and soft observatory glow",
    elements: neonClassic,
  },
  {
    slug: "neon-cathode",
    label: "Cold Cathode",
    description: "bright cathode cores seated in dark optical housings",
    elements: neonCathode,
  },
  {
    slug: "neon-overdrive",
    label: "Neon Overdrive",
    description: "overdriven tubes with broad bloom and intensely bright cores",
    elements: neonOverdrive,
  },
  {
    slug: "neon-vacuum",
    label: "Vacuum Tube",
    description: "glass-like colored tubes mounted in heavy black channels",
    elements: neonVacuum,
  },
  {
    slug: "schematic-clean",
    label: "Clean Schematic",
    description: "hollow technical rails, outlined terminals, and a calibrated iris",
    elements: schematicClean,
  },
  {
    slug: "schematic-blueprint",
    label: "Blueprint",
    description: "technical rails over a faint optical grid and measurement rings",
    elements: schematicBlueprint,
    postprocess(svg) {
      return svg.replace('fill="url(#background)"', 'fill="#061426"');
    },
  },
  {
    slug: "schematic-engraved",
    label: "Engraved Instrument",
    description: "recessed optical channels etched into a dark instrument panel",
    elements: schematicEngraved,
  },
  {
    slug: "schematic-telemetry",
    label: "Telemetry",
    description: "instrument rails with signal dashes, calibration nodes, and iris ticks",
    elements: schematicTelemetry,
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
