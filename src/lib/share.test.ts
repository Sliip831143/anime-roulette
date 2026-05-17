import { describe, it, expect } from "vitest";
import { buildBatchTweetText, type BatchShareTarget } from "./share";

const make = (title: string, rarity: BatchShareTarget["rarity"] = "r1") => ({
  title,
  rarity,
});

const SHARE_URL = "https://anime-roulette-inky.vercel.app/";
const HASHTAG = "#アニメルーレット";

/** X 仕様の文字数カウント（テスト側でも同じロジックを再現） */
function countX(s: string): number {
  let n = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    n += code <= 0x7e ? 1 : 2;
  }
  return n;
}

/** URL は t.co 短縮で 23 カウント */
function countXWithUrl(text: string): number {
  if (!text.includes(SHARE_URL)) return countX(text);
  const replaced = text.replace(SHARE_URL, "");
  return countX(replaced) - 1 + 23;
}

describe("buildBatchTweetText", () => {
  it("ヘッダー / フッター（URL とハッシュタグ）が必ず含まれる", () => {
    const text = buildBatchTweetText([make("作品A")]);
    expect(text.startsWith("アニメルーレットを回しました\n\n")).toBe(true);
    expect(text).toContain(SHARE_URL);
    expect(text).toContain(HASHTAG);
  });

  it("URL とハッシュタグの前は空行で区切られる", () => {
    const text = buildBatchTweetText([make("作品A")]);
    expect(text).toContain(`\n\n${SHARE_URL}\n${HASHTAG}`);
  });

  it("少数件は全件含まれる", () => {
    const text = buildBatchTweetText([
      make("作品A", "r3"),
      make("作品B", "r2"),
      make("作品C", "r1"),
    ]);
    expect(text).toContain("★★★ 作品A");
    expect(text).toContain("★★ 作品B");
    expect(text).toContain("★ 作品C");
    expect(text).not.toContain("他");
  });

  it("作品間は改行で区切られる", () => {
    const text = buildBatchTweetText([make("A"), make("B")]);
    expect(text).toContain("★ A\n★ B");
  });

  it("超過時は末尾を削って「…他N件」に省略される", () => {
    const works = Array.from({ length: 30 }, (_, i) =>
      make("非常に長い日本語タイトル_" + String(i).padStart(2, "0"), "r3"),
    );
    const text = buildBatchTweetText(works);
    expect(text).toMatch(/…他\d+件\n\n/);
  });

  it("超過時も X カウントで 280 以内に収まる", () => {
    const works = Array.from({ length: 50 }, (_, i) =>
      make("長めの日本語アニメタイトル" + String(i).padStart(2, "0"), "r2"),
    );
    const text = buildBatchTweetText(works);
    expect(countXWithUrl(text)).toBeLessThanOrEqual(280);
  });

  it("全件入る場合は「…他N件」を付けない", () => {
    const text = buildBatchTweetText([
      make("短い1"),
      make("短い2"),
      make("短い3"),
    ]);
    expect(text).not.toContain("他");
    expect(text).not.toContain("…");
  });

  it("「…他N件」の N は実際に省略された件数と一致する", () => {
    const works = Array.from({ length: 20 }, (_, i) =>
      make("非常に長めのアニメ作品名サンプル" + String(i).padStart(2, "0"), "r1"),
    );
    const text = buildBatchTweetText(works);
    const match = text.match(/…他(\d+)件/);
    expect(match).not.toBeNull();
    if (match) {
      const omitted = Number(match[1]);
      const lineCount = text
        .split("\n")
        .filter((l) => l.startsWith("★")).length;
      expect(lineCount + omitted).toBe(20);
    }
  });

  it("CJK は 2 カウントとして適切に省略判定が走る（半角40字程度なら 20 件入らない）", () => {
    // 各行 約 12 全角 = 24 カウント、20 件で 480 → 半分以上省略されるはず
    const works = Array.from({ length: 20 }, (_, i) =>
      make(`日本語タイトル_${i}`, "r2"),
    );
    const text = buildBatchTweetText(works);
    expect(countXWithUrl(text)).toBeLessThanOrEqual(280);
    expect(text).toContain("…他");
  });
});
