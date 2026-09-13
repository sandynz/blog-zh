# 老钟+AI

sandynz 的中文博客，基于 AstroPaper，使用 GitHub Pages。

## 本地开发

使用 Node.js 24 和 pnpm 11.5.0：

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm format:check
pnpm lint
pnpm build
pnpm preview
```

开发或预览地址带 `/blog-zh/`。全文搜索索引在构建时生成，请在 `pnpm build` 后通过 `pnpm preview` 验证搜索。构建仅输出 `dist/`，不复制索引到源码目录。

## 写作与发布

正式文章放入 `src/content/posts/`，普通 Markdown 优先；有交互内容时才使用 MDX。文件名用稳定英文 slug，子目录也会影响 URL。发布后修改标题不改文件路径。正文不放文章配图。

所需 frontmatter 为 `title`、`description`（文章摘要）、`pubDatetime`（带时区日期）；`tags` 可省略。站点简介保持空白，文章摘要可正常填写。没有真实文章时保持空站，不发布主题示例。

**这是公开仓库。** 备用稿件、公众号配图、后台截图和运行记录放在仓库外的私有目录，或被忽略的 `.local/`。不要放进 `public/`，不要通过公开分支或 PR 存储。`draft: true` 仅控制页面生成，不能隐藏已提交的源码。不要强制添加忽略文件或提交凭据。

提前批量备稿，按当日选定文章同步发布：博客上线并验证 URL → 公众号引用博客并发布 → 当天回填公众号公开链接 → 检查双向导航。未发文章继续保留私有状态。公众号失败或审核中时先核对记录，不重复发送，也不自动发布下一篇。

## 专题与公众号入口

`src/content/topics.json` 是专题与顺序的唯一来源，初始为空。每项包含 `slug`（稳定英文短名）、`title`、可选 `description` 和有序的 `posts` 数组。`posts` 填 Astro 内容 ID，即文章的相对路径去掉扩展名，例如 `series/first-post`，不是文章标题或完整 URL。同一文章可以被多个专题引用。

专题入口为 `/blog-zh/topics/`，详情为 `/blog-zh/topics/<slug>/`。专题仅列出当前可公开的文章，空专题不生成详情或导航；坏引用、重复 slug 和重复文章引用会使构建失败。公开清单也不能提前写入私有稿件信息，应随当日文章逐篇更新。

当公众号文章已发布且链接核验成功后，在对应博客文章 frontmatter 增加 `wechatURL`。只接受 `https://mp.weixin.qq.com/s/...` 短地址，或带 `__biz`、`mid`、`idx`、`sn` 的 `/s` 公开地址；后台管理地址不能使用。文章页和专题页自动显示“阅读公众号版本”，未填写时隐藏。

`pnpm test` 在系统临时目录生成纯测试文章并构建，验证专题顺序、过滤、错误引用、公众号地址和子路径产物；测试文章不会进入站点源码或正式构建。真实文章发布前仍需人工核对两端的实际内容和链接。

## GitHub Pages

目标地址：`https://sandynz.github.io/blog-zh/`。首次部署前，在 GitHub 仓库 Settings → Pages 将 Source 设为 **GitHub Actions**。

推送 `main` 会检查格式、lint 和构建，再上传 `dist/` 部署；PR 只检查。无需第二个 HTML 仓库或 `gh-pages` 分支。当前代码准备好不代表线上已经部署。部署成功后检查首页、文章深链接刷新、RSS、sitemap、搜索和移动端。

回退使用新 commit 恢复上一版本并重新部署，不改写公开历史。回退博客不能撤回已发送的公众号文章。备用稿件的日期不会触发定时任务；本站没有自动按日发布安排。

部署配置参考 [Astro 官方 Pages 指南](https://docs.astro.build/en/guides/deploy/github/)。

## 上游与许可

引入 [AstroPaper 6.1.0](https://github.com/satnaing/astro-paper/tree/35cfa7fbe0b897306d27670d3819e55d5205f3dd)，保留代码的 [MIT 许可](LICENSE)。升级时对比该 commit，先验证子路径、中文、搜索及内容过滤，再更新依赖锁文件。

文章和公众号图片没有自动采用代码许可；除非另有声明，保留作者权利。分类、首页标签区、右侧目录、英文站和互动演示按后续内容需要扩展。公众号技能最后结合用户登录后的真实草稿操作流程实现。
