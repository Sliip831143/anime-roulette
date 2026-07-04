import type { AnnictWork } from "@/lib/annict";

/**
 * 表示用フォーマッタの集約モジュール。
 * 以前は満足度正規化・季節/メディアのラベルが route / rarity / 各コンポーネントに
 * 重複しており、閾値や表記の変更時にドリフトする恐れがあったためここに一元化した。
 */

// satisfactionRate は公式仕様で単位（0-1 / 0-100）が明示されていないため両対応
export function normalizeSatisfactionPercent(
  rate: number | null,
): number | null {
  if (rate == null) return null;
  return rate <= 1 ? rate * 100 : rate;
}

/** 満足度を "93.2%" 形式で返す（データなしは null） */
export function formatSatisfaction(rate: number | null): string | null {
  const percent = normalizeSatisfactionPercent(rate);
  if (percent == null) return null;
  return `${percent.toFixed(1)}%`;
}

export const SEASON_LABELS: Record<
  NonNullable<AnnictWork["seasonName"]>,
  string
> = {
  WINTER: "冬",
  SPRING: "春",
  SUMMER: "夏",
  AUTUMN: "秋",
};

export const MEDIA_LABELS: Record<NonNullable<AnnictWork["media"]>, string> = {
  TV: "TV",
  OVA: "OVA",
  MOVIE: "映画",
  WEB: "Web",
  OTHER: "その他",
};

/** "2024年 / 春 / TV" 形式（結果カード・詳細ダイアログ用） */
export function formatSeasonMedia(work: AnnictWork): string {
  const parts: string[] = [];
  if (work.seasonYear != null) parts.push(`${work.seasonYear}年`);
  if (work.seasonName) parts.push(SEASON_LABELS[work.seasonName]);
  if (work.media) parts.push(MEDIA_LABELS[work.media]);
  return parts.join(" / ") || "情報なし";
}

/** "2024年 春" 形式（ガチャ演出のリザルト用。メディアは別行で出すため含めない） */
export function formatYearSeason(work: AnnictWork): string {
  const parts: string[] = [];
  if (work.seasonYear != null) parts.push(`${work.seasonYear}年`);
  if (work.seasonName) parts.push(SEASON_LABELS[work.seasonName]);
  return parts.join(" ") || "情報なし";
}
