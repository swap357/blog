# Site checks

Run against a production build, without Hugo's live-reload script:

```sh
hugo --gc --minify --panicOnWarning
python3 tests/check_output.py public
```

The Python checker uses only the standard library. It checks generated HTML identities,
shared navigation, local links and fragments, canonical URLs, language and viewport
metadata, stylesheet presence, RSS, and archive coverage. It also
rejects scripts, external CSS resources, and downloaded fonts. Published articles must appear in both the archive and RSS. Sitemap URLs must
match published pages, robots.txt must advertise the sitemap, and CNAME must match
the configured hostname. Checks adapt as articles are added.

For browser checks, serve `public/` with `python3 -m http.server 1313 --bind 127.0.0.1 --directory public` and run
`check_browser.js` through Playwright's `browser_run_code_unsafe` tool using its
absolute `filename`. The script creates and closes its own browser context; it does
not navigate the supplied page or require a repository npm install.

The browser suite crawls internal pages and includes `404.html`. At 1440px, 390px,
320px, and 390px with text enlarged to 200%, it verifies:

- Navigation and reading with JavaScript disabled.
- Consistent computed colors and body font, with no page horizontal overflow.
- Mouse-wheel access to the footer and return to the top.
- Article contents links, heading positions, and browser back navigation, when present.
- Keyboard and horizontal-wheel scrolling inside long code blocks, when present.
- Shared header/footer destinations and any adjacent-article links.
- No browser errors, failed requests, or external resource requests.

The result includes each route's viewport width, text scale, document height, and
bottom scroll position. Contents and code-scroll counts are zero when those optional
features are absent; present features must pass their interaction checks. These checks
complement visual review; they do not judge
the quality of prose, visual hierarchy, or assistive-technology behavior.
