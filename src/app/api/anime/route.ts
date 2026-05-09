import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAnimeWorks, type AnnictWork } from "@/lib/annict";
import { expandSeasons, SEASONS } from "@/lib/seasons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POOL_SIZE = 200;

const POPULARITY_THRESHOLDS = {
  all: 0,
  popular: 1000,
  very_popular: 5000,
} as const;

const HIGH_RATED_THRESHOLD_PERCENT = 70;

const querySchema = z
  .object({
    yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
    yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
    seasons: z.array(z.enum(SEASONS)).optional(),
    count: z.coerce.number().int().min(1).max(20).default(5),
    popularity: z.enum(["all", "popular", "very_popular"]).default("all"),
    highRated: z
      .union([z.literal("true"), z.literal("false")])
      .default("false")
      .transform((v) => v === "true"),
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
): AnnictWork[] {
  const minWatchers = POPULARITY_THRESHOLDS[popularity];
  return works.filter((w) => {
    if (w.watchersCount < minWatchers) return false;
    if (highRated) {
      const percent = normalizeSatisfactionPercent(w.satisfactionRate);
      if (percent == null || percent < HIGH_RATED_THRESHOLD_PERCENT) return false;
    }
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
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { yearFrom, yearTo, seasons, count, popularity, highRated } = parsed.data;

  try {
    const expandedSeasons = expandSeasons({ yearFrom, yearTo, seasons });
    const pool = await searchAnimeWorks({
      seasons: expandedSeasons,
      first: POOL_SIZE,
    });
    const filtered = applyFilters(pool, popularity, highRated);
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
