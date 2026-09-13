/** Only public WeChat article URLs belong in the published content mapping. */
export function isWeChatArticleURL(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "mp.weixin.qq.com" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return false;
    if (/^\/s\/[A-Za-z0-9_-]+$/.test(url.pathname)) return true;
    return (
      url.pathname === "/s" &&
      ["__biz", "mid", "idx", "sn"].every(key => url.searchParams.get(key))
    );
  } catch {
    return false;
  }
}
