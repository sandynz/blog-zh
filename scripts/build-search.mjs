import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as pagefind from "pagefind";

// Index article pages only; an empty blog must not index navigation or 404 text.
const articles = [];
for (const path of await readdir("dist", { recursive: true })) {
  if (!path.endsWith(".html")) continue;
  const content = await readFile(join("dist", path), "utf8");
  if (!/<main\b[^>]*\bdata-pagefind-body(?:[\s=>])/.test(content)) continue;
  // Pagefind adds the base inferred from its bundle URL in the browser.
  // Store a site-relative path here to avoid /blog-zh/blog-zh/ results.
  const url = `/${path.replaceAll("\\", "/").replace(/index\.html$/, "")}`;
  articles.push({ content, url });
}

if (articles.length) {
  const checked = result => {
    if (result.errors.length) throw new Error(result.errors.join("\n"));
    return result;
  };
  try {
    const { index } = checked(
      await pagefind.createIndex({ forceLanguage: "zh" })
    );
    if (!index) throw new Error("Pagefind index was not created");
    for (const article of articles) checked(await index.addHTMLFile(article));
    checked(await index.writeFiles({ outputPath: "dist/pagefind" }));
  } finally {
    await pagefind.close();
  }
}
process.stdout.write(
  `Search: indexed ${articles.length} published articles.\n`
);
