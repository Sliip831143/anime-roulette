import type { AnnictWork } from "@/lib/annict";

/**
 * 開発用ガチャ演出テスト fixture。
 *
 * 「★3（虹）かつサムネイルあり」の演出（reveal_kb_v / reveal_kb_h の
 * Ken Burns フェーズ）は実データだと出現頻度が低く確認しづらいため、
 * URL に `?gachatest=1` を付けてアクセスしたときだけ、この固定モックで
 * ガチャ演出を即起動できるようにしている（page.tsx 側で参照）。
 *
 * - 本番ビルドでは page.tsx 側の NODE_ENV ガードにより読み込まれない。
 * - watchersCount を ★3 閾値（22,000）より十分高くしてあるので getRarity() は必ず "r3"。
 * - 画像は picsum.photos の固定 seed を使い、毎回同じ絵が出るので
 *   アニメーションのイテレーション間で見た目を比較しやすい。
 */
export const GACHA_TEST_WORKS: AnnictWork[] = [
  {
    annictId: 999001,
    title: "テスト作品 ★3 ケンバーンズ確認用 A",
    seasonYear: 2024,
    seasonName: "SPRING",
    media: "TV",
    watchersCount: 48000,
    reviewsCount: 1200,
    satisfactionRate: 92,
    officialSiteUrl: "https://example.com/",
    twitterHashtag: null,
    image: {
      recommendedImageUrl: "https://picsum.photos/seed/gacha-kv-a/1280/720",
    },
  },
  {
    annictId: 999002,
    title: "テスト作品 ★3 ケンバーンズ確認用 B",
    seasonYear: 2023,
    seasonName: "AUTUMN",
    media: "MOVIE",
    watchersCount: 31000,
    reviewsCount: 800,
    satisfactionRate: 88,
    officialSiteUrl: null,
    twitterHashtag: null,
    image: {
      recommendedImageUrl: "https://picsum.photos/seed/gacha-kv-b/1280/720",
    },
  },
];
