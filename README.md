# Strange Lasers

Source for [strangelasers.com](https://strangelasers.com/).

The site uses [Eleventy](https://www.11ty.dev/) with [Nunjucks templates](https://www.11ty.dev/docs/languages/nunjucks/) to generate static HTML, with SVG and WebGL renderers for the animated homepage mark. Production and shareable preview deployments use Cloudflare Workers Static Assets.

## Local development

Install the Node.js version in [.node-version](.node-version), then run:

```sh
npm ci
npm run screenshots:install
npm run dev
```

Open `http://localhost:4175/`. The development server rebuilds when templates, data, or public assets change. Run `npm run check` before committing and `npm run build` to generate a clean `dist/` bundle. Every build also refreshes [the project cover](docs/screenshots/README.md) from the homepage at second zero with motion disabled. Serve or deploy `dist/`, not the repository root.

The cover uses Playwright's Chromium browser. On Linux hosts that lack its system libraries, install them with `npm run screenshots:install -- --with-deps`.

## Documentation

| Guide | Contents |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Content editing, local checks, animation diagnostics, and About page review |
| [DESIGN.md](DESIGN.md) | Build structure, homepage renderers, page behavior, and motion accessibility |
| [brand/README.md](brand/README.md) | Shared palette, editable SVG sources, asset regeneration, and visual verification |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Branch ownership, automatic deployment, and recovery instructions |

The About page is published at `/about/` and included in the sitemap. Use the [About page review process](CONTRIBUTING.md#about-page-review) when changing team content.
