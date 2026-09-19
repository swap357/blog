#!/usr/bin/env python3
"""Check the production Hugo build using only the standard library."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import tomllib
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = set()
        self.refs = []
        self.canonicals = []
        self.stylesheets = []
        self.scripts = []
        self.reactions = []
        self.navigation = []
        self.title = []
        self.heading = []
        self.in_navigation = False
        self.in_title = False
        self.in_heading = False
        self.language = ""
        self.viewport = ""
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        self.tags.append(tag)
        if "data-useful" in attrs:
            self.reactions.append(attrs)
        if tag == "script":
            self.scripts.append(attrs)
            if attrs.get("data-theme"):
                self.refs.append(attrs["data-theme"])
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if tag == "html":
            self.language = attrs.get("lang", "")
        if tag == "nav":
            self.in_navigation = attrs.get("aria-label") == "Main navigation"
        if tag == "a" and self.in_navigation:
            self.navigation.append(attrs.get("href", ""))
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.in_heading = True
        if tag == "meta" and attrs.get("name") == "viewport":
            self.viewport = attrs.get("content", "")
        if tag == "link":
            relations = attrs.get("rel", "").split()
            if "canonical" in relations:
                self.canonicals.append(attrs.get("href", ""))
            if "stylesheet" in relations:
                self.stylesheets.append(attrs.get("href", ""))

    def handle_endtag(self, tag):
        if tag == "nav":
            self.in_navigation = False
        if tag == "title":
            self.in_title = False
        if tag == "h1":
            self.in_heading = False

    def handle_data(self, text):
        if self.in_title:
            self.title.append(text)
        if self.in_heading:
            self.heading.append(text)


def page_url(base_url, relative):
    path = relative.as_posix()
    if path.endswith("index.html"):
        path = path[:-len("index.html")]
    return urljoin(base_url, path)


def local_target(output, base_url, current_url, reference):
    """Return a local file and fragment, or None for an external reference."""
    base = urlsplit(base_url)
    target = urlsplit(urljoin(current_url, reference))
    if target.scheme not in ("http", "https") or target.netloc != base.netloc:
        return None
    prefix = base.path.rstrip("/") + "/"
    path = unquote(target.path)
    if not path.startswith(prefix):
        raise ValueError(f"escapes base path {prefix}: {reference}")
    destination = (output / path[len(prefix):]).resolve()
    if output not in destination.parents and destination != output:
        raise ValueError(f"escapes output directory: {reference}")
    if destination.is_dir():
        destination /= "index.html"
    return destination, unquote(target.fragment)


def check_site(output, base_url):
    output = output.resolve()
    failures = []

    def check(condition, message):
        if not condition:
            failures.append(message)

    base = urlsplit(base_url)
    check(base.scheme in ("http", "https") and bool(base.netloc),
          f"base URL must be absolute HTTP(S): {base_url}")
    pages = {path: Page(path.read_text()) for path in output.rglob("*.html")}
    required_pages = {Path(path) for path in (
        "index.html", "404.html", "writing/index.html", "about/index.html",
        "projects/index.html")}
    actual_pages = {path.relative_to(output) for path in pages}
    check(required_pages <= actual_pages,
          f"missing pages: {sorted(required_pages - actual_pages)}")
    home = pages.get(output / "index.html")
    check(home is not None, "missing homepage")
    identities = {"title": {}, "heading": {}}
    for path, page in pages.items():
        name = path.relative_to(output)
        current_url = page_url(base_url, name)
        for tag in ("main", "h1"):
            check(page.tags.count(tag) == 1, f"{name}: expected exactly one <{tag}>")
        check(bool(page.language), f"{name}: missing HTML language")
        check("width=device-width" in page.viewport, f"{name}: missing responsive viewport")
        local_scripts = [script for script in page.scripts
                         if script.get("src", "").startswith("/js/useful.")]
        if page.reactions:
            check(name.parts[0] == "writing" and name != Path("writing/index.html"),
                  f"{name}: reactions belong only on articles")
            check(len(page.reactions) == 1 and len(local_scripts) == 1,
                  f"{name}: expected one Useful control and script")
            check(page.reactions[0].get("data-article") == urlsplit(current_url).path,
                  f"{name}: reaction identifier differs from article path")
            check(bool(page.reactions[0].get("data-endpoint")), f"{name}: missing reaction endpoint")
            check("hidden" in page.reactions[0], f"{name}: no-script reaction control is visible")
            for script in local_scripts:
                check("defer" in script and bool(script.get("integrity")),
                      f"{name}: reaction script must be deferred and fingerprinted")
        else:
            check(not local_scripts, f"{name}: reaction script without a control")
        other_scripts = [script for script in page.scripts if script not in local_scripts]
        if "discussion-title" in page.ids:
            check(name.parts[0] == "writing" and name != Path("writing/index.html"),
                  f"{name}: comments belong only on articles")
            check(len(other_scripts) == 1, f"{name}: expected one Giscus script")
            check("https://github.com/swap357/blog/discussions" in page.refs,
                  f"{name}: missing discussion fallback link")
            for script in other_scripts:
                expected = {
                    "src": "https://giscus.app/client.js",
                    "data-repo": "swap357/blog",
                    "data-repo-id": "R_kgDOLKkbLA",
                    "data-category": "Announcements",
                    "data-category-id": "DIC_kwDOLKkbLM4DF-W_",
                    "data-mapping": "pathname", "data-strict": "1",
                    "data-reactions-enabled": "0", "data-loading": "lazy",
                    "crossorigin": "anonymous",
                }
                check(all(script.get(key) == value for key, value in expected.items()),
                      f"{name}: unexpected Giscus configuration")
                check("async" in script, f"{name}: comments script blocks rendering")
                check(script.get("data-theme", "").startswith(urljoin(base_url, "css/giscus.")),
                      f"{name}: missing locally hosted comments theme")
        else:
            check(not other_scripts, f"{name}: unexpected script")
        check(page.canonicals == [current_url],
              f"{name}: expected canonical {current_url}, got {page.canonicals}")
        check(bool(page.stylesheets), f"{name}: missing stylesheet")
        check(bool(page.navigation), f"{name}: missing main navigation")
        if home:
            check(page.navigation == home.navigation, f"{name}: main navigation differs from home")
        for field, seen in identities.items():
            value = " ".join("".join(getattr(page, field)).split())
            check(bool(value), f"{name}: empty {field}")
            check(value not in seen, f"{name}: {field} duplicates {seen.get(value)}")
            seen[value] = name
        for stylesheet in page.stylesheets:
            check(not urlsplit(stylesheet).netloc, f"{name}: external stylesheet {stylesheet}")
        for reference in page.refs:
            try:
                target = local_target(output, base_url, current_url, reference)
            except ValueError as error:
                failures.append(f"{name}: {error}")
                continue
            if target is None:
                continue
            destination, fragment = target
            check(destination.is_file(), f"{name}: missing target {reference}")
            if fragment and destination in pages:
                check(fragment in pages[destination].ids,
                      f"{name}: missing fragment in {reference}")

    stylesheets = list(output.rglob("*.css"))
    check(bool(stylesheets), "no CSS generated")
    for stylesheet in stylesheets:
        css = stylesheet.read_text()
        check(not re.search(r"@import\b|url\(\s*['\"]?(?:https?:)?//", css, re.I),
              f"{stylesheet.name}: CSS requests an external resource or imports another stylesheet")
        check("@font-face" not in css.lower(), f"{stylesheet.name}: unexpected font download")

    rss_links = set()
    try:
        feed = ET.parse(output / "index.xml")
        check(feed.getroot().tag == "rss", "index.xml: expected RSS document")
        items = feed.findall("./channel/item")
        rss_links = {item.findtext("link") for item in items}
        check(len(items) == len(rss_links), "index.xml: duplicate articles")
    except (OSError, ET.ParseError) as error:
        failures.append(f"index.xml: {error}")

    archive_path = output / "writing/index.html"
    archive = pages.get(archive_path)
    check(archive is not None, "missing writing archive")
    archive_links = {urljoin(page_url(base_url, Path("writing/index.html")), ref)
                     for ref in archive.refs} if archive else set()
    articles = {path for path in actual_pages
                if path.parts[0] == "writing" and path != Path("writing/index.html")}
    expected_rss = {page_url(base_url, path) for path in articles}
    check(rss_links == expected_rss, f"RSS articles differ: expected {expected_rss}, got {rss_links}")
    for relative in articles:
        url = page_url(base_url, relative)
        check(url in archive_links, f"post missing from archive: {relative}")

    try:
        sitemap = ET.parse(output / "sitemap.xml")
        locations = {node.text for node in sitemap.findall("{*}url/{*}loc")}
        expected = {page_url(base_url, path) for path in actual_pages if path != Path("404.html")}
        check(locations == expected, "sitemap.xml: URLs differ from published pages")
        robots = (output / "robots.txt").read_text()
        check(f"Sitemap: {urljoin(base_url, 'sitemap.xml')}" in robots,
              "robots.txt: missing production sitemap")
        check((output / "CNAME").read_text().strip() == base.hostname,
              "CNAME differs from the configured hostname")
    except (OSError, ET.ParseError) as error:
        failures.append(f"deployment metadata: {error}")
    return failures, len(pages), len(stylesheets)


def main():
    root = Path(__file__).resolve().parents[1]
    config = tomllib.loads((root / "hugo.toml").read_text())
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="directory containing a production Hugo build")
    parser.add_argument("--base-url", default=config["baseURL"], help="override the configured baseURL")
    args = parser.parse_args()
    failures, pages, stylesheets = check_site(args.output, args.base_url)
    if failures:
        print("\n".join(f"FAIL: {failure}" for failure in failures), file=sys.stderr)
        return 1
    print(f"PASS: {pages} HTML pages, {stylesheets} stylesheet(s), links, metadata, archive, RSS, sitemap, domain")
    return 0


if __name__ == "__main__":
    sys.exit(main())
