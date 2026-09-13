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

Each person has a stable `id` for links, a single display `name`, and a `title`. A biography renders `bio.intro` as its own paragraph, followed by a paragraph containing the display name and `bio.detail`. Each interest has a `label`; an optional `cloudLabel` supplies its background wording. The first interests fill the available decorative positions, and the visible list includes every interest.

Portrait captions are controlled by `showPortraitCaptions` in `src/about/index.njk`. Profile numbering, alternating layouts, portrait alternative text, and jump navigation follow the people array automatically. The shared person template adds a decorative dot after every name.

Set a person's `homepage` to their full HTTP or HTTPS URL. The link below their name displays that URL without the protocol while retaining the full destination. Add optional `socials` entries with a `label` and full `url`. An optional `icon` names an SVG in `src/_includes/icons/` without the extension, such as `github` or `linkedin`; omit it to display the social label as text. Icon links have accessible labels and tooltips. External links open in a new tab; site navigation and jump links stay in the same tab. Leave `homepage` empty and `socials` empty, or omit either field, when no links are supplied; an empty link row does not render.

### Interest positioning

Background interest anchors and horizontal drift follow the alternating portrait layout, with separate middle insets for the normal and reversed rows. The `--interest-top-inset`, `--interest-middle-inset`, and `--interest-bottom-inset` properties on `.person` in `about/about.css` set each label's inset from its anchored edge; positive values move it inward. Override these properties on a person's ID selector, such as `#bismeet`, to adjust that profile independently. The mobile layout uses a smaller default bottom inset.

Each interest can set `cloudOffset` to a CSS length or percentage for an independent horizontal adjustment. Positive values move right and negative values move left on either row layout, in addition to the scrolling motion. Use `em` for an adjustment relative to the word's font size, or percentages relative to the word's own width; `100%` moves it right by one full word width.

## Verification

Run `npm run check` before committing. It verifies generated brand SVGs, builds the site, and runs the site and brand tests. Use `npm run build` when only a clean `dist/` bundle is needed.

For page changes, review desktop and mobile layouts, keyboard navigation, reduced motion, and behavior without JavaScript. For brand changes, follow the [brand verification instructions](brand/README.md#regeneration), including the raster, opening-frame, and renderer checks when those assets are affected.

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

The About content is a draft available on the `preview` branch and preview site while its content is under review. Continue editing on `feat/about-us` and merge accepted changes into `preview`. Only the reviewed page belongs on `main`.

Run `npm run dev` and open `http://localhost:4175/about/` to review the page.

Before release:

- Review the names, titles, biographies, interests, portraits, alternative text, and applicable portrait licensing notices
- Confirm the remaining company copy and public link destinations; keep the footer wording "Open-source software, made with care."
- Recheck desktop and mobile layouts, keyboard navigation, motion preferences, and both navigation paths
- Obtain approval for the final content and integration before merging into `main`; pushing and deploying require separate authorization

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for publishing and recovery.
