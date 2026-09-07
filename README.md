# Strange Lasers

Source for [strangelasers.com](https://strangelasers.com/).

Append `?fps` to display the animation frame rate counter.

The homepage keeps the SVG renderer through its opening still and bloom, then hands the continuous animation to WebGL2. It falls back to SVG when WebGL2 is unavailable or loses its context. Append `?renderer=svg` or `?renderer=webgl` to force either renderer for comparison.

Brand development sources and motion experiments are preserved on the frozen `archive/brand-development` branch.

## About page prototype

The independent `/about/` page introduces the team through portraits, short biographies, and scroll-driven glimpses of their interests. It has no incoming link from the homepage and carries a `noindex` directive while its content is fictional.

Serve the repository with any static HTTP server. For example, run `python3 -m http.server 4175 --bind 127.0.0.1` from the repository root, then open `http://127.0.0.1:4175/about/`. There is no build step or package installation.

Names, roles, biographies, and interests are placeholders in `about/index.html`. Replace the corresponding images in `about/portraits/`, update their alternative text and the third-party notices, and review the copy before publishing the page as a real company introduction. Portrait sources are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The page uses native scrolling and anchor navigation. JavaScript adds parallax, fading background interests, and the active-person indicator; it schedules frames only in response to page events. With reduced motion enabled, portraits and optical linework stay still, background interest effects are hidden, and interests remain readable in each biography. Append `?animate` to explicitly preview motion regardless of the system preference, using the same override as the homepage. All content and links also work without JavaScript. The page's styles and scroll behavior live in `about/`. It reuses the site's palette, brand assets, and initialization script.
