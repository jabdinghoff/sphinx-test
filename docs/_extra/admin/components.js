// Sveltia CMS editor components for the MyST syntax used in these docs, so the rich text editor
// shows each construct as a block and writes it back unchanged.

// Sveltia's preview substitutes components across the whole Markdown, code blocks included, so
// every pattern first checks that the ``` fences before it come in open/close pairs.
const LINE_START = String.raw`(?<![^\n])`;
const FENCE = `${LINE_START}\`{3,}`;
const NOT_FENCE = `(?:(?!${FENCE})[^])`;
const OUTSIDE_CODE = `(?<=(?<![^])(?:${NOT_FENCE}*${FENCE}[^\\n]*\\n${NOT_FENCE}*${FENCE}[ \\t]*(?:\\n|(?![^])))*${NOT_FENCE}*)`;
// Block patterns keep the `m` flag, which is also what makes Sveltia treat them as blocks.
const block = (pattern) => new RegExp(OUTSIDE_CODE + pattern.source, "m");
const inline = (pattern) => new RegExp(OUTSIDE_CODE + pattern.source);

const escape = (text = "") =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const box = (title, body, border = "#448aff", background = "#e8f0fe") =>
  `<div style="background:${background};border-left:4px solid ${border};border-radius:4px;padding:10px 14px;margin:8px 0">
    <strong>${escape(title)}</strong>
    <div style="white-space:pre-wrap;margin-top:4px">${escape(body)}</div>
  </div>`;

const chip = (text, color = "#5c6bc0") =>
  `<span style="display:inline-block;border:1px solid ${color};color:${color};border-radius:4px;padding:0 5px;font-size:0.85em;font-family:monospace">${escape(text)}</span>`;

const ADMONITION_STYLES = {
  note: ["#448aff", "#e8f0fe"],
  tip: ["#00bfa5", "#e6f6e6"],
  important: ["#00bfa5", "#e6f6e6"],
  seealso: ["#448aff", "#e8f0fe"],
  warning: ["#ff9100", "#fff8e6"],
  danger: ["#ff5252", "#ffebec"],
};

// A plain box is :::{note}; a box with its own title is :::{admonition} Title plus a :class: line.
CMS.registerEditorComponent({
  id: "admonition",
  label: "Callout box",
  icon: "lightbulb",
  fields: [
    { name: "type", label: "Type", widget: "select", options: Object.keys(ADMONITION_STYLES), default: "note" },
    { name: "title", label: "Title (optional)", widget: "string", required: false },
    { name: "body", label: "Text", widget: "text" },
  ],
  pattern: block(
    /^:::\{(?<kind>note|tip|important|warning|danger|seealso|admonition)\}(?:[ \t]+(?<title>[^\n]+))?\n(?::class:[ \t]*(?<cls>[a-z]+)[ \t]*\n)?(?<body>[\s\S]*?)\n:::[ \t]*$/,
  ),
  fromBlock: ({ groups: { kind, title, cls, body } = {} }) => ({
    type: kind === "admonition" ? (cls ?? "note") : kind,
    title: kind === "admonition" ? (title ?? "").trim() : "",
    body: (body ?? "").trim(),
  }),
  toBlock: ({ type = "note", title = "", body = "" }) =>
    title
      ? `:::{admonition} ${title}\n:class: ${type}\n\n${body.trim()}\n:::`
      : `:::{${type}}\n${body.trim()}\n:::`,
  toPreview: ({ type = "note", title = "", body = "" }) => {
    const [border, background] = ADMONITION_STYLES[type] ?? ADMONITION_STYLES.note;
    const heading = title || { seealso: "See also" }[type] || type[0].toUpperCase() + type.slice(1);
    return box(heading, body, border, background);
  },
});

CMS.registerEditorComponent({
  id: "version",
  label: "Version note",
  icon: "new_releases",
  fields: [
    { name: "kind", label: "Kind", widget: "select", options: ["versionadded", "versionchanged", "deprecated"], default: "versionadded" },
    { name: "version", label: "Version", widget: "string" },
    { name: "body", label: "Text", widget: "text", required: false },
  ],
  pattern: block(/^:::\{(?<kind>versionadded|versionchanged|deprecated)\}[ \t]+(?<version>[^\n]+)\n(?<body>[\s\S]*?)\n:::[ \t]*$/),
  fromBlock: ({ groups: { kind, version, body } = {} }) => ({ kind, version: version.trim(), body: (body ?? "").trim() }),
  toBlock: ({ kind = "versionadded", version = "", body = "" }) => `:::{${kind}} ${version}\n${body.trim()}\n:::`,
  toPreview: ({ kind = "versionadded", version = "", body = "" }) =>
    box(`${{ versionadded: "New in", versionchanged: "Changed in", deprecated: "Deprecated since" }[kind]} version ${version}`, body, "#7e57c2", "#f3e5f5"),
});

CMS.registerEditorComponent({
  id: "dropdown",
  label: "Collapsible section",
  icon: "expand_circle_down",
  fields: [
    { name: "title", label: "Title", widget: "string" },
    { name: "body", label: "Text", widget: "text" },
  ],
  pattern: block(/^:::\{dropdown\}[ \t]+(?<title>[^\n]+)\n(?<body>[\s\S]*?)\n:::[ \t]*$/),
  fromBlock: ({ groups: { title, body } = {} }) => ({ title: title.trim(), body: (body ?? "").trim() }),
  toBlock: ({ title = "", body = "" }) => `:::{dropdown} ${title}\n${body.trim()}\n:::`,
  toPreview: ({ title = "", body = "" }) =>
    `<details open style="border:1px solid #ccc;border-radius:4px;padding:8px 12px;margin:8px 0"><summary><strong>${escape(title)}</strong></summary><div style="white-space:pre-wrap;margin-top:6px">${escape(body)}</div></details>`,
});

CMS.registerEditorComponent({
  id: "tabs",
  label: "Tabs",
  icon: "tab",
  fields: [
    {
      name: "tabs",
      label: "Tabs",
      widget: "list",
      fields: [
        { name: "label", label: "Label", widget: "string" },
        { name: "body", label: "Text", widget: "text" },
      ],
    },
  ],
  pattern: block(/^::::\{tab-set\}\n(?<items>[\s\S]*?)\n::::[ \t]*$/),
  fromBlock: ({ groups: { items = "" } = {} }) => ({
    tabs: [...items.matchAll(/^:::\{tab-item\}[ \t]+([^\n]+)\n([\s\S]*?)\n:::[ \t]*$/gm)].map(([, label, body]) => ({
      label: label.trim(),
      body: body.trim(),
    })),
  }),
  toBlock: ({ tabs = [] }) =>
    `::::{tab-set}\n\n${tabs.map(({ label = "", body = "" }) => `:::{tab-item} ${label}\n${body.trim()}\n:::`).join("\n\n")}\n\n::::`,
  toPreview: ({ tabs = [] }) =>
    `<div style="border:1px solid #ccc;border-radius:4px;margin:8px 0">${tabs
      .map(({ label, body }) => `<div style="padding:6px 12px;border-bottom:1px solid #eee"><strong>${escape(label)}</strong><div style="white-space:pre-wrap">${escape(body)}</div></div>`)
      .join("")}</div>`,
});

CMS.registerEditorComponent({
  id: "figure",
  label: "Figure",
  icon: "image",
  fields: [
    { name: "src", label: "Image", widget: "image" },
    { name: "name", label: "Name (for links)", widget: "string", required: false },
    { name: "width", label: "Width", widget: "string", required: false },
    { name: "caption", label: "Caption", widget: "text", required: false },
  ],
  pattern: block(/^:::\{figure\}[ \t]+(?<src>[^\n]+)\n(?<options>(?::[\w-]+:[^\n]*\n)*)\n?(?<caption>[\s\S]*?)\n:::[ \t]*$/),
  fromBlock: ({ groups: { src, options = "", caption = "" } = {} }) => ({
    src: src.trim(),
    name: /^:name:[ \t]*(.*)$/m.exec(options)?.[1]?.trim() ?? "",
    width: /^:width:[ \t]*(.*)$/m.exec(options)?.[1]?.trim() ?? "",
    caption: caption.trim(),
  }),
  toBlock: ({ src = "", name = "", width = "", caption = "" }) =>
    `:::{figure} ${src}\n${name ? `:name: ${name}\n` : ""}${width ? `:width: ${width}\n` : ""}\n${caption.trim()}\n:::`,
  toPreview: ({ src = "", name = "", caption = "" }) =>
    `<figure style="margin:8px 0"><img src="${escape(src)}" style="max-width:360px;display:block" alt=""><figcaption style="font-style:italic">${escape(caption)}${name ? ` ${chip(name)}` : ""}</figcaption></figure>`,
});

CMS.registerEditorComponent({
  id: "glossary",
  label: "Glossary",
  icon: "menu_book",
  fields: [{ name: "entries", label: "Entries (term, then its definition indented by two spaces)", widget: "text" }],
  pattern: block(/^:::\{glossary\}\n(?<entries>[\s\S]*?)\n:::[ \t]*$/),
  fromBlock: ({ groups: { entries = "" } = {} }) => ({ entries }),
  toBlock: ({ entries = "" }) => `:::{glossary}\n${entries}\n:::`,
  toPreview: ({ entries = "" }) =>
    `<dl style="margin:8px 0">${entries
      .split("\n")
      .map((line) => (/^\s/.test(line) ? `<dd style="margin-left:20px">${escape(line.trim())}</dd>` : `<dt><strong>${escape(line)}</strong></dt>`))
      .join("")}</dl>`,
});

// Any directive in a backtick fence, e.g. {code-block} with options or the home page's {toctree}.
// Sveltia's own code block would otherwise turn the unknown language into "plain".
CMS.registerEditorComponent({
  id: "directive",
  label: "Directive block",
  icon: "data_object",
  fields: [
    { name: "directive", label: "Directive (e.g. {code-block} json)", widget: "string" },
    { name: "content", label: "Content (options first, then an empty line)", widget: "text" },
  ],
  pattern: block(/^```(?<directive>\{[\w-]+\}[^\n]*)\n(?<content>[\s\S]*?)\n```[ \t]*$/),
  fromBlock: ({ groups: { directive, content = "" } = {} }) => ({ directive, content }),
  toBlock: ({ directive = "", content = "" }) => `\`\`\`${directive}\n${content}\n\`\`\``,
  toPreview: ({ directive = "", content = "" }) =>
    `<div style="margin:8px 0">${chip(directive)}<pre style="background:#f5f5f5;padding:8px 12px;border-radius:4px;margin:4px 0;white-space:pre-wrap">${escape(content)}</pre></div>`,
});

CMS.registerEditorComponent({
  id: "label",
  label: "Link target",
  icon: "bookmark",
  fields: [{ name: "name", label: "Name", widget: "string" }],
  pattern: block(/^\((?<name>[\w-]+)\)=[ \t]*$/),
  fromBlock: ({ groups: { name } = {} }) => ({ name }),
  toBlock: ({ name = "" }) => `(${name})=`,
  toPreview: ({ name = "" }) => `<div>${chip(`🔖 ${name}`, "#8d6e63")}</div>`,
});

CMS.registerEditorComponent({
  id: "role",
  label: "Link or UI label",
  icon: "sell",
  fields: [
    { name: "role", label: "Kind", widget: "select", options: ["ref", "doc", "term", "guilabel", "kbd"], default: "ref" },
    { name: "text", label: "Text (for links: Link text <target>)", widget: "string" },
  ],
  pattern: inline(/\{(?<role>ref|doc|term|guilabel|kbd)\}`(?<text>[^`\n]+)`/),
  fromBlock: ({ groups: { role, text } = {} }) => ({ role, text }),
  toBlock: ({ role = "ref", text = "" }) => `{${role}}\`${text}\``,
  toPreview: ({ role = "ref", text = "" }) => {
    if (role === "kbd") return `<kbd style="border:1px solid #bbb;border-bottom-width:2px;border-radius:3px;padding:0 4px;font-size:0.85em">${escape(text)}</kbd>`;
    if (role === "guilabel") return `<span style="border:1px solid #bbb;border-radius:3px;padding:0 4px;background:#f5f5f5">${escape(text)}</span>`;
    const label = /^(.*?)\s*<[^>]+>$/.exec(text)?.[1] || text;
    return `<span style="color:#1976d2;text-decoration:underline">${escape(label)}</span>`;
  },
});

CMS.registerEditorComponent({
  id: "substitution",
  label: "Product name",
  icon: "badge",
  fields: [{ name: "name", label: "Variable", widget: "string", default: "product" }],
  pattern: inline(/\{\{ ?(?<name>[\w-]+) ?\}\}/),
  fromBlock: ({ groups: { name } = {} }) => ({ name }),
  toBlock: ({ name = "product" }) => `{{ ${name} }}`,
  toPreview: ({ name = "product" }) => chip(`{{ ${name} }}`, "#2e7d32"),
});
