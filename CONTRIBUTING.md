# Contributing

Start with the [local development setup](README.md#local-development). See [DESIGN.md](DESIGN.md) for the site's structure and behavior, and [brand/README.md](brand/README.md) before changing brand assets.

## Editing site content

Edit source templates and data instead of generated HTML in `dist/`. Generated HTML and `node_modules/` are ignored by Git.

| Source | Purpose |
| --- | --- |
| `src/_data/people.json` | Names, titles, portraits, homepages, social links, biographies, and interests |
| `src/_data/site.json` | Site identity, organization type, taglines, and external links |
| `src/_includes/person.njk` | Shared person markup, labels, and interest lists |
| `src/_includes/home.njk` | Homepage mark, signature, and navigation |
| `src/_includes/home-links.njk` | Homepage links from the shared site data |
| `src/_includes/home-smoke.njk` | Homepage smoke canvas and visual tuning panel |
| `src/_includes/document.njk` | Shared document head and page structure |
| `src/index.njk`, `src/about/*.njk` | Page settings and page-specific markup |
| `eleventy.config.mjs` | Template configuration and the public asset passthrough list |

Homepage link labels and destinations come from `site.links` in `src/_data/site.json`; navigation styling lives in `styles.css`. The About link uses `site.links.about`. The homepage's More link and the About page's "See what we're making" link share `site.links["lasers.app"]`.

### People and portraits

Edit the people in `src/_data/people.json` and place their images in `about/portraits/`. Titles, biographies, and interests require content review before publication. Keep applicable third-party attribution in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Each person has a stable `id` for links, a single display `name`, and a `title`. A biography renders `bio.intro` as its own paragraph, followed by a paragraph containing the display name and `bio.detail`. Each interest has a `label` for the visible "Drawn to" list and a `background` object containing the decorative label and placement values. The first interests fill the available decorative positions, and the visible list includes every interest.

Portrait captions are controlled by `showPortraitCaptions` in `src/about/index.njk`. Profile numbering, alternating layouts, portrait alternative text, and jump navigation follow the people array automatically. The shared person template adds a decorative dot after every name.

Set a person's `homepage` to their full HTTP or HTTPS URL. The link below their name displays that URL without the protocol while retaining the full destination. Add optional `socials` entries with a `label` and full `url`. An optional `icon` names an SVG in `src/_includes/icons/` without the extension, such as `github` or `linkedin`; omit it to display the social label as text. Icon links have accessible labels and tooltips. External links open in a new tab; site navigation and jump links stay in the same tab. Leave `homepage` empty and `socials` empty, or omit either field, when no links are supplied; an empty link row does not render.

### Interest positioning

Each interest in `src/_data/people.json` has a foreground `label` and a fully populated `background` object. Keep all background fields explicit, including values that match the defaults, so the data shows each word's complete placement. The shared [person template](src/_includes/person.njk) places the first, second, and third interests in the upper, middle, and lower background slots respectively. All interests appear in the foreground "Drawn to" list.

#### Per-interest fields

```json
{
  "label": "Helping and teaching",
  "background": {
    "label": "Teaching",
    "offsetX": "0.3em",
    "insetY": "20%",
    "insetYMobile": "42%"
  }
}
```

The template retains the following fallbacks for partial inputs; the people data supplies every field explicitly.

| Field | Purpose | Renderer fallback |
| --- | --- | --- |
| `label` | Foreground wording in the interest list | Required |
| `background.label` | Decorative wording, rendered uppercase | Uses `label` |
| `background.offsetX` | Additional horizontal shift as a CSS length or percentage | `0px` |
| `background.insetY` | Vertical placement as a CSS length or percentage, shared across desktop and mobile | Uses the slot's responsive default |
| `background.insetYMobile` | Vertical placement override at viewport widths of 650 CSS pixels or less | Uses `background.insetY`, then the mobile slot default |

The background object's placement fields map to `--interest-offset-x`, `--interest-inset-y`, and `--interest-inset-y-mobile` on the background word. Only the listed background fields are read by the template.

Positive X offsets move right and negative offsets move left on either row layout, in addition to scrolling motion. Vertical insets measure from the slot's anchoring edge:

| Background slot | Vertical anchor | Desktop default | Mobile default |
| --- | --- | --- | --- |
| Upper | Top | `6%` | `2%` |
| Middle | Top | `45%` | `34%` |
| Lower | Bottom | `4%` | `2%` |

Increasing Y moves the upper and middle words down, but the lower word up. Negative insets move words outside their anchoring edge and can clip them at the profile boundary. For partial inputs, the mobile fallback order is `background.insetYMobile`, then `background.insetY`, then the mobile default. When filling missing fields, resolve mobile placement before adding a desktop default; copying the desktop default into both fields would change a word that previously used its separate mobile default.

Units have different reference sizes depending on the control:

| Value | Reference size | Example |
| --- | --- | --- |
| `em` in any placement field | Background word's font size | `0.3em` is a shift of 30% of the font size |
| `%` in `background.offsetX` | Background word's own width | `50%` moves right by half the word's width |
| `%` in either Y field | Profile section's height | `20%` places the anchoring edge one-fifth into the section |

Use `em` for nudges that should scale with the lettering and Y percentages for placement within the profile section. Converting between them preserves placement only at the measured font size and section height; it does not preserve responsive behavior.

#### Shared placement and sizing

The [About stylesheet](about/about.css) defines the shared horizontal anchors on `.person`. In these names, "top", "middle", and "bottom" identify the word's slot; all these insets control horizontal placement, and their percentages use the profile section's width.

| CSS variable | Default | Override |
| --- | --- | --- |
| `--interest-top-inset` | `-2%` | None |
| `--interest-middle-inset` | `8%` | `3%` on reversed rows |
| `--interest-bottom-inset` | `13%` | `2%` on mobile |
| `--interest-direction` | `1` through the transform fallback | `-1` on reversed rows |

Upper and lower words anchor left, while middle words anchor right. Reversed rows swap those sides. Positive horizontal insets move inward from the anchoring side. `--interest-direction` reverses the scroll-driven horizontal motion; it does not reverse the explicit `background.offsetX` adjustment.

Background words use `font-size: clamp(5rem, 13vw, 14rem)` on desktop and `20vw` on mobile, with `line-height: 1` and `letter-spacing: -0.055em`. The background container clips overflow. Keep per-word adjustments beside their wording in `people.json`, since changing a word's length can require a different placement. Shared anchors, breakpoints, sizing, and motion belong in CSS and JavaScript and apply across profiles.

#### Motion and visual review

The placement controls set the base position. [About motion](about/about.js) adds the generated `--interest-x` and `--interest-y` offsets as the profile passes through the viewport. Its `MOTION` constants control the interest effects:

| Constant | Value | Effect |
| --- | --- | --- |
| `interestTravel` | `170` | Horizontal movement in pixels per full unit of profile scroll progress |
| `interestRise` | `55` | Vertical travel from `27.5px` below to `27.5px` above the base position |
| `midpoint` | `0.5` | Scroll progress at which the added vertical offset is zero |
| `interestWindow` | `0.16` | Distance in scroll progress on either side of a word's brightness peak |
| `interestRestOpacity` | `0.018` | Opacity outside the brightness window |
| `interestPeakOpacity` | `0.16` | Additional opacity at the peak, giving `0.178` total |

The template assigns brightness peaks of `0.32`, `0.5`, and `0.68` to the upper, middle, and lower slots. Profile scroll progress runs from zero when its top reaches the viewport bottom to one when its bottom leaves the viewport top. Horizontal motion changes direction between neighboring slots as well as between normal and reversed rows. Without JavaScript, CSS supplies opacity `0.045`; reduced motion hides the background words while retaining the foreground interest list.

Review words at their brightest scroll positions as well as while scrolling. Check the complete decorative word and its interaction with names, links, biographies, and interest lists on desktop and mobile, including narrow phones. A placement that looks clear while the word is faint can obstruct copy at its peak. Capture [matched before and after screenshots](#before-and-after-screenshots) with normal motion, using a foreground alignment target so a background-only adjustment does not change the scroll position between captures.

### Generated discovery files

The build generates `robots.txt` and `sitemap.xml` from the site origin and page collection. Pages with `noindex: true` stay out of the sitemap. The shared document template gives every page its own canonical URL.

## Verification

Run `npm run check` before committing. It verifies generated brand SVGs, builds the site, and runs the site and brand tests. Use `npm run build` to generate a clean `dist/` bundle. All builds, including development rebuilds, regenerate `docs/screenshots/cover.png` with motion disabled at 0 ms in the pinned Linux capture container. Start Docker and run `npm run cover:install` before building. Include a changed cover with the source changes that produced it; CI rejects a stale committed image. See [the cover notes](docs/screenshots/README.md) for setup, capture settings, and runtime upgrades.

For page changes, review desktop and mobile layouts, keyboard navigation, reduced motion, and behavior without JavaScript. For brand changes, follow the [brand verification instructions](brand/README.md#regeneration), including the raster, opening-frame, and renderer checks when those assets are affected.

### Before and after screenshots

Pull requests targeting `main` or `preview` require before and after screenshots for visual changes. Use two existing checkouts: one with the base version and one with the proposed changes. Uncommitted edits are included. From a checkout containing the screenshot tooling, install its dependencies and the capture browser:

```sh
npm ci
npm run screenshots:install
```

On Linux hosts that lack Chromium's system libraries, use `npm run screenshots:install -- --with-deps` to install them with the browser.

Run `npm ci` in each input checkout if its build dependencies are missing, and prepare its cover runtime with `npm run cover:install` before building. Then capture both versions with one command:

```sh
npm run screenshots -- ../before-checkout . --page /about/ --selector '#rohith'
```

The command builds both checkouts, serves their `dist/` directories on temporary loopback ports, aligns the selected element, and captures matching desktop and mobile views. It closes the browser and servers when finished. The default desktop viewport is 1440 by 1000 CSS pixels and the mobile viewport is 390 by 844. At the default 2x pixel density, the PNGs are 2880 by 2000 and 780 by 1688 pixels, preserving the layout while making text and details sharper.

Use `--scale 1`, `--scale 2`, `--scale 3`, or `--scale 4` to choose pixel density. Density multiplies both PNG dimensions without changing the viewport layout; for example, the default desktop viewport at `--scale 3` produces a 4320 by 3000 PNG. Use `--viewport` to change the layout size or select only desktop or mobile.

Open `index.html` in the printed output directory to compare the pairs, then attach the separate PNGs to the PR's before/after table. Click a thumbnail to open the larger viewer. Click the enlarged image to zoom into that area at full resolution; click again to fit the image to the window. The Before/After buttons, Left/Right keys, and Space while the image area has focus switch versions while preserving the zoom and scroll position. The Full resolution button also switches between the original pixels and fit-to-window view. Escape or Close returns to the report. Open PNG links to the selected original image, and thumbnails still open PNGs directly without JavaScript. The report embeds its viewer code, so it works locally when moved together with its PNG files.

`capture.json` records the input commit IDs and dirty state, capture settings, browser version, image dimensions, and actual alignment. Output goes into an ignored `.screenshots/` directory; `--output` selects another empty directory. Failed runs retain `failure.json` and any completed images for diagnosis.

Useful variations:

```sh
# Align by an existing page anchor and capture only mobile
npm run screenshots -- ../before-checkout . --page '/about/#rohith' --viewport mobile

# Focus on a heading with a taller viewport and greater pixel density
npm run screenshots -- ../before-checkout . -p /about/ -s '#rohith h2' -w 390x1200 -d 3

# Capture the reduced-motion presentation
npm run screenshots -- ../before-checkout . -p /about/ -s '#rohith' --motion reduced

# Capture the homepage at second zero with motion disabled
npm run screenshots -- ../before-checkout . --motion reduced --time 0

# Reuse builds you have already prepared
npm run screenshots -- ../before-checkout . --no-build --page /about/
```

Use a unique CSS selector present in both versions. Without a selector, the command uses the page's `#anchor`, or the top of the page if there is no anchor. It positions the target 32 CSS pixels below the viewport top; `--offset` changes that spacing. If page boundaries or layout changes prevent the two targets from aligning, the command fails with the measured positions so you can choose a different selector or viewport. It also rejects missing pages, broken images, and page script errors.

Normal motion is the default, preserving the About page's decorative interests. Each page uses a controlled JavaScript clock that advances by `--time` milliseconds, then pauses; the default is 6000, allowing the homepage's wordmark and navigation reveals to finish. CSS transitions are disabled and CSS animations are held at the same elapsed time. `--motion reduced` selects the accessible reduced-motion presentation, which hides some artwork. Remove `?animate` when testing reduced motion, since that query deliberately overrides the preference. Screenshots show a single state; use a recording when reviewing animation behavior. Rendering can still differ across browser versions and operating systems, so capture both sides together on the same machine.

Run `npm run screenshots -- --help` for all options. Contributors changing the capture tooling should also run `npm run screenshots:test` after installing native Chromium and the cover runtime; this exercises real captures, alignment, pixel density, cover regeneration, and failure handling. The regular `npm run check` builds the cover in the pinned container and covers CLI parsing and local serving.

### Animation diagnostics

Append these query parameters to the local page URL when comparing animation behavior:

| Query | Effect |
| --- | --- |
| `?fps` | Display the homepage animation frame rate counter |
| `?renderer=svg` | Force the homepage SVG renderer |
| `?renderer=webgl` | Request the homepage WebGL renderer, with SVG fallback when unavailable |
| `?animate` | Preview motion regardless of the system preference on the homepage or About page |
| `?rotationSpeed=<multiplier>` | Set the center animation speed from `0.01x` to `100.00x` |
| `?smoke=off` | Disable homepage smoke |
| `?smoke=on` | Force smoke on and bypass its frame-rate safeguard |
| `?tune` | Open the live visual controls without changing smoke behavior |

Combine parameters with `&`, for example `http://localhost:4175/?animate&renderer=webgl`. Check reduced motion without the `animate` override too.

### Smoke and visual tuning

Use `http://localhost:4175/?animate&fps&tune` for the full review view. Add `smoke=on` when smoke must remain visible regardless of measured frame rate. Motion state is available from `StrangeLasersMotion.stats()` in DevTools, while smoke cadence and renderer measurements are available from `StrangeLasersSmoke.stats()`.

Smoke appears immediately and continuously samples page cadence. If the frame rate collapses critically, it disables only the smoke so the logo animation keeps priority. Reduced motion keeps smoke off unless `?animate` is present.

The tuning panel has collapsible sections for center animation rotation speed and smoke. Preset buttons provide common rotation speeds and starting points for distinct smoke looks; every slider remains editable after applying one. Drag the panel by its header or resize it from its lower-right corner to uncover an edge.

Smoke controls cover cloud count, edge density, puff opacity, drifted density, brightness, size, inward reach, drift speed, breakup, softness, and laser tint. `Edge density` controls coverage at the frame. Below `1x`, `Drifted density` controls how many clouds remain visible as they move inward, so very low values allow occasional wisps instead of a continuous veil. Above `1x`, it scales their density. `Inward reach` independently controls how far every plume can develop while its source and dense core remain outside the frame.

Every default sits at the midpoint of its control. Most multiplier controls use a logarithmic `0.01x` to `100.00x` range; drifted density extends down to `0.001x`, and inward reach extends up to `1000.00x`. Each slider has a synchronized numeric input. The panel updates the query string as values change, resets all visual controls together, and can copy a URL containing the complete settings.

## About page review

The About page is public and indexable on `main`. Review changes to team content on the `preview` branch and preview site before publication. Preview hostnames receive `X-Robots-Tag: noindex` through the shared `_headers` file.

Run `npm run dev` and open `http://localhost:4175/about/` to review the page.

Before release:

- Review the names, titles, biographies, interests, portraits, alternative text, and applicable portrait licensing notices
- Confirm the remaining company copy and public link destinations; keep the footer wording "Open-source software, made with care."
- Recheck desktop and mobile layouts, keyboard navigation, motion preferences, and both navigation paths
- Obtain approval for the final content and integration before merging into `main`; pushing and deploying require separate authorization

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for publishing and recovery.
