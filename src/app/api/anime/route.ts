import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAnimeWorksPaginated, type AnnictWork } from "@/lib/annict";
import { expandSeasons, SEASONS } from "@/lib/seasons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POOL_PER_PAGE = 200;
const POOL_PAGES = 5;

const POPULARITY_THRESHOLDS = {
  all: 0,
  popular: 1000,
  very_popular: 5000,
} as const;

const HIGH_RATED_THRESHOLD_PERCENT = 70;

const MEDIA_VALUES = ["TV", "OVA", "MOVIE", "WEB", "OTHER"] as const;

const querySchema = z
  .object({
    yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
    yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
    seasons: z.array(z.enum(SEASONS)).optional(),
    count: z.coerce.number().int().min(1).max(10).default(5),
    popularity: z.enum(["all", "popular", "very_popular"]).default("all"),
    highRated: z
      .union([z.literal("true"), z.literal("false")])
      .default("false")
      .transform((v) => v === "true"),
    media: z.array(z.enum(MEDIA_VALUES)).optional(),
  })
  .refine(
    (v) => v.yearFrom == null || v.yearTo == null || v.yearFrom <= v.yearTo,
    { message: "yearFrom must be less than or equal to yearTo", path: ["yearFrom"] },
  )
  .refine((v) => v.yearFrom != null || v.yearTo != null || !v.seasons?.length, {
    message: "seasons require at least one of yearFrom/yearTo",
    path: ["seasons"],
  });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// satisfactionRateは公式仕様で単位が明示されていないため、0-1スケール/0-100スケール双方に対応
function normalizeSatisfactionPercent(rate: number | null): number | null {
  if (rate == null) return null;
  return rate <= 1 ? rate * 100 : rate;
}

function applyFilters(
  works: AnnictWork[],
  popularity: keyof typeof POPULARITY_THRESHOLDS,
  highRated: boolean,
  media: readonly (typeof MEDIA_VALUES)[number][] | undefined,
): AnnictWork[] {
  const minWatchers = POPULARITY_THRESHOLDS[popularity];
  // 未指定 or 全選択時は絞り込まない
  const mediaFilter =
    media && media.length > 0 && media.length < MEDIA_VALUES.length
      ? new Set(media)
      : null;
  return works.filter((w) => {
    if (w.watchersCount < minWatchers) return false;
    if (highRated) {
      const percent = normalizeSatisfactionPercent(w.satisfactionRate);
      if (percent == null || percent < HIGH_RATED_THRESHOLD_PERCENT) return false;
    }
    if (mediaFilter && (w.media == null || !mediaFilter.has(w.media))) return false;
    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    yearFrom: searchParams.get("yearFrom") ?? undefined,
    yearTo: searchParams.get("yearTo") ?? undefined,
    seasons: searchParams.getAll("seasons"),
    count: searchParams.get("count") ?? undefined,
    popularity: searchParams.get("popularity") ?? undefined,
    highRated: searchParams.get("highRated") ?? undefined,
    media: searchParams.getAll("media"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { yearFrom, yearTo, seasons, count, popularity, highRated, media } =
    parsed.data;

  try {
    const expandedSeasons = expandSeasons({ yearFrom, yearTo, seasons });
    const pool = await searchAnimeWorksPaginated({
      seasons: expandedSeasons,
      perPage: POOL_PER_PAGE,
      pages: POOL_PAGES,
    });
    const filtered = applyFilters(pool, popularity, highRated, media);
    const picked = shuffle(filtered).slice(0, count);
    return NextResponse.json({
      works: picked,
      total: filtered.length,
      poolSize: pool.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("ANNICT_TOKEN") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
