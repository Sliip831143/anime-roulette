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
