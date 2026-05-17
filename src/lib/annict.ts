import { GraphQLClient, gql } from "graphql-request";

const ANNICT_ENDPOINT = "https://api.annict.com/graphql";

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
    headers: { Authorization: `Bearer ${token}` },
  });
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

  const data = await getClient().request<SearchWorksResponse>(
    SEARCH_WORKS_QUERY,
    variables,
  );
  return data.searchWorks;
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
  const data = await getClient().request<WorkDetailResponse>(
    WORK_DETAIL_QUERY,
    { annictIds: [annictId] },
  );
  const raw = data.searchWorks.nodes[0];
  if (!raw) return null;
  // connection 形式 ({ nodes: [...] }) を配列に平坦化
  return {
    ...raw,
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
