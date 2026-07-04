import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";

const RARITY_STARS: Record<string, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};

// title は外部から任意指定できるクエリのため、OG 画像側（/api/og）と同じ 40 文字で
// 打ち切り、なりすまし的な長文の埋め込みを防ぐ。id は Annict の作品 ID なので数値のみ許可。
const MAX_TITLE_LENGTH = 40;

function sanitizeTitle(raw: string | undefined): string {
  const title = raw?.trim() || "次に観るアニメ";
  return title.length > MAX_TITLE_LENGTH
    ? title.slice(0, MAX_TITLE_LENGTH - 1) + "…"
    : title;
}

function sanitizeRarity(raw: string | undefined): string {
  return raw === "r2" || raw === "r3" ? raw : "r1";
}

function sanitizeId(raw: string | undefined): string | null {
  return raw && /^\d+$/.test(raw) ? raw : null;
}

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
  const safeTitle = sanitizeTitle(title);
  const safeRarity = sanitizeRarity(rarity);
  const stars = RARITY_STARS[safeRarity];
  const description = `アニメルーレットで「${safeTitle}」(${stars}) が出ました！`;
  const ogImage = buildOgUrl(safeTitle, safeRarity);

  return {
    // layout.tsx の title template（"%s | アニメルーレット"）がサフィックスを付けるため、
    // ここではタイトル本体のみを渡す（手動で付けると二重になる）
    title: safeTitle,
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
  const safeTitle = sanitizeTitle(title);
  const safeRarity = sanitizeRarity(rarity);
  const stars = RARITY_STARS[safeRarity];
  const safeId = sanitizeId(id);
  const annictUrl = safeId ? `https://annict.com/works/${safeId}` : null;

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
