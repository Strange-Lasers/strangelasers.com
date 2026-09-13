# Strange Lasers

Source for [strangelasers.com](https://strangelasers.com/).

Append `?fps` to display the animation frame rate counter.

The homepage keeps the SVG renderer through its opening still and bloom, then hands the continuous animation to WebGL2. It falls back to SVG when WebGL2 is unavailable or loses its context. Append `?renderer=svg` or `?renderer=webgl` to force either renderer for comparison.

Production and shareable preview deployments use Cloudflare Workers Static Assets. See [DEPLOYMENT.md](DEPLOYMENT.md) for branch ownership, automatic deployment, and recovery instructions.

See [brand/README.md](brand/README.md) for the shared palette, editable SVG sources, asset regeneration, and verification commands. Earlier brand development sources and motion experiments are preserved on the frozen `archive/brand-development` branch.

## Development

The site uses [Eleventy](https://www.11ty.dev/) with [Nunjucks templates](https://www.11ty.dev/docs/languages/nunjucks/). Templates render to plain HTML in `dist/`; the existing CSS, SVG/WebGL renderers, and browser scripts are copied without modification. Install the Node.js version in `.node-version`, then run:

```sh
npm ci
npm run dev
```

The development server serves `http://localhost:4175/` and rebuilds when templates, data, or public assets change. Use `npm run build` to generate a clean `dist/` bundle, or `npm run check` to build and run the site and brand checks. Serve or deploy `dist/`, not the repository root. Generated HTML and `node_modules/` are ignored by Git.

| Source | Purpose |
| --- | --- |
| `src/_data/people.json` | Names, roles, portraits, homepages, social links, biographies, and interests |
| `src/_data/site.json` | Site identity, organization type, taglines, and external links |
| `src/_includes/person.njk` | Shared person markup, labels, and interest lists |
| `src/_includes/home.njk` | Homepage mark, signature, and navigation |
| `src/_includes/document.njk` | Shared document head and page structure |
| `src/index.njk`, `src/about/*.njk` | Page settings and page-specific markup |
| `eleventy.config.mjs` | Template configuration and the public asset passthrough list |

Each person has a stable `id` for links and a single display `name`. Profile numbering, alternating layouts, portrait alternative text, and jump navigation follow the people array automatically. A biography renders `bio.intro` as its own paragraph, followed by a paragraph containing the display name and `bio.detail`. Each interest has a `label`; an optional `cloudLabel` supplies its background wording. The first interests fill the available decorative positions, and the visible list includes every interest. Nunjucks escapes data values as text and fails the build when a required rendered value is missing.

Set a person's `homepage` to their full HTTP or HTTPS URL. The link below their name displays that URL without the protocol while retaining the full destination. Add optional `socials` entries with a `label` and full `url`. An optional `icon` names an SVG in `src/_includes/icons/` without the extension, such as `github` or `linkedin`; omit it to display the social label as text. Icon links have accessible labels and tooltips. Leave `homepage` empty and `socials` empty, or omit either field, when no links are supplied; an empty link row does not render.

## About page prototype

The About content is a draft available on the `preview` branch and preview site while its content is under review. Continue editing on `feat/about-us` and merge accepted changes into `preview`. Only the reviewed page belongs on `main`.

The `/about/` page introduces the team through portraits, short biographies, and scroll-driven glimpses of their interests. It is linked from the homepage and carries a `noindex` directive while its content is under review.

Run `npm run dev` and open `http://localhost:4175/about/` to review the page.

Edit the people in `src/_data/people.json` and place their images in `about/portraits/`. Roles, biographies, and interests require content review before publication. Portrait captions are controlled by `showPortraitCaptions` in `src/about/index.njk`. The shared person template adds a decorative dot after every name. Keep applicable third-party attribution in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The page uses native scrolling and anchor navigation. JavaScript adds parallax, fading background interests, and the active-person indicator; it schedules frames only in response to page events. With reduced motion enabled, portraits and optical linework stay still, background interest effects are hidden, and interests remain readable in each biography. Append `?animate` to explicitly preview motion regardless of the system preference, using the same override as the homepage. All content and links also work without JavaScript. The page's styles and scroll behavior live in `about/`. It reuses the site's palette, brand assets, and initialization script.

### Homepage navigation

The homepage provides a text-only About link beside GitHub and Stowplan, plus a steady link over the eye that reveals its label on hover or keyboard focus. Both links open `/about/` without overriding motion preferences. Their label and destination come from `site.links.about` in `src/_data/site.json`; their styling lives in `styles.css`.

### Before release

- Review the names, roles, biographies, interests, portraits, alternative text, and applicable portrait licensing notices
- Confirm the remaining company copy and public link destinations; keep the footer wording "Open-source software, made with care."
- Recheck desktop and mobile layouts, keyboard navigation, motion preferences, and both navigation paths
- Obtain approval for the final content and integration before merging into `main`; pushing and deploying require separate authorization
