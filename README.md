# Strange Lasers

Source for [strangelasers.com](https://strangelasers.com/).

Local preview and visual diagnostics are documented in [CONTRIBUTING.md](CONTRIBUTING.md). Production and shareable preview hosting are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

Brand development sources and motion experiments are preserved on the frozen `archive/brand-development` branch.

## About page prototype

This is a design draft held for content review, not an approved production release. It is intentionally available on the `preview` branch and preview site while its content remains unfinished. Only the polished final page and approved homepage integration belong on `main`, not the preview files or controls.

The independent `/about/` page introduces the team through portraits, short biographies, and scroll-driven glimpses of their interests. It has no incoming link from the homepage and carries a `noindex` directive while its content is fictional.

Review the deployed draft at `https://preview.strangelasers.com/about/`, or serve the repository with any static HTTP server. For example, run `python3 -m http.server 4175 --bind 127.0.0.1` from the repository root, then open `http://127.0.0.1:4175/about/`. There is no build step or package installation.

Names, roles, biographies, and interests are placeholders in `about/index.html`. Replace the corresponding images in `about/portraits/`, update their alternative text and the third-party notices, and review the copy before publishing the page as a real company introduction. Portrait sources are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The page uses native scrolling and anchor navigation. JavaScript adds parallax, fading background interests, and the active-person indicator; it schedules frames only in response to page events. With reduced motion enabled, portraits and optical linework stay still, background interest effects are hidden, and interests remain readable in each biography. Append `?animate` to explicitly preview motion regardless of the system preference, using the same override as the homepage. All content and links also work without JavaScript. The page's styles and scroll behavior live in `about/`. It reuses the site's palette, brand assets, and initialization script.

### Homepage navigation study

Open `https://preview.strangelasers.com/about/navigation-preview.html?animate` or `/about/navigation-preview.html?animate` on the same local static server to review the homepage links without modifying `index.html`. The text-only About link appears automatically with GitHub and Stowplan in their existing entrance animation. A separate, steady link over the eye reveals an About label on hover or keyboard focus. Both links open the About draft. Append `&show-label` to hold the eye label open for comparison, or use the preview-only control. The study uses relative paths to the repository's assets and is marked `noindex`.

### Before release

- Replace the fictional names, roles, biographies, interests, and portraits with approved content; update alternative text and portrait licensing notices
- Confirm the remaining company copy and public link destinations; keep the footer wording "Open-source software, made with care."
- Apply the chosen navigation to the real homepage without carrying `navigation-preview.html` or its comparison controls into the final integration
- Recheck desktop and mobile layouts, keyboard navigation, motion preferences, and both navigation paths
- Obtain approval for the final content and integration before merging into `main`
