# Deployment

The site uses Cloudflare Workers Static Assets for its production and shareable preview environments. Each environment deploys automatically from its owning branch through GitHub Actions.

Eleventy generates the deployment bundle in `dist/` using Nunjucks templates and shared data from `src/`. Both Wrangler configurations serve this directory. The passthrough list in `eleventy.config.mjs` copies public assets into it; templates, content data, build dependencies, and repository documentation stay outside the bundle. Template rendering happens during the build and requires no Worker runtime or additional Cloudflare service.

| Environment | Branch | Hostname | Worker | Wrangler configuration |
| --- | --- | --- | --- | --- |
| Production | `main` | `strangelasers.com` | `strangelasers-production` | `wrangler.production.jsonc` |
| Preview | `preview` | `preview.strangelasers.com` | `strangelasers-preview` | `wrangler.preview.jsonc` |

`www2.strangelasers.com` remains attached to the preview Worker as a compatibility alias for previously shared links. The preview Worker is named `strangelasers-preview`; both hostnames share its assets and deployment history.

Worker ingress is account-level configuration: `strangelasers.com` is a Custom Domain for the production Worker, while `preview.strangelasers.com` and `www2.strangelasers.com` are Custom Domains for the preview Worker. A zone-level redirect returns HTTP 308 from `www.strangelasers.com` to the matching apex path and preserves the query string. The Wrangler files intentionally omit `routes`, which keeps routine deployment tokens scoped to Worker code and prevents every asset deployment from reconciling otherwise unchanged hostname routing. Cloudflare documents that omitting both route keys leaves dashboard-managed routing unchanged in its [Wrangler configuration guidance](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth).

## GitHub environments

The repository has `production` and `preview` GitHub environments. Each environment provides a secret named `CLOUDFLARE_API_TOKEN` and a variable named `CLOUDFLARE_ACCOUNT_ID`. Restrict the production environment to `main` and the preview environment to `preview`.

The workflow in `.github/workflows/deploy.yml` selects the GitHub environment and Wrangler configuration from the pushed branch. It installs the Node.js version from `.node-version`, runs `npm ci`, installs Chromium and its system libraries with `npm run screenshots:install -- --with-deps`, and runs `npm run check` to build the site and project cover and verify templates and brand assets. It performs a dry run before each deployment and serializes deployments per branch.

Both environments retain the generated cover as a workflow artifact. After a successful production deployment, the `Publish project cover` job updates only `docs/screenshots/cover.png` on `main` when the image changed and the source revision is still the branch tip. Only that job receives repository contents write permission; the deployment job keeps read-only repository access. Preview runs do not publish to `main`.

## Publishing a preview

Advance `preview` to the revision that should be shared, then push the branch. Do not treat deployment to preview as approval for production.

## Publishing production

Fast-forward `main` to an accepted revision and push it. GitHub records the deployment against the production environment and Wrangler updates the production Worker.

`strangelasers.com` is served directly by the production Worker Custom Domain. GitHub Pages is disabled, and the repository does not carry a Pages `CNAME`. Use Cloudflare's Worker deployment history to roll back production assets.

## Manual recovery

Install the Node.js version in `.node-version`, restore the locked dependencies, and generate and verify `dist/` before using the branch-specific deployment commands:

```sh
npm ci
npm run screenshots:install
npm run check
npx --yes wrangler@4.129.1 deploy --config wrangler.preview.jsonc
npx --yes wrangler@4.129.1 deploy --config wrangler.production.jsonc
```

On Linux hosts that lack Chromium's system libraries, use `npm run screenshots:install -- --with-deps` for the browser installation step. The deployment commands use the standard `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables. These commands update Worker assets without altering ingress. Never place token values in the repository or command history.

The site is an assets-only Worker with no server-side handler or bindings. Static asset requests do not consume the Workers request quota. The repository is far below the [Workers Free static-asset limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets), verified 2026-09-09.
