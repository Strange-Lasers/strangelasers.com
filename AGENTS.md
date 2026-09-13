# Strange Lasers guidance

## Project sources

Read [README.md](README.md) for the site overview, [CONTRIBUTING.md](CONTRIBUTING.md) for editing and verification workflows, and [DESIGN.md](DESIGN.md) for site structure and behavior. Read [brand/README.md](brand/README.md) before changing brand assets and [DEPLOYMENT.md](DEPLOYMENT.md) before publishing. The site is a static Cloudflare Workers Assets project with SVG and WebGL renderers, not a framework application.

Eleventy builds Nunjucks templates from `src/` into the generated `dist/` directory. Keep shared copy in `src/_data/site.json`, people in `src/_data/people.json`, and reusable markup in `src/_includes/`. Edit the source templates and data instead of generated HTML. Run `npm ci` for a fresh checkout, `npm run dev` for local preview, and `npm run check` before committing site changes. The explicit passthrough list in `eleventy.config.mjs` owns which static assets reach the deployment bundle.

Use `palette.css` for shared brand colors and treatment tokens, and `brand/*.svg.template` for production static geometry. Regenerate derived assets with `scripts/build-brand.mjs`; do not hand-edit generated root SVGs. Preserve the existing letter outlines and the A-leg depth relationships unless a requested design change explicitly changes them.

## Design studies

Keep exploratory artwork separate from production until the user adopts a design. A comparison option is not approval to replace the selected favorite, publish assets, or deploy. Keep private study files and machine-specific paths out of this repository.

When a study favorite changes, update its interactive preview and companion standalone SVG and PNG together. Preserve the selected favorite when reorganizing a comparison grid; use stable identities rather than display coordinates. Standalone SVGs must render without the study's CSS, JavaScript, fonts, or external resources.

Rows represent beam depth and columns represent visual treatments. Keep each treatment consistent down its column, make labels describe what actually varies, and mark inapplicable cells instead of presenting duplicate artwork as another design. Retain variants that test a meaningful choice at the intended display size; remove near-duplicates after preserving a recoverable copy. Pinning, four-way navigation, and combined-logo selection must continue to follow the displayed grid.

Keep solid flare bodies, outlines, and white centers opaque unless transparency is explicitly requested. Treat surrounding glow separately from the solid geometry. A thickness-only change must not also change opacity or color. Use the shared brand colors exactly where they apply; do not silently dim them for a theme.

## Verification

Inspect the full wordmark at its intended size and enlarged A-counter details on both light and dark backgrounds. Check that letters retain their colors, beam crossings match the selected depth pass in both lines, flare centers remain aligned, and outlines survive standalone SVG and PNG rendering. Verify the combined logo and mark comparison when study controls change. Do not repeatedly open a user-visible browser when the user has chosen to refresh the page themselves.

Run `node scripts/build-brand.mjs --check` and `node --test test/brand.test.mjs` for production brand changes. Follow the additional raster, opening-frame, and renderer checks in the brand guide when those assets are affected. Local verification and commits do not authorize a push or deployment.
