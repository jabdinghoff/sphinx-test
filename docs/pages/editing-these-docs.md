---
title: Editing these docs
---
You don't need to install anything. The docs are edited in the browser with
[Pages CMS](https://app.pagescms.org), and the website updates by itself a
minute or two after you save.

## Getting access

Ask the docs maintainer to invite you. You'll get an email from Pages CMS;
click the link in it to sign in. No GitHub account is needed.

## Editing a page

1. Open [app.pagescms.org](https://app.pagescms.org) and choose this project.
2. Click **Pages** in the sidebar and pick the page you want to change.
3. Edit the text like in a word processor. Type `/` on an empty line for headings, lists, tables and images.
4. Save. That's it — the website rebuilds automatically.

To add a page, use the add button in the **Pages** list and give it a title.
New pages show up in the website's menu automatically, sorted by file name.

## Images

Use `/` → **Image** in the editor, or upload files under **Images** in the
sidebar first and pick them from there.

## Things to avoid

- Don't write a big "Heading 1" at the top of a page; the **Title** field already becomes the page heading. Start with "Heading 2" and smaller.
- Some pages contain lines like `:::{note}` or `:::`. Those are special Sphinx instructions — leave them untouched and only edit the text between them.
- The editor removes HTML comments (`<!-- ... -->`) when it saves.

:::{tip}
Want a coloured box like this one? Write `:::{tip}` on its own line, your text
below it, and `:::` on the line after. `note`, `warning` and `important` work
too.
:::



&nbsp;

## Testing this okay new title

