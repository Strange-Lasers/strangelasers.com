# Strange Lasers

Source for [strangelasers.com](https://strangelasers.com/).

Append `?fps` to display the animation frame rate counter.

The homepage keeps the SVG renderer through its opening still and bloom, then hands the continuous animation to WebGL2. It falls back to SVG when WebGL2 is unavailable or loses its context. Append `?renderer=svg` or `?renderer=webgl` to force either renderer for comparison.

Deploy review checkpoints to [www2.strangelasers.com](https://www2.strangelasers.com/) with `npx --yes wrangler@4.129.1 deploy --config wrangler.staging.jsonc`. This updates an assets-only Worker and its staging custom domain without changing the GitHub Pages production site. The asset ignore file keeps repository and deployment metadata out of the public bundle.

Brand development sources and motion experiments are preserved on the frozen `archive/brand-development` branch.
