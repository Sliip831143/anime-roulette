export type Rarity = "r1" | "r2" | "r3";

// satisfactionRateは公式仕様で単位（0-1 / 0-100）が明示されていないため両対応
function normalizePercent(rate: number | null): number | null {
  if (rate == null) return null;
  return rate <= 1 ? rate * 100 : rate;
}

/**
 * レアリティ判定
 * - ★3 虹: 視聴登録 >= 22,000 OR (視聴登録 >= 12,000 AND 満足度 >= 83%)
 *   満足度データが無いメジャー古典作品も視聴登録のみで虹に昇格できる設計。
 *   ハイブリッド条件を厳しめにすることで、中堅人気作の金色レンジを確保。
 * - ★2 金: 視聴登録 >= 8,500（虹に該当しないもの）
 * - ★1 青: それ以外（大半）
 */
export function getRarity(
  watchersCount: number,
  satisfactionRate: number | null,
): Rarity {
  const sat = normalizePercent(satisfactionRate);
  const isRainbow =
    watchersCount >= 22000 ||
    (watchersCount >= 12000 && sat != null && sat >= 83);
  if (isRainbow) return "r3";
  if (watchersCount >= 8500) return "r2";
  return "r1";
}

export const RARITY_STARS: Record<Rarity, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};
