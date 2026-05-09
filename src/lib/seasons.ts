export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS_JA: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

export type ExpandSeasonsInput = {
  yearFrom?: number;
  yearTo?: number;
  seasons?: Season[];
};

export function expandSeasons({
  yearFrom,
  yearTo,
  seasons,
}: ExpandSeasonsInput): string[] {
  if (yearFrom == null && yearTo == null) return [];

  const from = yearFrom ?? yearTo!;
  const to = yearTo ?? yearFrom!;
  if (from > to) {
    throw new Error("yearFrom must be less than or equal to yearTo");
  }

  const targetSeasons =
    seasons && seasons.length > 0 ? seasons : [...SEASONS];

  const result: string[] = [];
  for (let year = from; year <= to; year++) {
    for (const season of targetSeasons) {
      result.push(`${year}-${season}`);
    }
  }
  return result;
}

export function isSeason(value: string): value is Season {
  return (SEASONS as readonly string[]).includes(value);
}
