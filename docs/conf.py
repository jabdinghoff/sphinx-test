import json
from pathlib import Path

project = "sphinx-test"
author = "Jona Abdinghoff"
language = "en"

extensions = ["myst_parser"]

source_suffix = {".md": "markdown", ".rst": "restructuredtext"}
exclude_patterns = ["_build", "README.md"]

myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "dollarmath",
    "strikethrough",
    "tasklist",
]
# Pages edited in Pages CMS keep their title in front matter, not as a "# Heading" in the body.
myst_title_to_header = True
myst_heading_anchors = 3

html_theme = "furo"
html_title = project
html_static_path = ["_static"]


def generate_folder_sections(app):
    """Give every folder under pages/ a section page listing its contents, so folders created
    in Pages CMS show up as nested sections in the navigation without hand-written toctrees."""
    pages = Path(app.srcdir) / "pages"
    sections = Path(app.srcdir) / "_sections"
    wanted = {}

    def visit(folder):
        rel = folder.relative_to(pages)
        entries = [f"/pages/{(rel / page.stem).as_posix()}" for page in sorted(folder.glob("*.md"))]
        for sub in sorted(path for path in folder.iterdir() if path.is_dir()):
            if visit(sub):
                entries.append(f"/_sections/{(rel / sub.name).as_posix()}")
        if entries and folder != pages:
            toctree = "\n".join(entries)
            wanted[sections / f"{rel.as_posix()}.md"] = (
                f"---\ntitle: {json.dumps(folder.name, ensure_ascii=False)}\n---\n\n"
                f"```{{toctree}}\n:titlesonly:\n\n{toctree}\n```\n"
            )
        return bool(entries)

    visit(pages)
    app.top_level_sections = [
        f"/_sections/{path.relative_to(sections).with_suffix('').as_posix()}"
        for path in sorted(wanted)
        if path.parent == sections
    ]

    # Only touch files whose content changed, so sphinx-autobuild doesn't rebuild forever.
    app.sections_changed = False
    for path, content in wanted.items():
        if not path.exists() or path.read_text(encoding="utf-8") != content:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            app.sections_changed = True
    if sections.exists():
        for path in sections.rglob("*.md"):
            if path not in wanted:
                path.unlink()
                app.sections_changed = True
        for path in sorted(sections.rglob("*"), reverse=True):
            if path.is_dir() and not any(path.iterdir()):
                path.rmdir()


def append_sections_to_index(app, docname, source):
    if docname == "index" and app.top_level_sections:
        entries = "\n".join(app.top_level_sections)
        source[0] += f"\n\n```{{toctree}}\n:titlesonly:\n\n{entries}\n```\n"


def setup(app):
    app.connect("builder-inited", generate_folder_sections)
    app.connect("source-read", append_sections_to_index)
    # Every page's sidebar shows the sections, so all of them must be rebuilt when a folder changes.
    app.connect("env-get-outdated", lambda app, env, added, changed, removed: list(env.found_docs) if app.sections_changed else [])
