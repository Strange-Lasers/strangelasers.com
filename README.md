# Strange Lasers

This project contains the static website for [strangelasers.com](https://strangelasers.com/) and the source material for the Strange Lasers identity.

## Site

The deployable GitHub Pages site lives at the project root. Its primary logo is the depth-aware quarter-turn gimbal, paired with the Strange Lasers wordmark, the line "We write software," and links to the GitHub organization and Stowplan.

Each Counterflow arc spins quickly around its local Y axis while a slower outer gimbal rotates that axis around the pupil. The purple arc remains one quarter-turn ahead of the cyan arc. The fast and slow periods are exact multiples, so the compound motion returns to its starting state without a jump. Visitors who request reduced motion receive the matching static production mark.

The instrumented logo remains available in [gimbal.html](gimbal.html), and the earlier motion comparison remains available in [motion-comparison.html](motion-comparison.html). Append `?animate` to any page to force animation when the operating system requests reduced motion.

## Brand

The canonical primary SVG assets are [logo.svg](logo.svg), [mark.svg](mark.svg), and [wordmark.svg](wordmark.svg). The homepage uses [mark-transparent.svg](mark-transparent.svg) as its reduced-motion fallback so the static mark blends into the full-viewport composition. The shared production colors live in [palette.css](palette.css). Alternate palettes, avatar PNGs, the asset generator, and the design exploration archive live under [brand/](brand/).

Run `node brand/generate-final-assets.mjs` from the project root to rebuild the primary site assets and palette variants. The generator requires `rsvg-convert`.

## Preview

Serve the project root with any static HTTP server to preview the site locally.
