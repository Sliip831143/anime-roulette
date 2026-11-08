import { NextResponse } from "next/server";
import { AnnictRateLimitError } from "@/lib/annict-rate-limit";
import { unstable_cache } from "next/cache";
import {
  MEDIA_VALUES,
  searchAnimeWorksPaginated,
  type AnnictWork,
} from "@/lib/annict";
import { normalizeSatisfactionPercent } from "@/lib/format";
import { expandSeasons, isWorkFutureSeason } from "@/lib/seasons";
import { querySchema } from "./schema";

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
//
// 以前は module スコープの Map を使っていたが、それだとサーバーレスインスタンス
// ごとに独立しており、コールドスタートのたびに 13 ページ逐次フェッチ（30秒超）が
// 発生していた。unstable_cache は Vercel Data Cache（インスタンス横断で永続、
// ローカルでは .next/cache）に保存されるため、コールドスタートでも即応答できる。
const POOL_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24時間（プール内容は週単位でしか変動しない）

/**
 * expandedSeasons をキーにプールを取得する。
 * キャッシュキーは unstable_cache が keyParts + 引数から導出する。
 * 呼び出し側で seasons をソートして渡し、順序非依存のキーにする。
 */
const getPoolCached = unstable_cache(
  async (expandedSeasons: string[]): Promise<AnnictWork[]> =>
    searchAnimeWorksPaginated({
      seasons: expandedSeasons,
      perPage: POOL_PER_PAGE,
      pages: POOL_PAGES,
    }),
  ["anime-pool"],
  { revalidate: POOL_CACHE_TTL_SECONDS },
);

// キャッシュミス時のスタンピード対策：同一キーへの同時リクエストが
// それぞれ 13 ページフェッチを多重実行しないよう、同一インスタンス内では
// in-flight の Promise を共有する（完了後はエントリを破棄して再試行可能にする）。
const inFlight = new Map<string, Promise<AnnictWork[]>>();

function getPool(expandedSeasons: string[]): Promise<AnnictWork[]> {
  const key = expandedSeasons.join(",");
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = getPoolCached(expandedSeasons).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

const POPULARITY_THRESHOLDS = {
  all: 0,
  popular: 1000,
  very_popular: 5000,
} as const;

const HIGH_RATED_THRESHOLD_PERCENT = 70;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applyFilters(
  works: AnnictWork[],
  popularity: keyof typeof POPULARITY_THRESHOLDS,
  highRated: boolean,
  media: readonly (typeof MEDIA_VALUES)[number][] | undefined,
  popularityThreshold: number | undefined,
  excludeFuture: boolean,
): AnnictWork[] {
  const minWatchers =
    popularity === "popular" && popularityThreshold != null
      ? popularityThreshold
      : POPULARITY_THRESHOLDS[popularity];
  // 未指定 or 全選択時は絞り込まない（OTHER は Annict 側のラベルとして残るため Set<string> で受ける）
  const mediaFilter =
    media && media.length > 0 && media.length < MEDIA_VALUES.length
      ? new Set<string>(media)
      : null;
  const now = excludeFuture ? new Date() : null;
  return works.filter((w) => {
    if (w.watchersCount < minWatchers) return false;
    if (highRated) {
      const percent = normalizeSatisfactionPercent(w.satisfactionRate);
      if (percent == null || percent < HIGH_RATED_THRESHOLD_PERCENT)
        return false;
    }
    if (mediaFilter && (w.media == null || !mediaFilter.has(w.media)))
      return false;
    // 全期間モード（年・季節とも未指定）では Annict 側の seasons フィルタが効かず、
    // 未来の放送予定作品もプールに混入する。seasonYear/seasonName から判定して除外する。
    if (now && isWorkFutureSeason(w, now)) return false;
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
    // seasons 集合をソートして順序非依存のキャッシュキーにする（条件未指定は空配列）
    const expandedSeasons = expandSeasons({ yearFrom, yearTo, seasons }).sort();
    const pool = await getPool(expandedSeasons);
    // expandedSeasons が空 = 「全期間モード」（年・季節とも未指定）。
    // この場合のみ作品単位で未来 season を除外する（年指定ありは expandSeasons 側で既に処理済み）。
    const excludeFuture = expandedSeasons.length === 0;
    const filtered = applyFilters(
      pool,
      popularity,
      highRated,
      media,
      popularityThreshold,
      excludeFuture,
    );
    const picked = shuffle(filtered).slice(0, count);
    return NextResponse.json({
      works: picked,
      total: filtered.length,
      poolSize: pool.length,
    });
  } catch (error) {
    // graphql-request の ClientError はクエリ全文やレスポンス JSON を message に含むため、
    // そのままクライアントへ返すと内部構造が露出する。詳細はサーバーログにのみ残し、
    // クライアントには汎用メッセージを返す（page.tsx がこの error をそのまま表示する）。
    console.error("GET /api/anime failed:", error);
    if (error instanceof AnnictRateLimitError) {
      // Annict のレート制限。待てば解消するので 502 ではなく 429 で返し、
      // 分かる場合は Retry-After も透過してクライアントが待ち時間を判断できるようにする。
      return NextResponse.json(
        { error: "Annict が混み合っています。少し待ってからお試しください" },
        {
          status: 429,
          headers:
            error.retryAfterSeconds != null
              ? { "Retry-After": String(error.retryAfterSeconds) }
              : undefined,
        },
      );
    }
    const isConfigError =
      error instanceof Error && error.message.includes("ANNICT_TOKEN");
    return NextResponse.json(
      {
        error: isConfigError
          ? "サーバーの設定に問題があります"
          : "アニメ情報の取得に失敗しました。時間をおいてお試しください",
      },
      { status: isConfigError ? 500 : 502 },
    );
  }
}
