# Deployment

The site uses Cloudflare Workers Static Assets for its production and shareable preview environments. Each environment deploys automatically from its owning branch through GitHub Actions.

| Environment | Branch | Hostname | Worker | Wrangler configuration |
| --- | --- | --- | --- | --- |
| Production | `main` | `strangelasers.com` | `strangelasers-production` | `wrangler.production.jsonc` |
| Preview | `preview` | `preview.strangelasers.com` | `strangelasers-staging` | `wrangler.preview.jsonc` |

`www2.strangelasers.com` remains attached to the preview Worker as a compatibility alias for previously shared links. The existing Worker name is retained so its deployment history and rollback versions remain available.

Worker ingress is account-level configuration: `preview.strangelasers.com` and `www2.strangelasers.com` are Custom Domains for the preview Worker, while `strangelasers.com/*` is a route to the production Worker. A zone-level redirect returns HTTP 308 from `www.strangelasers.com` to the matching apex path and preserves the query string. The Wrangler files intentionally omit `routes`, which keeps routine deployment tokens scoped to Worker code and prevents every asset deployment from reconciling otherwise unchanged zone routing. Cloudflare documents that omitting both route keys leaves dashboard-managed routing unchanged in its [Wrangler configuration guidance](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth).

## GitHub environments

The repository has `production` and `preview` GitHub environments. Each environment provides a secret named `CLOUDFLARE_API_TOKEN` and a variable named `CLOUDFLARE_ACCOUNT_ID`. Restrict the production environment to `main` and the preview environment to `preview`.

The workflow in `.github/workflows/deploy.yml` selects the GitHub environment and Wrangler configuration from the pushed branch. It performs a dry run before each deployment and serializes deployments per branch.

## Publishing a preview

Advance `preview` to the revision that should be shared, then push the branch. Do not treat deployment to preview as approval for production.

## Publishing production

Fast-forward `main` to an accepted revision and push it. GitHub records the deployment against the production environment and Wrangler updates the production Worker.

The production Worker initially uses a route over the existing proxied apex record. GitHub Pages remains configured as the dormant origin during the migration checkpoint, so removing the exact Worker route restores the previous request path. Retire GitHub Pages and remove `CNAME` only after the Worker deployment has been observed and accepted.

## Manual recovery

The branch-specific commands are:

```sh
npx --yes wrangler@4.129.1 deploy --config wrangler.preview.jsonc
npx --yes wrangler@4.129.1 deploy --config wrangler.production.jsonc
```

They use the standard `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables. These commands update Worker assets without altering ingress. Never place token values in the repository or command history.

The site is an assets-only Worker with no server-side handler or bindings. Static asset requests do not consume the Workers request quota. The repository is far below the [Workers Free static-asset limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets), verified 2026-09-09.
