# autoscaler.sh

Swapnil Patel’s blog, built with Hugo and the custom [Quiet theme](themes/quiet/README.md).
Native fonts, one stylesheet, and no client-side JavaScript or npm dependencies.

## Develop

Install Hugo **0.166.0** (standard edition), then run from the repository root:

```sh
hugo server --disableLiveReload
```

Open http://localhost:1313/. Add `--buildDrafts` to preview unfinished posts.

## Write

- Site settings: `hugo.toml`
- Articles: `content/writing/`
- About and Projects: `content/about.md` and `content/projects.md`
- Templates and CSS: `themes/quiet/`

Create an article as `content/writing/your-title.md`:

```yaml
---
title: A useful title
date: 2026-09-19
description: A short description.
draft: true
---

Article text.
```

Remove `draft: true` when ready to publish. Future-dated posts stay unpublished until
a build runs after their date. Optional `toc: true` adds a contents list;
`lastmod` displays an updated date. `placeholder: true` labels unfinished
articles in the site and RSS feed.

## Check and publish

```sh
hugo --gc --minify --panicOnWarning
python3 tests/check_output.py public
```

The checker requires Python 3.11 or newer. [Browser checks](tests/README.md) cover
navigation, scrolling, mobile widths, and enlarged text.

Pushes to `main` build, check, and deploy to https://autoscaler.sh/ through GitHub
Pages. Pull requests build and check without deploying. The workflow pins Hugo and
verifies its download checksum; update both together when upgrading.

GitHub Pages uses the **GitHub Actions** source and the custom domain
`autoscaler.sh`. Keep `hugo.toml`, `static/CNAME`, and the Pages domain setting in
sync. Generated files in `public/` are ignored; only the validated build artifact
is deployed.
