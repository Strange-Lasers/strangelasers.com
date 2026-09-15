# Site design

The site generates static HTML at build time and adds animation in the browser. See [CONTRIBUTING.md](CONTRIBUTING.md) for editing instructions and verification commands.

## Build structure

Eleventy renders Nunjucks templates from `src/` to plain HTML in `dist/`. Shared data in `src/_data/` supplies site copy and people, and reusable markup lives in `src/_includes/`. Nunjucks escapes data values as text and fails the build when a required rendered value is missing.

The explicit passthrough list in `eleventy.config.mjs` copies the CSS, SVG/WebGL renderers, and other public assets without modification. Templates, content data, build dependencies, and repository documentation stay outside the deployment bundle. Template rendering requires no Worker runtime; [DEPLOYMENT.md](DEPLOYMENT.md) describes how Cloudflare Workers Static Assets serves the generated bundle.

Stylesheet URLs include a version derived from their contents. The `assetVersion` filter in `eleventy.config.mjs` hashes each stylesheet during template rendering, so CSS edits receive fresh URLs in the generated HTML even when a preview proxy or CDN caches the previous styles.

After each filesystem build, the `eleventy.after` hook runs `scripts/build-cover.mjs` against the finished output. It launches the digest-pinned Linux/amd64 browser image in `scripts/cover-runtime.json`, with the built site and capture code mounted read-only and external networking disabled. The container uses the shared screenshot renderer with reduced motion and a clock paused at 0 ms. Software compositing, baseline Skia CPU paths, and sRGB keep rendering independent of the host graphics hardware. This includes development rebuilds; in-memory template renders do not generate a cover. The PNG stays outside the deployment bundle and is replaced atomically only after a successful capture whose bytes differ from the existing file. Identical output preserves the file's modification time. CI builds through the same entry point and verifies the committed image without publishing a separate cover commit.

## Homepage rendering

The homepage keeps the SVG renderer through its opening still and bloom, then hands the continuous animation to WebGL2. It falls back to SVG when WebGL2 is unavailable or loses its context. The motion logic lives in `logo-motion.js`, with the WebGL renderer in `logo-webgl.js`. The [animation diagnostics](CONTRIBUTING.md#animation-diagnostics) let contributors compare renderers and motion preferences.

Both renderers read the shared palette in `palette.css`. The [brand guide](brand/README.md) owns the palette, static geometry, asset generation, and visual verification details. Earlier brand development sources and motion experiments are preserved on the frozen `archive/brand-development` branch.

The homepage adds adaptive WebGL2 edge smoke through `edge-smoke.js`, independently of the logo renderer. Its canvas and optional visual tuning panel live in `src/_includes/home-smoke.njk`; the build copies the smoke script into the public bundle. Smoke yields to reduced motion, unavailable WebGL2, context loss, and critically low frame rates. The `?animate` and `?smoke=on` review overrides and the `?tune` controls are described in [smoke and visual tuning](CONTRIBUTING.md#smoke-and-visual-tuning).

### Navigation

The homepage provides a text-only About link beside GitHub, Stowplan, and More, plus a steady link over the eye that reveals its label on hover or keyboard focus. Both About links open `/about/` without overriding motion preferences. More links to the product catalog at `https://lasers.app`, as does the About page's "See what we're making" link. External links open in a new tab with `noopener noreferrer`; site navigation and jump links stay in the same tab.

## About page

The `/about/` page introduces the team through portraits, short biographies, and scroll-driven glimpses of their interests. It is linked from the homepage, has its own canonical URL, and is included in the public sitemap. See the [About page review process](CONTRIBUTING.md#about-page-review) for its publication requirements.

The page uses native scrolling and anchor navigation. JavaScript adds parallax, fading background interests, and the active-person indicator; it schedules frames only in response to page events. The page's styles and scroll behavior live in `about/about.css` and `about/about.js`. It reuses the site's palette, brand assets, and initialization script, `site-init.js`.

Background interest anchors switch sides and horizontal drift reverses with the alternating portrait layout. Per-interest horizontal offsets remain independent of the row layout and add to the scrolling motion. See [interest positioning](CONTRIBUTING.md#interest-positioning) for the CSS controls and content fields.

### Motion and accessibility

With reduced motion enabled, portraits and optical linework stay still, background interest effects are hidden, and interests remain readable in each biography. The `?animate` override allows explicit motion previews using the same preference handling as the homepage. All About content and links also work without JavaScript.
