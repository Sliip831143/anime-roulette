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

type SearchWorksResponse = {
  searchWorks: {
    nodes: AnnictWork[];
  };
};

const SEARCH_WORKS_QUERY = gql`
  query SearchWorks($seasons: [String!], $first: Int!) {
    searchWorks(
      seasons: $seasons
      orderBy: { field: WATCHERS_COUNT, direction: DESC }
      first: $first
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
};

export async function searchAnimeWorks({
  seasons,
  first,
}: SearchAnimeWorksInput): Promise<AnnictWork[]> {
  const variables: { first: number; seasons?: string[] } = { first };
  if (seasons.length > 0) variables.seasons = seasons;

  const data = await getClient().request<SearchWorksResponse>(
    SEARCH_WORKS_QUERY,
    variables,
  );
  return data.searchWorks.nodes;
}
