import type { Rarity } from "@/lib/rarity";

export type ShareTarget = {
  annictId: number;
  title: string;
  rarity: Rarity;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anime-roulette-inky.vercel.app";

const STARS: Record<Rarity, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};

export function buildShareUrl(target: ShareTarget): string {
  const params = new URLSearchParams({
    id: String(target.annictId),
    title: target.title,
    rarity: target.rarity,
  });
  return `${SITE_URL}/share?${params.toString()}`;
}

export function buildTweetIntent(target: ShareTarget): string {
  const stars = STARS[target.rarity];
  const text = `「${target.title}」(${stars}) が出ました`;
  const params = new URLSearchParams({
    text,
    url: buildShareUrl(target),
    hashtags: "アニメルーレット",
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function openTweetIntent(target: ShareTarget): void {
  window.open(buildTweetIntent(target), "_blank", "noopener,noreferrer");
}

// ====== 一括シェア（結果すべてを 1 ツイートに）======

export type BatchShareTarget = {
  title: string;
  rarity: Rarity;
};

// X (Twitter) の文字数カウント仕様：
// - ASCII (U+0000..U+007E) は 1 カウント
// - CJK・絵文字など Latin 外は 2 カウント
// - URL は t.co で短縮されて 23 カウント固定
// - 無料アカウントの上限は 280
const X_MAX = 280;
const X_URL_COUNT = 23;
const HEADER = "アニメルーレットを回しました\n\n";
// クエリパラメータを付けて X の OGP キャッシュをバストする（流入元の識別も兼ねる）。
// X は URL 違いを「別 URL」として扱うため、初回クロール時に最新 OGP が取得される。
const SHARE_URL = `${SITE_URL}/?from=x`;
const HASHTAG = "#アニメルーレット";
// 末尾は空行を挟んで URL → ハッシュタグの順に並べる
const FOOTER = `\n\n${SHARE_URL}\n${HASHTAG}`;

/** X 仕様の文字数カウント（CJK や絵文字は 2 カウント） */
function countX(s: string): number {
  let n = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    n += code <= 0x7e ? 1 : 2;
  }
  return n;
}

/** URL を 23 文字固定でカウントして合計を返す */
function countXWithUrl(text: string, url: string): number {
  // URL を仮の 1 文字に置換してカウント、その分 (URL の元カウント) を引いて 23 を足す
  if (!text.includes(url)) return countX(text);
  const replaced = text.replace(url, "");
  return countX(replaced) - 1 + X_URL_COUNT;
}

/**
 * 結果一覧を 1 ツイート分の本文に組み立てる。
 * 280 X-カウントに収まる限り全件、超えたら末尾から削って「…他N件」を末尾に追記する。
 */
export function buildBatchTweetText(works: BatchShareTarget[]): string {
  const lineOf = (w: BatchShareTarget) => `${STARS[w.rarity]} ${w.title}`;

  let body = "";
  let included = 0;
  for (const w of works) {
    const chunk = (included > 0 ? "\n" : "") + lineOf(w);
    const candidate = HEADER + body + chunk + FOOTER;
    if (countXWithUrl(candidate, SHARE_URL) > X_MAX) break;
    body += chunk;
    included++;
  }

  const remaining = works.length - included;
  if (remaining > 0) {
    let suffix = `\n…他${remaining}件`;
    // suffix が入るまで末尾の行を削る（…他N件 も再計算）
    while (
      countXWithUrl(HEADER + body + suffix + FOOTER, SHARE_URL) > X_MAX &&
      included > 0
    ) {
      const last = body.lastIndexOf("\n");
      if (last <= 0) {
        body = "";
        included = 0;
        break;
      }
      body = body.slice(0, last);
      included--;
      suffix = `\n…他${works.length - included}件`;
    }
    body += suffix;
  }

  return HEADER + body + FOOTER;
}

export function buildBatchTweetIntent(works: BatchShareTarget[]): string {
  // text に URL とハッシュタグを直接含めるので、url/hashtags パラメータは渡さない
  const text = buildBatchTweetText(works);
  const params = new URLSearchParams({ text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function openBatchTweetIntent(works: BatchShareTarget[]): void {
  window.open(buildBatchTweetIntent(works), "_blank", "noopener,noreferrer");
}
