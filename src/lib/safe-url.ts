/**
 * 外部データ（Annict 等）由来の URL を <a href> に渡す前の無害化ヘルパー。
 *
 * Annict の作品データはユーザー編集の余地があるため、officialSiteUrl 等に
 * `javascript:` のような危険スキームが混入すると XSS になりうる。
 * http / https 以外のスキームはすべて null に落とす。
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // 相対 URL やパース不能な文字列は外部リンクとして不正扱い
  }
  return null;
}
