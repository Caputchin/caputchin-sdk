import { MarkdownPageEvent } from "typedoc-plugin-markdown";

/**
 * Local TypeDoc plugin: make the emitted markdown Fumadocs-ready.
 *
 * - Inject a `title` frontmatter from the reflection name. Fumadocs renders
 *   the frontmatter `title` as the page H1 and the sidebar label; without it
 *   the label falls back to the raw file slug (e.g. "Interface.ErrorEventDetail").
 * - Strip the body's own leading H1 so it does not duplicate the title Fumadocs
 *   already renders from frontmatter.
 *
 * Loaded LAST in typedoc.json so its END listener runs after the frontmatter
 * plugin has serialized the `---` block (the strip then targets the body H1).
 */
export function load(app) {
  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    const title = page.model?.name ?? "Reference";
    page.frontmatter = { title, ...(page.frontmatter ?? {}) };
  });
  app.renderer.on(MarkdownPageEvent.END, (page) => {
    if (typeof page.contents === "string") {
      page.contents = page.contents.replace(/^# .*\n+/m, "");
    }
  });
}
