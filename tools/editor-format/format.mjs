// Rewrites Markdown pages exactly the way the Pages CMS rich-text editor saves them,
// so an edit made in the browser only changes what the person actually edited.
//
//   node format.mjs              rewrite every page Pages CMS manages
//   node format.mjs --check      list pages that are not in editor form, exit 1 if any
//   node format.mjs --stdin      format stdin to stdout (for `jj fix`)
//   node format.mjs FILE...      only these files

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { Window } from "happy-dom";

const window = new Window();
for (const name of ["window", "document", "navigator", "Node", "HTMLElement", "Element", "DocumentFragment", "MutationObserver", "getComputedStyle"]) {
  Object.defineProperty(globalThis, name, { value: name === "window" ? window : window[name], configurable: true, writable: true });
}

const { Editor } = await import("@tiptap/core");
const { default: StarterKit } = await import("@tiptap/starter-kit");
const { Markdown } = await import("@tiptap/markdown");
const { default: Underline } = await import("@tiptap/extension-underline");
const { default: Link } = await import("@tiptap/extension-link");
const { default: Image } = await import("@tiptap/extension-image");
const { Table } = await import("@tiptap/extension-table");
const { default: TableRow } = await import("@tiptap/extension-table-row");
const { default: TableHeader } = await import("@tiptap/extension-table-header");
const { default: TableCell } = await import("@tiptap/extension-table-cell");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Mirrors components/ui/editor/index.tsx in pages-cms/pages-cms.
const editor = new Editor({
  extensions: [
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    Link.configure({ openOnClick: false, enableClickSelection: true, HTMLAttributes: { rel: null, target: null } }),
    Image,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Markdown,
  ],
  content: "",
  contentType: "markdown",
});

const MARKDOWN_TABLE_ROW_PATTERN = /^\s*\|.*\|\s*$/;
const MARKDOWN_TABLE_DELIMITER_CELL_PATTERN = /^:?-{3,}:?$/;
const TABLE_CELL_NBSP_PATTERN = /^(?:&nbsp;| )+$/i;

const splitMarkdownTableCells = (line) => {
  const trimmed = line.trim();
  if (trimmed.length < 2 || !trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  const row = trimmed.slice(1, -1);
  const cells = [];
  let start = 0;
  for (let index = 0; index < row.length; index += 1) {
    if (row[index] !== "|") continue;
    let slashCount = 0;
    for (let slashIndex = index - 1; slashIndex >= 0 && row[slashIndex] === "\\"; slashIndex -= 1) slashCount += 1;
    if (slashCount % 2 === 1) continue;
    cells.push(row.slice(start, index));
    start = index + 1;
  }
  cells.push(row.slice(start));
  return cells;
};

const isMarkdownTableDelimiterLine = (line) => {
  if (!MARKDOWN_TABLE_ROW_PATTERN.test(line)) return false;
  const cells = splitMarkdownTableCells(line);
  return cells.length > 0 && cells.every((cell) => MARKDOWN_TABLE_DELIMITER_CELL_PATTERN.test(cell.trim()));
};

const normalizeMarkdownTables = (markdown) =>
  markdown
    .split("\n")
    .map((line) => {
      if (!MARKDOWN_TABLE_ROW_PATTERN.test(line) || isMarkdownTableDelimiterLine(line)) return line;
      const cells = splitMarkdownTableCells(line);
      if (!cells.length) return line;
      return `| ${cells.map((cell) => (TABLE_CELL_NBSP_PATTERN.test(cell.trim()) ? "" : cell.trim())).join(" | ")} |`;
    })
    .join("\n");

// Mirrors lib/serialization.ts (yaml-frontmatter) in pages-cms/pages-cms.
const parseFrontmatter = (content) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/.exec(content);
  if (!match) return { body: content };
  const data = match[1].trim() ? YAML.parse(match[1], { strict: false, uniqueKeys: false }) : {};
  return { ...data, body: (match[2] || "").replace(/^\r?\n/, "") };
};

const stringifyFrontmatter = ({ body = "", ...data }) => {
  const yaml = Object.keys(data).length ? YAML.stringify(data).trim() : "";
  return `---\n${yaml ? `${yaml}\n` : ""}---\n${body}`;
};

const editorSave = (body) => {
  editor.commands.setContent(body, { contentType: "markdown" });
  return normalizeMarkdownTables(editor.getMarkdown());
};

const saveOnce = (content) => {
  const entry = parseFrontmatter(content);
  return stringifyFrontmatter({ ...entry, body: editorSave(entry.body) });
};

const format = (content) => {
  const once = saveOnce(content);
  return { formatted: once, stable: saveOnce(once) === once };
};

const managedFiles = () => {
  const config = YAML.parse(fs.readFileSync(path.join(repoRoot, ".pages.yml"), "utf8"));
  const files = [];
  const walk = (dir, recursive) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && recursive) walk(full, recursive);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
    }
  };
  for (const item of config.content ?? []) {
    if (item.format !== "yaml-frontmatter") continue;
    const target = path.join(repoRoot, item.path);
    if (item.type === "collection") walk(target, Boolean(item.subfolders));
    else if (item.type === "file") files.push(target);
  }
  return files.sort();
};

const firstDifference = (before, after, beforeLabel, afterLabel) => {
  const a = before.split("\n");
  const b = after.split("\n");
  let line = 0;
  while (line < a.length && line < b.length && a[line] === b[line]) line += 1;
  const show = (lines) => lines.slice(Math.max(0, line - 1), line + 3).map((text) => `    ${JSON.stringify(text)}`).join("\n");
  return `  first difference at line ${line + 1}\n  ${beforeLabel}:\n${show(a)}\n  ${afterLabel}:\n${show(b)}`;
};

const unstableReport = (formatted) => firstDifference(formatted, saveOnce(formatted), "after one editor save", "after two editor saves");

const UNSTABLE = "the editor mangles this page a little more on every save; rewrite the lines shown (one line per list item, no backticks inside `code`)";

const args = process.argv.slice(2);
const check = args.includes("--check");

if (args.includes("--stdin")) {
  const original = fs.readFileSync(0, "utf8");
  const { formatted, stable } = format(original);
  process.stdout.write(stable ? formatted : original);
  if (!stable) process.stderr.write(`left unchanged: ${UNSTABLE}\n${unstableReport(formatted)}\n`);
  process.exit(0);
}

const files = args.filter((arg) => !arg.startsWith("--")).map((file) => path.resolve(file));
let unstable = 0;
let unformatted = 0;

for (const file of files.length ? files : managedFiles()) {
  const name = path.relative(repoRoot, file);
  const original = fs.readFileSync(file, "utf8");
  const { formatted, stable } = format(original);

  if (!stable) {
    unstable += 1;
    console.log(`${name}: left unchanged, ${UNSTABLE}\n${unstableReport(formatted)}`);
    continue;
  }
  if (formatted === original) continue;
  if (check) {
    unformatted += 1;
    console.log(`${name}: not in editor form\n${firstDifference(original, formatted, "yours", "after an editor save")}`);
  } else {
    fs.writeFileSync(file, formatted);
    console.log(`${name}: rewritten, review the diff`);
  }
}

editor.destroy();
if (unformatted) console.log(`\nRun \`pnpm --dir tools/editor-format format\` and review the diff.`);
process.exit(unstable || unformatted ? 1 : 0);
