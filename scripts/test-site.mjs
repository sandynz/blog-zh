import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { isWeChatArticleURL } from "../src/utils/wechatURL.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await mkdtemp(join(tmpdir(), "blog-zh-test-"));
const write = async (path, value) => {
  await mkdir(dirname(join(sandbox, path)), { recursive: true });
  await writeFile(join(sandbox, path), value, "utf8");
};
const html = path => readFile(join(sandbox, "dist", path), "utf8");
let run = 0;
function build(expectedError) {
  const result = spawnSync(
    process.execPath,
    [join(root, "node_modules/astro/bin/astro.mjs"), "build"],
    {
      cwd: sandbox,
      encoding: "utf8",
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
    }
  );
  const output = `${result.stdout}\n${result.stderr}`;
  if (expectedError) {
    assert.notEqual(result.status, 0, "Invalid content unexpectedly built");
    assert.match(output, expectedError);
  } else {
    assert.equal(result.status, 0, output);
  }
  process.stdout.write(
    `Build ${++run}: ${expectedError ? "expected rejection" : "passed"}\n`
  );
}
const article = (
  title,
  extra = "",
  body = "中文搜索测试：量子计算。\n\n## 示例代码\n\n```js\nconst answer = 42;\n```\n"
) =>
  `---\ntitle: ${title}\ndescription: 集成测试摘要\npubDatetime: 2000-01-01T00:00:00Z\n${extra}---\n\n${body}`;
const topic = (slug, posts) => ({
  slug,
  title: `测试专题 ${slug}`,
  description: "建议阅读顺序",
  posts,
});
const registry = records =>
  write("src/content/topics.json", JSON.stringify(records));
const search = () => {
  const result = spawnSync(
    process.execPath,
    [join(sandbox, "scripts/build-search.mjs")],
    { cwd: sandbox, encoding: "utf8" }
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
};

try {
  for (const path of [
    "src",
    "public",
    "scripts",
    "astro.config.ts",
    "astro-paper.config.ts",
    "tsconfig.json",
    "package.json",
  ]) {
    await cp(join(root, path), join(sandbox, path), {
      recursive: true,
      filter: source => source !== join(root, "src/content/posts"),
    });
  }
  await symlink(
    join(root, "node_modules"),
    join(sandbox, "node_modules"),
    process.platform === "win32" ? "junction" : "dir"
  );
  await mkdir(join(sandbox, "src/content/posts"), { recursive: true });
  await write(".local/private-sentinel.md", "PRIVATE_PREPARATION_SENTINEL");
  await registry([]);
  build();
  assert.match(await html("index.html"), /暂无文章/);
  assert.match(await html("search/index.html"), /暂无可搜索的文章/);
  assert.doesNotMatch(await html("index.html"), /href="[^"]*\/topics\//);
  assert.match(search(), /indexed 0 published articles/);

  await write(
    "src/content/posts/first.md",
    article(
      "第一篇 中文测试",
      "tags: [中文, 测试]\nwechatURL: https://mp.weixin.qq.com/s/test_public_article\n"
    )
  );
  await write(
    "src/content/posts/series/second.mdx",
    article(
      "第二篇 交互扩展测试",
      "",
      '## 静态组件\n\n<div aria-label="MDX 示例">{2 + 2}</div>\n'
    )
  );
  await write(
    "src/content/posts/draft.md",
    article("DRAFT_SENTINEL", "draft: true\n")
  );
  await write(
    "src/content/posts/future.md",
    article("FUTURE_SENTINEL").replace("2000-01-01", "2099-01-01")
  );
  for (let i = 0; i < 8; i++)
    await write(`src/content/posts/extra-${i}.md`, article(`分页测试 ${i}`));
  const records = [
    topic("start", ["series/second", "draft", "first", "future"]),
    topic("another", ["first"]),
    topic("hidden", ["draft", "future"]),
  ];
  await registry(records);
  build();
  assert.match(search(), /indexed 10 published articles/);
  const detail = await html("topics/start/index.html");
  assert(detail.indexOf("第二篇") < detail.indexOf("第一篇"));
  assert.match(detail, /https:\/\/mp.weixin.qq.com\/s\/test_public_article/);
  const first = await html("posts/first/index.html");
  assert.match(first, /\/topics\/start\//);
  assert.match(first, /\/topics\/another\//);
  assert.match(await html("posts/series/second/index.html"), /MDX 示例/);
  assert.doesNotMatch(
    await html("posts/series/second/index.html"),
    /阅读公众号版本/
  );
  assert.match(await html("posts/2/index.html"), /前往上一页/);

  const outputFiles = await readdir(join(sandbox, "dist"), { recursive: true });
  const fragments = outputFiles.filter(path => path.endsWith(".pf_fragment"));
  assert.equal(fragments.length, 10);
  for (const path of fragments) {
    const content = gunzipSync(
      await readFile(join(sandbox, "dist", path))
    ).toString("utf8");
    assert.doesNotMatch(
      content,
      /DRAFT_SENTINEL|FUTURE_SENTINEL|PRIVATE_PREPARATION_SENTINEL/
    );
    // Runtime adds /blog-zh/ from the bundle URL: never store that base twice.
    assert.match(content, /"url":"\/posts\//);
  }
  assert(
    !outputFiles.some(path =>
      /(?:draft|future|hidden|\.local|about)/.test(path)
    )
  );
  for (const path of outputFiles.filter(path =>
    /\.(?:html|xml|txt|js|json)$/.test(path)
  )) {
    const source = await html(path);
    assert.doesNotMatch(
      source,
      /DRAFT_SENTINEL|FUTURE_SENTINEL|PRIVATE_PREPARATION_SENTINEL/
    );
    if (path.endsWith(".html")) {
      for (const [, target] of source.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
        assert(
          target.startsWith("/blog-zh/"),
          `${path}: base missing in ${target}`
        );
        const localPath = decodeURIComponent(
          target.split(/[?#]/)[0].slice("/blog-zh/".length)
        );
        const destination =
          localPath.endsWith("/") || localPath === ""
            ? `${localPath}index.html`
            : localPath;
        await readFile(join(sandbox, "dist", destination));
      }
    }
  }
  assert.match(
    await html("rss.xml"),
    /https:\/\/sandynz.github.io\/blog-zh\/posts\/first\//
  );
  assert.match(
    await html("sitemap-0.xml"),
    /https:\/\/sandynz.github.io\/blog-zh\/topics\/start\//
  );
  assert.match(
    await html("robots.txt"),
    /https:\/\/sandynz.github.io\/blog-zh\/sitemap-index.xml/
  );

  for (const [invalid, error] of [
    [[topic("broken", ["missing"])], /Topic broken: unknown post missing/],
    [[topic("duplicate", ["first", "first"])], /duplicate post first/],
    [
      [topic("same", ["first"]), topic("same", ["first"])],
      /Duplicate topic slug: same/,
    ],
    [[topic("..", ["first"])], /Invalid|invalid/],
  ]) {
    await registry(invalid);
    build(error);
  }
  await registry(records);
  await write(
    "src/content/posts/invalid-url.md",
    article(
      "坏地址",
      "wechatURL: https://mp.weixin.qq.com/cgi-bin/home?t=home/index\n"
    )
  );
  build(/Expected a public HTTPS/);
  for (const value of [
    "http://mp.weixin.qq.com/s/a",
    "https://evil.test/s/a",
    "https://mp.weixin.qq.com/s",
    "https://mp.weixin.qq.com/cgi-bin/home",
    "https://user@mp.weixin.qq.com/s/a",
  ])
    assert.equal(isWeChatArticleURL(value), false, value);
  assert(isWeChatArticleURL("https://mp.weixin.qq.com/s/a-b_C"));
  assert(
    isWeChatArticleURL("https://mp.weixin.qq.com/s?__biz=a&mid=1&idx=1&sn=b")
  );
  // Restore the valid fixture build for optional local browser verification.
  if (process.env.BLOG_TEST_KEEP === "1") {
    await rm(join(sandbox, "src/content/posts/invalid-url.md"));
    build();
    search();
  }
  process.stdout.write(
    "PASS: empty site, topics/order/membership, Markdown/MDX, pagination, private filtering, links, RSS, sitemap, search count, invalid content and WeChat URLs.\n"
  );
} finally {
  assert(
    sandbox.startsWith(resolve(tmpdir()) + sep) &&
      sandbox.includes("blog-zh-test-")
  );
  if (process.env.BLOG_TEST_KEEP === "1")
    process.stdout.write(`Fixture retained: ${sandbox}\n`);
  else await rm(sandbox, { recursive: true, force: true });
}
