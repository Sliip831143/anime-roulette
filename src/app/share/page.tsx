import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getWorkSummary, type AnnictWorkSummary } from "@/lib/annict";
import { getRarity, RARITY_STARS, type Rarity } from "@/lib/rarity";
import { SITE_URL } from "@/lib/site";

// タイトルは URL クエリから受け取らず、id から Annict の実タイトルを取得する
// （任意文言のなりすましシェアページ対策）。レアリティも実データから判定する。
// 表示上の打ち切り長は OG 画像側（/api/og）と揃える。
const MAX_TITLE_LENGTH = 40;
const FALLBACK_TITLE = "次に観るアニメ";

function truncateTitle(title: string): string {
  return title.length > MAX_TITLE_LENGTH
    ? title.slice(0, MAX_TITLE_LENGTH - 1) + "…"
    : title;
}

function parseId(raw: string | undefined): number | null {
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}

// generateMetadata とページ本体の双方から呼ばれるため、React の cache() で
// 同一リクエスト内の Annict 取得を 1 回にまとめる。取得失敗時は null（既定表示）。
const getCachedSummary = cache(
  async (annictId: number): Promise<AnnictWorkSummary | null> => {
    try {
      return await getWorkSummary(annictId);
    } catch (error) {
      console.error(`share: getWorkSummary(${annictId}) failed:`, error);
      return null;
    }
  },
);

type SearchParamsType = Promise<{
  id?: string;
}>;

type ShareData = {
  title: string;
  rarity: Rarity;
  annictId: number | null;
};

async function loadShareData(
  searchParams: SearchParamsType,
): Promise<ShareData> {
  const { id } = await searchParams;
  const annictId = parseId(id);
  const summary = annictId != null ? await getCachedSummary(annictId) : null;
  if (!summary) {
    return { title: FALLBACK_TITLE, rarity: "r1", annictId: null };
  }
  return {
    title: truncateTitle(summary.title),
    rarity: getRarity(summary.watchersCount, summary.satisfactionRate),
    annictId: summary.annictId,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParamsType;
}): Promise<Metadata> {
  const { title, rarity, annictId } = await loadShareData(searchParams);
  const stars = RARITY_STARS[rarity];
  const description = `アニメルーレットで「${title}」(${stars}) が出ました！`;
  const ogImage =
    annictId != null
      ? `${SITE_URL}/api/og?id=${annictId}`
      : `${SITE_URL}/api/og`;

  return {
    // layout.tsx の title template（"%s | アニメルーレット"）がサフィックスを付けるため、
    // ここではタイトル本体のみを渡す（手動で付けると二重になる）
    title,
    description,
    openGraph: {
      title: description,
      description: "次に観るアニメをガチャ演出で楽しく抽選するルーレットアプリ",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: description }],
    },
    twitter: {
      card: "summary_large_image",
      title: description,
      description: "次に観るアニメをガチャ演出で楽しく抽選するルーレットアプリ",
      images: [ogImage],
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParamsType;
}) {
  const { title, rarity, annictId } = await loadShareData(searchParams);
  const stars = RARITY_STARS[rarity];
  const annictUrl =
    annictId != null ? `https://annict.com/works/${annictId}` : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <p className="text-sm font-medium tracking-widest text-muted-foreground">
        ANIME ROULETTE
      </p>
      <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
        「{title}」が出ました
      </h1>
      <p
        className="text-2xl font-bold"
        aria-label={`レアリティ${stars}`}
      >
        {stars}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          自分もガチャを引く
        </Link>
        {annictUrl && (
          <a
            href={annictUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Annict で詳細を見る
          </a>
        )}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        アニメルーレットは Annict のアニメデータベースから条件付きでランダム抽選する
        Web アプリです（ログイン不要・無料）。
      </p>
    </main>
  );
}
