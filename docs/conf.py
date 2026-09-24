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
