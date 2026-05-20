export type Rarity = "r1" | "r2" | "r3";

// satisfactionRateは公式仕様で単位（0-1 / 0-100）が明示されていないため両対応
function normalizePercent(rate: number | null): number | null {
  if (rate == null) return null;
  return rate <= 1 ? rate * 100 : rate;
}

/**
 * レアリティ判定
 * - ★3 虹: 視聴登録 >= 22,000 OR (視聴登録 >= 10,500 AND 満足度 >= 83%)
 *   満足度データが無いメジャー古典作品も視聴登録のみで虹に昇格できる設計。
 * - ★2 金: 視聴登録 >= 5,800（虹に該当しないもの）
 * - ★1 青: それ以外（大半）
 *
 * 閾値は抽選プール（視聴登録の上位 約2,600件）で ★3≈2% / ★2≈10% になるよう
 * 調整した値。プール規模（route.ts の POOL_PAGES）を変えたら再調整が必要。
 */
export function getRarity(
  watchersCount: number,
  satisfactionRate: number | null,
): Rarity {
  const sat = normalizePercent(satisfactionRate);
  const isRainbow =
    watchersCount >= 22000 ||
    (watchersCount >= 10500 && sat != null && sat >= 83);
  if (isRainbow) return "r3";
  if (watchersCount >= 5800) return "r2";
  return "r1";
}

export const RARITY_STARS: Record<Rarity, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};
