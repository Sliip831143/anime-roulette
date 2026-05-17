import type { Rarity } from "@/lib/rarity";

export type ShareTarget = {
  annictId: number;
  title: string;
  rarity: Rarity;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anime-roulette-inky.vercel.app";

const STARS: Record<Rarity, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};

export function buildShareUrl(target: ShareTarget): string {
  const params = new URLSearchParams({
    id: String(target.annictId),
    title: target.title,
    rarity: target.rarity,
  });
  return `${SITE_URL}/share?${params.toString()}`;
}

export function buildTweetIntent(target: ShareTarget): string {
  const stars = STARS[target.rarity];
  const text = `「${target.title}」(${stars}) が出ました ✨`;
  const params = new URLSearchParams({
    text,
    url: buildShareUrl(target),
    hashtags: "アニメルーレット",
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function openTweetIntent(target: ShareTarget): void {
  window.open(buildTweetIntent(target), "_blank", "noopener,noreferrer");
}
