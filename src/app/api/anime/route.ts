import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAnimeWorksPaginated, type AnnictWork } from "@/lib/annict";
import { expandSeasons, SEASONS } from "@/lib/seasons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// プール拡大 + Annict 側コールドスタートで 13 ページ逐次取得が 30s を超えるケースがあったため、
// 40s に延長（Hobby プラン nodejs ランタイムは最大 60s だが、失敗時のユーザー待機を抑えるため控えめに設定）。
export const maxDuration = 40;

const POOL_PER_PAGE = 200;
const POOL_PAGES = 13;

// プール（視聴登録数の上位N件）のサーバーサイドキャッシュ。
// プールの中身は日単位でしか変動しないため一定時間使い回し、2回目以降の
// ガチャは Annict 取得ゼロ（フィルタ＋シャッフルのみ）で即応答させる。
// module スコープのため、ウォームなインスタンス／dev サーバ内では永続する。
const POOL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間（プール内容は週単位でしか変動しない）
const POOL_CACHE_MAX_KEYS = 16;

type PoolCacheEntry = { works: AnnictWork[]; fetchedAt: number };
const poolCache = new Map<string, PoolCacheEntry>();

/** expandedSeasons をキーにプールを取得する（キャッシュ有効ならそれを返す）。 */
async function getPool(expandedSeasons: string[]): Promise<AnnictWork[]> {
  // seasons 集合をキー化（順序非依存）。条件未指定は "" がキーになる。
  const key = [...expandedSeasons].sort().join(",");
  const cached = poolCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < POOL_CACHE_TTL_MS) {
    return cached.works;
  }
  const works = await searchAnimeWorksPaginated({
    seasons: expandedSeasons,
    perPage: POOL_PER_PAGE,
    pages: POOL_PAGES,
  });
  poolCache.set(key, { works, fetchedAt: Date.now() });
  // 季節指定の組み合わせが増えても肥大化しないよう、古いキーから上限内に収める
  while (poolCache.size > POOL_CACHE_MAX_KEYS) {
    const oldest = poolCache.keys().next().value;
    if (oldest === undefined) break;
    poolCache.delete(oldest);
  }
  return works;
}

const POPULARITY_THRESHOLDS = {
  all: 0,
  popular: 1000,
  very_popular: 5000,
} as const;

const HIGH_RATED_THRESHOLD_PERCENT = 70;

const MEDIA_VALUES = ["TV", "OVA", "MOVIE", "WEB", "OTHER"] as const;

export const querySchema = z
  .object({
    yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
    yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
    seasons: z.array(z.enum(SEASONS)).optional(),
    count: z.coerce.number().int().min(1).max(100).default(5),
    popularity: z.enum(["all", "popular", "very_popular"]).default("all"),
    popularityThreshold: z.coerce.number().int().min(0).optional(),
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
  popularityThreshold: number | undefined,
): AnnictWork[] {
  const minWatchers =
    popularity === "popular" && popularityThreshold != null
      ? popularityThreshold
      : POPULARITY_THRESHOLDS[popularity];
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
    popularityThreshold: searchParams.get("popularityThreshold") ?? undefined,
    highRated: searchParams.get("highRated") ?? undefined,
    media: searchParams.getAll("media"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    yearFrom,
    yearTo,
    seasons,
    count,
    popularity,
    popularityThreshold,
    highRated,
    media,
  } = parsed.data;

  try {
    const expandedSeasons = expandSeasons({ yearFrom, yearTo, seasons });
    const pool = await getPool(expandedSeasons);
    const filtered = applyFilters(
      pool,
      popularity,
      highRated,
      media,
      popularityThreshold,
    );
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
