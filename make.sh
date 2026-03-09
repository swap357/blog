#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

today=$(date +%Y-%m-%d)

# collect posts from writing/*/index.json, add slug + url, sort by date desc
posts=$(find writing -mindepth 2 -maxdepth 2 -name index.json -not -path writing/index.json \
  | while read -r f; do
      slug=$(basename "$(dirname "$f")")
      jq --arg slug "$slug" --arg url "/writing/$slug/" \
        '{slug: $slug, title: .title, date: .date, summary: .summary, url: $url}' "$f"
    done \
  | jq -s 'sort_by(.date) | reverse')

post_count=$(echo "$posts" | jq length)

# --- writing/index.json ---
jq -n --arg today "$today" --argjson posts "$posts" '{
  title: "posts",
  updated: $today,
  posts: $posts
}' > writing/index.json

# --- writing/index.html ---
post_html=$(echo "$posts" | jq -r '.[] |
  "        <article class=\"post\" role=\"listitem\">\n          <h2><a href=\"\(.url)\">\(.title)</a></h2>\n          <p class=\"meta\">\(.date)</p>\n          <p class=\"summary\">\(.summary)</p>\n        </article>"')

cat > writing/index.html <<HTMLEOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="description" content="Posts by Swapnil Patel." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>posts | autoscaler.sh</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>></text></svg>" />
    <link rel="stylesheet" href="/shared/reset.css?v=3" />
    <link rel="alternate" type="application/json" href="/writing/index.json" />
    <style>
      .writing-shell {
        max-width: var(--max-w);
        margin: 0 auto;
        padding: clamp(1.2rem, 3vw, 2rem);
      }

      h1 {
        font-family: var(--mono);
        font-weight: 400;
        font-size: 1.3rem;
        color: var(--text);
        margin: 2rem 0 2.5rem;
        letter-spacing: -0.01em;
      }

      .post-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .post {
        padding: 1.6rem 0;
      }

      .post + .post {
        border-top: 1px solid var(--line);
      }

      .post h2 {
        font-family: var(--mono);
        font-weight: 400;
        font-size: 1.05rem;
        margin: 0 0 0.35rem;
        line-height: 1.4;
      }

      .post h2 a {
        color: var(--text);
        text-decoration: none;
      }

      .post h2 a:hover {
        color: var(--accent);
      }

      .post .meta {
        font-family: var(--mono);
        font-size: 0.72rem;
        color: var(--muted);
        letter-spacing: 0.02em;
        margin: 0 0 0.5rem;
      }

      .post .summary {
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.6;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main class="writing-shell">
      <nav data-nav-root aria-label="site navigation"></nav>
      <h1>posts</h1>
      <section class="post-list" role="list">
${post_html}
      </section>
    </main>

    <script src="/shared/nav.js"></script>
    <script>
      window.mountPortalNav("[data-nav-root]", "/writing/");
    </script>

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "autoscaler.sh posts",
        "url": "https://autoscaler.sh/writing/"
      }
    </script>
  </body>
</html>
HTMLEOF

# --- llms.txt ---
post_lines=$(echo "$posts" | jq -r '.[] | "- /writing/\(.slug)/ (\(.title))"')

cat > llms.txt <<LLMEOF
# llms.txt
# Machine-oriented summary for LLM and automated agents.

Site: autoscaler.sh
URL: https://autoscaler.sh/
Owner: Swapnil Patel
Description: Swapnil Patel's site.
Primary sections: /about/, /projects/, /writing/ (posts index)

Key endpoints:
- Site index: /index.json
- About JSON: /about/index.json
- Projects catalog JSON: /projects/index.json
- Agent manifest: /.well-known/agent-manifest.json
- Site graph: /site-map.json

Navigation:
- / (landing)
- /about/
- /projects/
- /writing/

Posts:
${post_lines}
LLMEOF

# --- site-map.json ---
post_nodes=$(echo "$posts" | jq '[.[] | {id: .slug, label: .title, href: .url, type: "BlogPosting"}]')
post_edges=$(echo "$posts" | jq '[.[] | {from: "writing", to: .slug, relation: "contains"}]')

jq -n --argjson pn "$post_nodes" --argjson pe "$post_edges" '{
  nodes: ([
    {id: "site", label: "autoscaler.sh", href: "/", type: "WebSite"},
    {id: "about", label: "about", href: "/about/", type: "Person"},
    {id: "projects", label: "projects", href: "/projects/", type: "CollectionPage"},
    {id: "writing", label: "posts", href: "/writing/", type: "Blog"}
  ] + $pn),
  edges: ([
    {from: "site", to: "about", relation: "describes"},
    {from: "site", to: "projects", relation: "contains"},
    {from: "site", to: "writing", relation: "contains"}
  ] + $pe)
}' > site-map.json

echo "generated: writing/index.json, writing/index.html, llms.txt, site-map.json"
echo "posts: $post_count"
