export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

// Annict に放送年データが存在する最古の年。これ未満を指定しても結果が出ない。
// UI（search-form）と API（querySchema）の両方で同じ下限を使う。
export const MIN_YEAR = 1991;

export const SEASON_LABELS_JA: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

// Annict の放送クールは日本時間基準。サーバー（Vercel は UTC）でもブラウザでも同じ判定になるよう、
// 「今」の年月は常に JST で取る（UTC のままだと JST の 0〜9 時に年・季節が 1 つ前になる）
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export function getJstYearMonth(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/** 指定の年・月（1〜12）が JST の今より未来か */
function isFutureMonth(year: number, month: number, now: Date): boolean {
  const cur = getJstYearMonth(now);
  return year > cur.year || (year === cur.year && month > cur.month);
}

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
  return isFutureMonth(work.seasonYear, startMonth, now);
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
        if (isFutureMonth(year, SEASON_START_MONTH[season], now)) continue;
      }
      result.push(`${year}-${season}`);
    }
  }
  return result;
}

/**
 * 「今期」= 現在月が属する放送クール（1〜3月 冬 / 4〜6月 春 / 7〜9月 夏 / 10〜12月 秋）を返す。
 * 前クールから継続中の作品は含めず、今期に放送を始めた作品だけを対象にする前提。
 */
export function getCurrentSeason(now: Date = new Date()): {
  year: number;
  season: Season;
} {
  const { year, month } = getJstYearMonth(now);
  const season =
    SEASONS.find((s) => {
      const start = SEASON_START_MONTH[s];
      return month >= start && month < start + 3;
    }) ?? "winter";
  return { year, season };
}

export function isSeason(value: string): value is Season {
  return (SEASONS as readonly string[]).includes(value);
}

export type SeasonFilterInput = {
  /** 手入力された開始年（未入力なら null） */
  yearFrom: number | null;
  /** 手入力された終了年（未入力なら null） */
  yearTo: number | null;
  /** ランダムボタンで選ばれた年（未選択なら null） */
  pickedYear: number | null;
  /** 現在の年 */
  currentYear: number;
};

/**
 * 検索フォームで季節指定を有効にしてよいかを判定する。
 *
 * 有効になる条件:
 * - 開始年 / 終了年を手入力している（本年の手入力もユーザー意図として許可）
 * - ランダムボタンで本年「以外」の年が選ばれている
 *
 * ランダムで本年が選ばれたケースだけは、未放送の季節を含みうるため無効化する。
 * （pickedYear が null のときは `null !== currentYear` が true になるので
 *   手入力ベースの判定を阻害しない）
 */
export function isSeasonFilterEnabled({
  yearFrom,
  yearTo,
  pickedYear,
  currentYear,
}: SeasonFilterInput): boolean {
  return (
    pickedYear !== currentYear &&
    (yearFrom != null || yearTo != null || pickedYear != null)
  );
}
