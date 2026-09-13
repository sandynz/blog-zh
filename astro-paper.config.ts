import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://sandynz.github.io/blog-zh/",
    title: "老钟+AI",
    description: "",
    author: "sandynz",
    profile: "https://github.com/sandynz",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: { perPage: 8, perIndex: 4, scheduledPostMargin: 0 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    {
      name: "github",
      url: "https://github.com/sandynz",
      linkTitle: "sandynz 的 GitHub",
    },
  ],
  shareLinks: [],
});
