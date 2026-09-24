const ADMONITION_STYLES = {
  note: ["#e8f0fe", "#448aff"],
  tip: ["#e6f6e6", "#00bfa5"],
  important: ["#e6f6e6", "#00bfa5"],
  seealso: ["#e8f0fe", "#448aff"],
  warning: ["#fff8e6", "#ff9100"],
  danger: ["#ffebec", "#ff5252"],
};

// MyST writes a plain box as :::{note} and a box with its own title as
// :::{admonition} Title followed by a :class: line naming the style.
CMS.registerEditorComponent({
  id: "admonition",
  label: "Callout box",
  icon: "lightbulb",
  fields: [
    {
      name: "type",
      label: "Type",
      widget: "select",
      options: ["note", "tip", "important", "warning", "danger", "seealso"],
      default: "note",
    },
    { name: "title", label: "Title (optional)", widget: "string", required: false },
    { name: "body", label: "Text", widget: "text" },
  ],
  pattern:
    /^:::\{(?<kind>note|tip|important|warning|danger|seealso|admonition)\}(?:[ \t]+(?<title>[^\n]+))?\n(?::class:[ \t]*(?<cls>[a-z]+)[ \t]*\n)?(?<body>[\s\S]*?)\n:::[ \t]*$/m,
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
    const [background, border] = ADMONITION_STYLES[type] ?? ADMONITION_STYLES.note;
    const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const heading = title || { seealso: "See also" }[type] || type[0].toUpperCase() + type.slice(1);
    return `<div style="background:${background};border-left:4px solid ${border};border-radius:4px;padding:10px 14px;margin:8px 0">
      <strong>${escape(heading)}</strong>
      <div style="white-space:pre-wrap;margin-top:4px">${escape(body)}</div>
    </div>`;
  },
});
