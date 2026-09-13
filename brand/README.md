# Brand assets

Edit [palette.css](../palette.css) for shared colors and mark treatment values, and the SVG templates in this directory for static geometry. The homepage SVG and WebGL renderers read the same palette. Generated root SVGs have literal values, outlined lettering, and no font or stylesheet dependency.

## Palette and treatment

| Token | Value | Role |
| --- | --- | --- |
| `--laser-cyan-body` | `#11bfe9` | Cyan beam bodies, cyan flare, lower eye edge |
| `--laser-cyan-highlight` | `#78ebff` | LASERS lettering and cyan beam highlights |
| `--laser-purple-body` | `#7857ff` | STRANGE lettering, purple beam bodies, purple flare, upper eye edge |
| `--laser-purple-highlight` | `#a19af7` | Purple beam highlights |
| `--laser-core` | `#f7fdff` | White laser cores, flare centers, eye rim and dot |
| `--laser-background` | `#050b14` | Static eye fill and wordmark outlines |

The motion renderer retains darker side-face colors for depth shading. The animated lens also retains its translucent shading and pointer-responsive dot; it is not a flat copy of the static eye.

The mark uses a 3-unit white highlight at 0.88 opacity over a fully opaque 1-unit white core. The eye has a 10-unit colored stroke under its 6-unit white rim, exposing a 2-unit outer edge. Its vertical gradient holds purple through 25% and reaches cyan at 75%. These measurements use the mark's 512-unit viewBox.

The wordmark places the lasers behind the letters except where they cross one leg of each A. Its letters use a 1.7-unit near-black stroke before their 1.55 scale transform. Each perpendicular balanced four-point flare has long sharp tips and gently curved tapers, an opaque colored body, and an opaque white center scaled to 65% of the same shape. A 1-unit near-black stroke beneath the colored body leaves a 0.5-unit visible edge. The flare has no separate diagonal rays, spine, or center dot. Only the surrounding glow is translucent; the white beam highlight retains its separate 0.88 opacity.

The beam glow combines a 42-unit wide stroke at 0.2 opacity with an 18-unit tight stroke at 0.44 opacity. Each flare adds colored glow circles with radii of 27 and 11 units at 0.4 and 0.78 opacity. Wide and tight glow use Gaussian blur deviations of 15 and 5 respectively, all in wordmark viewBox units.

The transparent mark, wordmark, and combined logo are shared between light and dark backgrounds. `mark.svg` and the PNG icons deliberately include a dark background tile for favicon and app-icon use. The standalone wordmark uses a tighter `40 15 680 250` viewBox for small placements; the combined logo preserves the wider layout.

## Regeneration

Run from the repository root with Node.js 22 or newer:

```sh
node scripts/build-brand.mjs
node scripts/build-brand.mjs --check
node --test test/brand.test.mjs
```

The default command generates `mark-transparent.svg`, `mark.svg`, `wordmark.svg`, and `logo.svg`. `--check` verifies those static SVGs without writing. Tests also validate local SVG references, the selected treatment, CLI behavior, and PNG dimensions. Deployment runs these checks before publishing.

After changing mark colors or treatment, regenerate the raster icons and opening frame too:

```sh
node scripts/build-brand.mjs --png --opening
```

`--png` requires ImageMagick 7 (`magick`) with SVG rendering support. `--opening` requires `agent-browser`, its installed Chromium browser, and the site's locked dependencies installed with `npm ci`. Neither optional tool is needed for the default brand build, tests, or deployment checks. The opening export builds the site, captures the actual SVG renderer from `dist/index.html` at phase zero with literal computed styles, then rebuilds the site to include the captured asset. This keeps the placeholder aligned with the live animation. Regenerate it after changes to opening geometry or render styles as well.

The static check does not re-render PNGs or the opening frame. When changing those outputs, visually inspect the homepage at desktop and mobile sizes, with reduced motion, forced SVG (`?renderer=svg`), forced WebGL (`?animate&renderer=webgl`), and scripts unavailable. Check the transparent assets on both light and dark backgrounds. Increase image asset version queries in the shared templates under `src/_includes/` when refreshing browser caches is necessary. Stylesheet URLs are [versioned from their contents automatically](../DESIGN.md#build-structure).

For a larger transparent PNG, choose the desired output width:

```sh
magick -background none -density 576 wordmark.svg -resize 2720x wordmark.png
```

The SVG remains the resolution-independent source; its lettering preserves the site's existing glyph outlines.
