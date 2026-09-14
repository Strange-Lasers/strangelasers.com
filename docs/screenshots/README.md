# Project cover

The cover shows the built homepage at second zero with motion disabled through the reduced-motion preference. Its JavaScript clock stays paused at 0 ms, the mark keeps its opening pose, and the wordmark, primary tagline, and navigation are visible. The viewport and PNG are 1440 by 1000 pixels at 1x density.

Run `npm ci` and `npm run screenshots:install` before the first build. On Linux hosts that lack Chromium's system libraries, use `npm run screenshots:install -- --with-deps`. Every Eleventy filesystem build, including `npm run build`, `npm run check`, and development rebuilds, captures the finished homepage and refreshes `docs/screenshots/cover.png` automatically. The build fails if capture fails, preserving the previous cover; identical captures leave the file untouched.

Commit a changed cover with the source changes that produced it. The image stays outside `dist/`. Rendering can differ across operating systems and browser versions, so use the locked Playwright dependency and its installed Chromium. See [the screenshot workflow](../../CONTRIBUTING.md#before-and-after-screenshots) for matched before/after captures.
