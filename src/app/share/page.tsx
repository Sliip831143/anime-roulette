import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://anime-roulette-inky.vercel.app";

const RARITY_STARS: Record<string, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};

type SearchParamsType = Promise<{
  title?: string;
  rarity?: string;
  id?: string;
}>;

function buildOgUrl(title: string, rarity: string): string {
  const params = new URLSearchParams({ title, rarity });
  return `${SITE_URL}/api/og?${params.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParamsType;
}): Promise<Metadata> {
  const { title, rarity } = await searchParams;
  const safeTitle = title?.trim() || "次に観るアニメ";
  const safeRarity = rarity === "r2" || rarity === "r3" ? rarity : "r1";
  const stars = RARITY_STARS[safeRarity];
  const description = `アニメルーレットで「${safeTitle}」(${stars}) が出ました！`;
  const ogImage = buildOgUrl(safeTitle, safeRarity);

  return {
    title: `${safeTitle} | アニメルーレット`,
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
  const { title, rarity, id } = await searchParams;
  const safeTitle = title?.trim() || "次に観るアニメ";
  const safeRarity = rarity === "r2" || rarity === "r3" ? rarity : "r1";
  const stars = RARITY_STARS[safeRarity];
  const annictUrl = id ? `https://annict.com/works/${id}` : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <p className="text-sm font-medium tracking-widest text-muted-foreground">
        ANIME ROULETTE
      </p>
      <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
        「{safeTitle}」が出ました
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
