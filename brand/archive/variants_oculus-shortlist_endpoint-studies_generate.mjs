import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const shortlistDir = resolve(here, "..");

const palettes = [
  {
    slug: "abyss",
    label: "Abyss",
    logo: readFileSync(join(shortlistDir, "logo-oculus-abyss.svg"), "utf8"),
    mark: readFileSync(join(shortlistDir, "mark-oculus-abyss.svg"), "utf8"),
  },
  {
    slug: "moon-crimson",
    label: "Moon Crimson",
    logo: readFileSync(join(shortlistDir, "logo-oculus-moon-crimson.svg"), "utf8"),
    mark: readFileSync(join(shortlistDir, "mark-oculus-moon-crimson.svg"), "utf8"),
  },
];

const currentCircle = /<circle cx="70" cy="374" r="9" fill="([^"]+)"\/>/;
const currentSquare = /<rect x="439" y="129" width="18" height="18" fill="([^"]+)"\/>/;

function directed(svg) {
  const result = svg.replace(
    currentCircle,
    '<circle cx="66" cy="146" r="9" fill="$1"/>',
  );
  if (result === svg) throw new Error("Circle endpoint replacement failed");
  return result;
}

function pairedCircles(svg) {
  const result = directed(svg).replace(
    currentSquare,
    '<circle cx="448" cy="138" r="9" fill="$1"/>',
  );
  if (result.includes('<rect x="439" y="129"')) {
    throw new Error("Square endpoint replacement failed");
  }
  return result;
}

function addRearEndpoints(svg, isCounterflow) {
  const result = directed(svg).replace(
    /^(\s*)<rect x="439" y="129" width="18" height="18" fill="([^"]+)"\/>$/m,
    (line, indent, fill) => {
      const left = isCounterflow
        ? `<rect x="61" y="365" width="18" height="18" fill="${fill}"/>`
        : `<circle cx="70" cy="374" r="9" fill="${fill}"/>`;
      const right = isCounterflow
        ? `<circle cx="442" cy="350" r="9" fill="${fill}"/>`
        : `<rect x="433" y="341" width="18" height="18" fill="${fill}"/>`;
      return `${line}\n${indent}${left}\n${indent}${right}`;
    },
  );
  if (result === svg) throw new Error("Rear endpoint insertion failed");
  return result;
}

function alignCounterflow(svg) {
  const replacements = [
    ["M70 374C110 92 392 76 442 350", "M70 362C110 84 402 84 442 362"],
    ["M66 146C124 422 388 430 448 138", "M64 142C124 426 388 426 448 142"],
    ['<circle cx="66" cy="146" r="9"', '<circle cx="64" cy="142" r="9"'],
    ['<rect x="439" y="129" width="18" height="18"', '<rect x="439" y="133" width="18" height="18"'],
    ['<rect x="61" y="365" width="18" height="18"', '<rect x="61" y="353" width="18" height="18"'],
    ['<circle cx="442" cy="350" r="9"', '<circle cx="442" cy="362" r="9"'],
  ];
  let result = svg;
  for (const [before, after] of replacements) {
    const updated = result.replaceAll(before, after);
    if (updated === result) throw new Error(`Counterflow alignment failed for ${before}`);
    result = updated;
  }
  return result;
}

const treatments = [
  {
    slug: "current",
    label: "Current diagonal",
    description: "a circle and square split diagonally across separate arcs",
    apply(svg) {
      return svg;
    },
  },
  {
    slug: "directed",
    label: "Directed",
    description: "a circle source and square detector on the foreground arc",
    apply: directed,
  },
  {
    slug: "parallel",
    label: "Parallel flow",
    description: "circle sources and square detectors running left to right on both arcs",
    apply(svg) {
      return addRearEndpoints(svg, false);
    },
  },
  {
    slug: "counterflow",
    label: "Counterflow",
    description: "opposing circle-to-square directions on the foreground and rear arcs",
    apply(svg) {
      return alignCounterflow(addRearEndpoints(svg, true));
    },
  },
  {
    slug: "paired-circles",
    label: "Paired circles",
    description: "matching circular terminals on the foreground arc",
    apply: pairedCircles,
  },
];

function metadata(svg, palette, treatment, isMark) {
  const noun = isMark ? "mark" : "logo";
  const placement = isMark ? "" : " beside the Strange Lasers wordmark";
  return svg
    .replace(
      /<title id="logo-title">[^<]+<\/title>/,
      `<title id="logo-title">Strange Lasers ${palette.label} ${treatment.label} ${noun}</title>`,
    )
    .replace(
      /<desc id="logo-desc">[^<]+<\/desc>/,
      `<desc id="logo-desc">A mysterious laser eye with ${treatment.description}${placement}</desc>`,
    );
}

for (const palette of palettes) {
  for (const treatment of treatments) {
    writeFileSync(
      join(here, `logo-${palette.slug}-${treatment.slug}.svg`),
      metadata(treatment.apply(palette.logo), palette, treatment, false),
    );
    writeFileSync(
      join(here, `mark-${palette.slug}-${treatment.slug}.svg`),
      metadata(treatment.apply(palette.mark), palette, treatment, true),
    );
  }
}

console.log(`Generated ${palettes.length * treatments.length} endpoint studies`);
