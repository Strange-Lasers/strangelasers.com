# Strange Lasers

Source for [strangelasers.com](https://strangelasers.com/).

Append `?fps` to display the animation frame rate counter.

The homepage keeps the SVG renderer through its opening still and bloom, then hands the continuous animation to WebGL2. It falls back to SVG when WebGL2 is unavailable or loses its context. Append `?renderer=svg` or `?renderer=webgl` to force either renderer for comparison.

Production and shareable preview deployments use Cloudflare Workers Static Assets. See [DEPLOYMENT.md](DEPLOYMENT.md) for branch ownership, automatic deployment, and recovery instructions.

Brand development sources and motion experiments are preserved on the frozen `archive/brand-development` branch.
