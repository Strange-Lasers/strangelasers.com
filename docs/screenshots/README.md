# Project cover

The cover shows the built homepage at second zero with motion disabled through the reduced-motion preference. Its JavaScript clock stays paused at 0 ms, the mark keeps its opening pose, and the wordmark, primary tagline, and navigation are visible. The viewport and PNG are 1440 by 1000 pixels at 1x density.

## Setup and use

Start a Docker-compatible engine with `linux/amd64` support, then run:

```sh
npm ci
npm run cover:install
npm run build
```

Docker Desktop supplies the engine and architecture emulation on macOS. Colima also works; on Apple Silicon, `colima start --vm-type vz --vz-rosetta` enables Rosetta for the x86 browser. Docker's selected context or `DOCKER_CONTEXT` chooses the engine. The build never starts a VM or changes that selection. Keep the engine running while developing. The image is downloaded once per runtime version and subsequent captures work offline.

Every Eleventy filesystem build, including `npm run build`, `npm run check`, and development rebuilds, captures the finished homepage automatically. `npm run cover` recaptures an existing `dist/` without rebuilding it. `npm run cover -- --help` describes the command and exit statuses. The build fails if capture fails and preserves the previous image. Identical PNG bytes leave both the file contents and modification time untouched.

## Reproducible rendering

Local builds and CI use the exact image digest and `linux/amd64` architecture in `scripts/cover-runtime.json`. That fixes Chromium, Node.js, system fonts, and Linux rendering libraries. Capture uses software compositing, baseline Skia CPU paths, and an sRGB color profile, alongside the fixed clock, viewport, locale, and timezone. It does not use host fonts or a host browser. See [Playwright's container guidance](https://playwright.dev/docs/docker) and [visual comparison guidance](https://playwright.dev/docs/test-snapshots).

Only built public files, capture scripts, and the locked Playwright JavaScript client packages are mounted in the capture container, all read-only. The page is served inside that container with external networking disabled. The PNG returns to the host for comparison and atomic replacement. Capture diagnostics include an identifier and duration; a timeout triggers container cleanup. Docker bind mounts must be able to reach the local checkout and built output.

Commit a changed cover with the source changes that produced it. The image stays outside `dist/`. Both deployment environments regenerate it through the same entry point, retain the result as an artifact, and fail validation if it differs from the committed PNG. CI does not create cover commits. If validation fails, run `npm run check` locally, review the image diff, and commit the result.

Ordinary [before/after screenshots](../../CONTRIBUTING.md#before-and-after-screenshots) still use native Chromium installed with `npm run screenshots:install`. Capture both comparison sides together on the same machine; those images are independent of the reproducible cover.

## Updating the capture runtime

Update the pinned Playwright package and lockfile together with `scripts/cover-runtime.json`. Use the matching official Playwright image's Linux/amd64 manifest digest, preserving the architecture pin. `docker manifest inspect mcr.microsoft.com/playwright:vVERSION-noble` lists the platform manifests. Run `npm ci` and `npm run cover:install`, then `npm run check` and `npm run screenshots:test`. Review any resulting cover change as part of the runtime upgrade. The build rejects a mismatch between the installed Playwright client and the configured image version.
