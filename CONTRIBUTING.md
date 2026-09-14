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
| `src/_includes/document.njk` | Shared document head and page structure |
| `src/index.njk`, `src/about/*.njk` | Page settings and page-specific markup |
| `eleventy.config.mjs` | Template configuration and the public asset passthrough list |

Homepage link labels and destinations come from `site.links` in `src/_data/site.json`; navigation styling lives in `styles.css`. The About link uses `site.links.about`. The homepage's More link and the About page's "See what we're making" link share `site.links["lasers.app"]`.

### People and portraits

Edit the people in `src/_data/people.json` and place their images in `about/portraits/`. Titles, biographies, and interests require content review before publication. Keep applicable third-party attribution in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Each person has a stable `id` for links, a single display `name`, and a `title`. A biography renders `bio.intro` as its own paragraph, followed by a paragraph containing the display name and `bio.detail`. Each interest has a `label` for the visible "Drawn to" list; an optional `backgroundLabel` supplies the large, faint wording behind the portrait and biography. The first interests fill the available decorative positions, and the visible list includes every interest.

Portrait captions are controlled by `showPortraitCaptions` in `src/about/index.njk`. Profile numbering, alternating layouts, portrait alternative text, and jump navigation follow the people array automatically. The shared person template adds a decorative dot after every name.

Set a person's `homepage` to their full HTTP or HTTPS URL. The link below their name displays that URL without the protocol while retaining the full destination. Add optional `socials` entries with a `label` and full `url`. An optional `icon` names an SVG in `src/_includes/icons/` without the extension, such as `github` or `linkedin`; omit it to display the social label as text. Icon links have accessible labels and tooltips. External links open in a new tab; site navigation and jump links stay in the same tab. Leave `homepage` empty and `socials` empty, or omit either field, when no links are supplied; an empty link row does not render.

### Interest positioning

Background interest anchors and horizontal drift follow the alternating portrait layout, with separate middle insets for the normal and reversed rows. The `--interest-top-inset`, `--interest-middle-inset`, and `--interest-bottom-inset` properties on `.person` in `about/about.css` set the shared horizontal insets for the upper, middle, and lower labels; positive values move them inward. The mobile layout uses a smaller default inset for the lower label. Keep individual placement adjustments in each interest's data fields.

Each interest can set `backgroundOffsetX` to a CSS length or percentage for an independent horizontal adjustment. Positive values move right and negative values move left on either row layout, in addition to the scrolling motion. Use `em` for an adjustment relative to the word's font size, or percentages relative to the word's own width; `100%` moves it right by one full word width.

Set `backgroundInsetY` to a CSS length or percentage to override an interest's vertical placement. The upper and middle labels measure from the top of the profile section; the lower label measures from the bottom. Percentages use the section's height. For example, `"backgroundInsetY": "39%"` places the middle label 39% from the top before scrolling motion. The override applies on desktop and mobile; omit it to retain the responsive defaults.

The build generates `robots.txt` and `sitemap.xml` from the site origin and page collection. Pages with `noindex: true` stay out of the sitemap. The shared document template gives every page its own canonical URL.

## Verification

Run `npm run check` before committing. It verifies generated brand SVGs, builds the site, and runs the site and brand tests. Use `npm run build` when only a clean `dist/` bundle is needed.

For page changes, review desktop and mobile layouts, keyboard navigation, reduced motion, and behavior without JavaScript. For brand changes, follow the [brand verification instructions](brand/README.md#regeneration), including the raster, opening-frame, and renderer checks when those assets are affected.

### Before and after screenshots

Pull requests targeting `main` or `preview` require before and after screenshots for visual changes. Use two existing checkouts: one with the base version and one with the proposed changes. Uncommitted edits are included. From a checkout containing the screenshot tooling, install its dependencies and the capture browser:

```sh
npm ci
npm run screenshots:install
```

On Linux hosts that lack Chromium's system libraries, use `npm run screenshots:install -- --with-deps` to install them with the browser.

Run `npm ci` in each input checkout if its build dependencies are missing. Then capture both versions with one command:

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

# Reuse builds you have already prepared
npm run screenshots -- ../before-checkout . --no-build --page /about/
```

Use a unique CSS selector present in both versions. Without a selector, the command uses the page's `#anchor`, or the top of the page if there is no anchor. It positions the target 32 CSS pixels below the viewport top; `--offset` changes that spacing. If page boundaries or layout changes prevent the two targets from aligning, the command fails with the measured positions so you can choose a different selector or viewport. It also rejects missing pages, broken images, and page script errors.

Normal motion is the default, preserving the About page's decorative interests. Each page uses a controlled JavaScript clock that advances by `--time` milliseconds, then pauses; the default is 6000, allowing the homepage's wordmark and navigation reveals to finish. CSS transitions are disabled and CSS animations are held at the same elapsed time. `--motion reduced` selects the accessible reduced-motion presentation, which hides some artwork. Remove `?animate` when testing reduced motion, since that query deliberately overrides the preference. Screenshots show a single state; use a recording when reviewing animation behavior. Rendering can still differ across browser versions and operating systems, so capture both sides together on the same machine.

Run `npm run screenshots -- --help` for all options. Contributors changing the capture tooling should also run `npm run screenshots:test` after installing Chromium; this exercises real captures, alignment, pixel density, and failure handling. The regular `npm run check` covers CLI parsing and local serving without requiring a browser download.

### Animation diagnostics

Append these query parameters to the local page URL when comparing animation behavior:

| Query | Effect |
| --- | --- |
| `?fps` | Display the homepage animation frame rate counter |
| `?renderer=svg` | Force the homepage SVG renderer |
| `?renderer=webgl` | Request the homepage WebGL renderer, with SVG fallback when unavailable |
| `?animate` | Preview motion regardless of the system preference on the homepage or About page |

Combine parameters with `&`, for example `http://localhost:4175/?animate&renderer=webgl`. Check reduced motion without the `animate` override too.

## About page review

The About page is public and indexable on `main`. Review changes to team content on the `preview` branch and preview site before publication. Preview hostnames receive `X-Robots-Tag: noindex` through the shared `_headers` file.

Run `npm run dev` and open `http://localhost:4175/about/` to review the page.

Before release:

- Review the names, titles, biographies, interests, portraits, alternative text, and applicable portrait licensing notices
- Confirm the remaining company copy and public link destinations; keep the footer wording "Open-source software, made with care."
- Recheck desktop and mobile layouts, keyboard navigation, motion preferences, and both navigation paths
- Obtain approval for the final content and integration before merging into `main`; pushing and deploying require separate authorization

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for publishing and recovery.
