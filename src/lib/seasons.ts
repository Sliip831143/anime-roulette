export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS_JA: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

// Annict GraphQL に放送ステータス系のフィールドは無いため、未来の放送予定作品を
// プールから除くには「未来 season をリクエスト側で投げない」しかない。
// クライアント側で seasonYear/seasonName から開始月を逆算して除外する。
const SEASON_START_MONTH: Record<Season, number> = {
  winter: 1,
  spring: 4,
  summer: 7,
  autumn: 10,
};

// Annict が Work で返す seasonName は大文字 enum。判定用に同じマッピングを別途持つ。
export type AnnictSeasonName = "WINTER" | "SPRING" | "SUMMER" | "AUTUMN";
const ANNICT_SEASON_START_MONTH: Record<AnnictSeasonName, number> = {
  WINTER: 1,
  SPRING: 4,
  SUMMER: 7,
  AUTUMN: 10,
};

/**
 * 作品の seasonYear/seasonName から「現在より未来の放送予定か」を判定する。
 * seasonYear / seasonName のどちらかが null の場合は判定不能なので false（除外しない）を返す。
 *
 * 全期間モード（年・季節とも未指定）で Annict 側 seasons フィルタが効かないときに
 * applyFilters から呼び出してプールから未来作品を除く用途。
 */
export function isWorkFutureSeason(
  work: { seasonYear: number | null; seasonName: AnnictSeasonName | null },
  now: Date = new Date(),
): boolean {
  if (work.seasonYear == null || work.seasonName == null) return false;
  const startMonth = ANNICT_SEASON_START_MONTH[work.seasonName];
  const seasonStart = new Date(work.seasonYear, startMonth - 1, 1);
  return seasonStart > now;
}

export type ExpandSeasonsInput = {
  yearFrom?: number;
  yearTo?: number;
  seasons?: Season[];
  /** 未来 season 除外の基準時刻（テスト用に上書き可能） */
  now?: Date;
};

export function expandSeasons({
  yearFrom,
  yearTo,
  seasons,
  now = new Date(),
}: ExpandSeasonsInput): string[] {
  if (yearFrom == null && yearTo == null) return [];

  const from = yearFrom ?? yearTo!;
  const to = yearTo ?? yearFrom!;
  if (from > to) {
    throw new Error("yearFrom must be less than or equal to yearTo");
  }

  const explicitSeasons = seasons != null && seasons.length > 0;
  const targetSeasons = explicitSeasons ? seasons! : [...SEASONS];

  const result: string[] = [];
  for (let year = from; year <= to; year++) {
    for (const season of targetSeasons) {
      // seasons を明示指定された場合はユーザー意図を尊重して未来でも展開する。
      // 未指定（年だけ指定）のときのみ、まだ放送が始まっていない season を除外する。
      if (!explicitSeasons) {
        const startMonth = SEASON_START_MONTH[season];
        const seasonStart = new Date(year, startMonth - 1, 1);
        if (seasonStart > now) continue;
      }
      result.push(`${year}-${season}`);
    }
  }
  return result;
}

export function isSeason(value: string): value is Season {
  return (SEASONS as readonly string[]).includes(value);
}
