import { GraphQLClient, gql, type Variables } from "graphql-request";
import { withRateLimitRetry } from "./annict-rate-limit";
import { SITE_URL } from "./site";

const ANNICT_ENDPOINT = "https://api.annict.com/graphql";

// Annict の開発者向けヘルプは、負荷が高くなったときに遮断の前に連絡できるよう
// User-Agent にアプリ名と連絡先（サイト URL 等）を入れることを推奨している。
const ANNICT_USER_AGENT = `anime-roulette (+${SITE_URL}; https://github.com/Sliip831143/anime-roulette)`;

// 429 を受けたとき、この時間内に再試行できるなら待つ。Route Handler の maxDuration（40s）の
// 中で 13 ページの逐次取得を完走させる必要があるため、長い待ちは諦めて 429 を返す方を選ぶ。
const RATE_LIMIT_MAX_WAIT_MS = 10_000;

// 検索フィルタで選択可能なメディア種別。
// OTHER は Annict 側のラベルとしてデータ上は存在するが、選択肢には出さない。
export const MEDIA_VALUES = ["TV", "OVA", "MOVIE", "WEB"] as const;
export type Media = (typeof MEDIA_VALUES)[number];

export type AnnictWork = {
  annictId: number;
  title: string;
  seasonYear: number | null;
  seasonName: "WINTER" | "SPRING" | "SUMMER" | "AUTUMN" | null;
  media: "TV" | "OVA" | "MOVIE" | "WEB" | "OTHER" | null;
  watchersCount: number;
  reviewsCount: number;
  satisfactionRate: number | null;
  officialSiteUrl: string | null;
  twitterHashtag: string | null;
  image: {
    recommendedImageUrl: string | null;
  } | null;
};

type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};

type SearchWorksResponse = {
  searchWorks: {
    nodes: AnnictWork[];
    pageInfo: PageInfo;
  };
};

const SEARCH_WORKS_QUERY = gql`
  query SearchWorks($seasons: [String!], $first: Int!, $after: String) {
    searchWorks(
      seasons: $seasons
      orderBy: { field: WATCHERS_COUNT, direction: DESC }
      first: $first
      after: $after
    ) {
      nodes {
        annictId
        title
        seasonYear
        seasonName
        media
        watchersCount
        reviewsCount
        satisfactionRate
        officialSiteUrl
        twitterHashtag
        image {
          recommendedImageUrl
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

function getClient(): GraphQLClient {
  const token = process.env.ANNICT_TOKEN;
  if (!token) {
    throw new Error("ANNICT_TOKEN is not configured");
  }
  return new GraphQLClient(ANNICT_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": ANNICT_USER_AGENT,
    },
  });
}

function requestAnnict<T>(query: string, variables: Variables): Promise<T> {
  return withRateLimitRetry(() => getClient().request<T>(query, variables), {
    maxWaitMs: RATE_LIMIT_MAX_WAIT_MS,
  });
}

// Annict は一部の作品画像 URL を http:// で返してくるため、Mixed Content
// 警告を防ぐためアプリ側で https に揃える（HTTPS 化に失敗するケースは
// 既存の <img onError> で NO IMAGE にフォールバックされる）
function ensureHttps(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://");
}

function normalizeWorkImage<T extends AnnictWork>(w: T): T {
  if (!w.image) return w;
  return {
    ...w,
    image: {
      ...w.image,
      recommendedImageUrl: ensureHttps(w.image.recommendedImageUrl),
    },
  };
}

export type SearchAnimeWorksInput = {
  seasons: string[];
  first: number;
  after?: string | null;
};

async function searchAnimeWorksPage({
  seasons,
  first,
  after,
}: SearchAnimeWorksInput): Promise<{
  nodes: AnnictWork[];
  pageInfo: PageInfo;
}> {
  const variables: {
    first: number;
    seasons?: string[];
    after?: string | null;
  } = { first };
  if (seasons.length > 0) variables.seasons = seasons;
  if (after) variables.after = after;

  const data = await requestAnnict<SearchWorksResponse>(
    SEARCH_WORKS_QUERY,
    variables,
  );
  return {
    nodes: data.searchWorks.nodes.map(normalizeWorkImage),
    pageInfo: data.searchWorks.pageInfo,
  };
}

export async function searchAnimeWorks(
  input: SearchAnimeWorksInput,
): Promise<AnnictWork[]> {
  const result = await searchAnimeWorksPage(input);
  return result.nodes;
}

export type SearchAnimeWorksPaginatedInput = {
  seasons: string[];
  perPage: number;
  pages: number;
};

// ====== サマリ取得（/share・/api/og 用）======
// シェアページと OG 画像はタイトルを URL クエリから受け取らず、id から実データを引く
// （任意文言のなりすましページ／画像生成への対策）。レアリティ判定に必要な
// watchersCount / satisfactionRate も併せて返す。

export type AnnictWorkSummary = {
  annictId: number;
  title: string;
  watchersCount: number;
  satisfactionRate: number | null;
};

const WORK_SUMMARY_QUERY = gql`
  query GetWorkSummary($annictIds: [Int!]) {
    searchWorks(annictIds: $annictIds, first: 1) {
      nodes {
        annictId
        title
        watchersCount
        satisfactionRate
      }
    }
  }
`;

export async function getWorkSummary(
  annictId: number,
): Promise<AnnictWorkSummary | null> {
  const data = await requestAnnict<{
    searchWorks: { nodes: AnnictWorkSummary[] };
  }>(WORK_SUMMARY_QUERY, { annictIds: [annictId] });
  return data.searchWorks.nodes[0] ?? null;
}

// ====== 詳細取得（クリックで開く詳細ダイアログ用）======

export type AnnictEpisode = {
  numberText: string | null;
  title: string | null;
};

export type AnnictCast = {
  // Cast.name はキャラ役名（character が紐付いていれば character.name と同等のことが多い）
  name: string | null;
  character: { name: string } | null;
  person: { name: string } | null;
};

export type AnnictStaff = {
  name: string | null;
  roleText: string | null;
};

export type AnnictProgram = {
  startedAt: string | null;
  channel: { name: string } | null;
};

export type AnnictWorkDetail = AnnictWork & {
  titleEn: string | null;
  titleKana: string | null;
  episodesCount: number;
  twitterUsername: string | null;
  wikipediaUrl: string | null;
  episodes: AnnictEpisode[];
  casts: AnnictCast[];
  staffs: AnnictStaff[];
  programs: AnnictProgram[];
};

// Annict Work には organizations / ratingsCount フィールドが無いので含めない。
// 制作スタジオは staffs（roleText: "アニメーション制作" 等）から拾う想定。
const WORK_DETAIL_QUERY = gql`
  query GetWorkDetail($annictIds: [Int!]) {
    searchWorks(annictIds: $annictIds, first: 1) {
      nodes {
        annictId
        title
        titleEn
        titleKana
        seasonYear
        seasonName
        media
        watchersCount
        reviewsCount
        satisfactionRate
        officialSiteUrl
        twitterHashtag
        twitterUsername
        wikipediaUrl
        episodesCount
        image {
          recommendedImageUrl
        }
        episodes(first: 50, orderBy: { field: SORT_NUMBER, direction: ASC }) {
          nodes {
            numberText
            title
          }
        }
        casts(first: 30) {
          nodes {
            name
            character {
              name
            }
            person {
              name
            }
          }
        }
        staffs(first: 30) {
          nodes {
            name
            roleText
          }
        }
        programs(first: 5) {
          nodes {
            startedAt
            channel {
              name
            }
          }
        }
      }
    }
  }
`;

type WorkDetailResponse = {
  searchWorks: {
    nodes: Array<
      AnnictWorkDetail & {
        episodes: { nodes: AnnictEpisode[] };
        casts: { nodes: AnnictCast[] };
        staffs: { nodes: AnnictStaff[] };
        programs: { nodes: AnnictProgram[] };
      }
    >;
  };
};

export async function getWorkDetail(
  annictId: number,
): Promise<AnnictWorkDetail | null> {
  const data = await requestAnnict<WorkDetailResponse>(WORK_DETAIL_QUERY, {
    annictIds: [annictId],
  });
  const raw = data.searchWorks.nodes[0];
  if (!raw) return null;
  // connection 形式 ({ nodes: [...] }) を配列に平坦化 + 画像 URL を https 化
  const normalized = normalizeWorkImage(raw);
  return {
    ...normalized,
    episodes: raw.episodes?.nodes ?? [],
    casts: raw.casts?.nodes ?? [],
    staffs: raw.staffs?.nodes ?? [],
    programs: raw.programs?.nodes ?? [],
  };
}

/**
 * after カーソルを逐次進めて最大 `pages` 回フェッチし、結合した nodes を返す。
 * 途中で hasNextPage が false になったら早期終了する。
 */
export async function searchAnimeWorksPaginated({
  seasons,
  perPage,
  pages,
}: SearchAnimeWorksPaginatedInput): Promise<AnnictWork[]> {
  const all: AnnictWork[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < pages; i++) {
    const { nodes, pageInfo } = await searchAnimeWorksPage({
      seasons,
      first: perPage,
      after: cursor,
    });
    all.push(...nodes);
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
    if (cursor == null) break;
  }

  return all;
}
