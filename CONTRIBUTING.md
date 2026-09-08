# Contributing

## Local preview

Run a hot-reloading local server from the repository root:

```sh
npx --yes vite --host 127.0.0.1 --port 4174 --strictPort
```

Open `http://127.0.0.1:4174/`. Vite reloads the page as source files change.

## Motion and smoke review

The homepage keeps the SVG renderer through its opening still and bloom, then hands the continuous animation to WebGL2. It falls back to SVG when WebGL2 is unavailable or loses its context.

The following query parameters can be combined:

- `?animate` bypasses reduced-motion behavior for visual review
- `?fps` displays the animation frame-rate counter
- `?renderer=svg` or `?renderer=webgl` forces a logo renderer
- `?rotationSpeed=<multiplier>` sets the center animation speed from `0.01x` to `100.00x`
- `?smoke=off` disables smoke
- `?smoke=on` forces smoke on and bypasses its frame-rate safeguard
- `?tune` opens the live visual controls without changing smoke behavior

Use `?animate&fps&tune` for the full review view. Add `smoke=on` only when the smoke must remain visible regardless of measured frame rate. Current motion state is available from `StrangeLasersMotion.stats()` in DevTools, while smoke cadence and renderer measurements are available from `StrangeLasersSmoke.stats()`.

The smoke is visible immediately and continuously samples page cadence. If the frame rate collapses critically, it disables only the smoke so the logo animation keeps priority. Reduced motion keeps the smoke off unless `?animate` is present.

The tuning panel has collapsible sections for center animation rotation speed and smoke. Smoke controls cover cloud count, edge density, puff opacity, inner density, brightness, size, inward reach, drift speed, breakup, softness, and laser tint. Drag the panel by any part of its header or resize it from its lower-right corner to uncover an edge. `Edge density` controls boundary coverage, `Inner density` controls smoke strength farther from the edge, and `Inward reach` controls how far the clouds can extend. Every default sits at the midpoint of its control. Multiplier controls use a logarithmic 0.01x to 100.00x range, and each slider has a synchronized numeric input. The panel updates the query string as values change, resets all visual controls together, and can copy a URL containing the complete settings.

## Staging deployment

Deploy review checkpoints to [www2.strangelasers.com](https://www2.strangelasers.com/):

```sh
npx --yes wrangler@4.129.1 deploy --config wrangler.staging.jsonc
```

This updates the assets-only staging Worker and its custom domain without changing the GitHub Pages production site. The asset ignore file keeps repository and deployment metadata out of the public bundle.
