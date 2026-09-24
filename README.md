# sphinx-test

Sphinx documentation written in [MyST Markdown](https://myst-parser.readthedocs.io),
published to GitHub Pages on every push to `main`.

There are two ways to edit it, and both end up as commits on `main`:

- **In the browser:** [Pages CMS](https://app.pagescms.org) with a WYSIWYG editor,
  configured in `.pages.yml`. People without a GitHub account can be invited by
  email. See `docs/pages/editing-these-docs.md` for the guide aimed at them.
- **Locally:** edit the Markdown under `docs/` in any editor.

## Local workflow

```sh
uv run --group docs sphinx-autobuild docs docs/_build/html   # live preview on http://127.0.0.1:8000
uv run --group docs sphinx-build -W -b html docs docs/_build/html
```

### Editor format

The Pages CMS editor rewrites a whole page whenever it saves one. `tools/editor-format`
runs the same conversion as the hosted editor, with the same library versions, so pages
you write locally are already in the form the editor saves. A browser edit then only
changes what was actually edited.

```sh
pnpm --dir tools/editor-format install
pnpm --dir tools/editor-format format   # rewrite pages; review the diff
pnpm --dir tools/editor-format check    # what CI runs
```

A page the editor would mangle a little more on every save is reported and left
unchanged; rewrite the lines it points at. To run the formatter via `jj fix`
(repo config, not versioned):

```sh
jj config set --repo fix.tools.editor-format.command '["node", "tools/editor-format/format.mjs", "--stdin"]'
jj config set --repo fix.tools.editor-format.patterns '["glob:docs/index.md", "glob:docs/pages/**/*.md"]'
```

When Pages CMS updates its editor, bump the versions in `tools/editor-format/package.json`
and `pnpm-workspace.yaml` to match its `package-lock.json`.

### CI

`build` + `deploy` publish the site even if Sphinx warns, so a typo in the browser
can't stop the site from updating. `sphinx-warnings` (warnings as errors) and
`editor-format` only report; a red check there is for the maintainer to fix.

## Layout

| Path | What |
|------|------|
| `docs/index.md` | Home page; its toctree picks up every file in `docs/pages/` |
| `docs/pages/` | One Markdown file per page, alphabetical in the nav; each folder becomes a nav section |
| `docs/_sections/` | Generated at build time by `conf.py` (one section page per folder); git-ignored |
| `docs/images/` | Uploaded images, referenced as `/images/<file>` |
| `docs/conf.py` | Sphinx config |
| `.pages.yml` | Pages CMS config |
| `tools/editor-format/` | Formatter that mirrors the Pages CMS editor |

## Conventions (keep the browser editor happy)

- Every page has a `title:` in front matter and **no** `# H1` in the body;
  `myst_title_to_header` turns the title into the H1.
- Use `:::{directive}` (colon fences) for admonitions and similar blocks. They
  survive the editor's round trip and can be typed by non-technical users.
- Don't use HTML comments (`<!-- -->`): the editor strips them on save.
- Keep each list item on one line. The editor drops the indentation of wrapped
  continuation lines, and repeated saves then break the list. Wrapping plain
  paragraphs is fine.
- No backticks inside inline code (e.g. a four-backtick span around a
  code-fence example): the editor splits it apart.
- Front matter keys the editor doesn't show survive saves because `.pages.yml` sets
  `settings.content.merge: true`.
- Pull before editing locally, since coworkers commit to `main` from the browser.

## One-time setup

1. Settings → Pages → Source: **GitHub Actions**.
2. Install the [Pages CMS GitHub App](https://app.pagescms.org) on this repository,
   open the repo in Pages CMS, and invite coworkers under **Collaborators**.
