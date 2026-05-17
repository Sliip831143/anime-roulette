"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { AnnictWork } from "@/lib/annict";
import { getRarity, RARITY_STARS } from "@/lib/rarity";
import { AnimeDetailDialog } from "@/components/anime-detail-dialog";

const SEASON_LABEL: Record<NonNullable<AnnictWork["seasonName"]>, string> = {
  WINTER: "冬",
  SPRING: "春",
  SUMMER: "夏",
  AUTUMN: "秋",
};

const MEDIA_LABEL: Record<NonNullable<AnnictWork["media"]>, string> = {
  TV: "TV",
  OVA: "OVA",
  MOVIE: "映画",
  WEB: "Web",
  OTHER: "その他",
};

function formatSeason(work: AnnictWork): string {
  const parts: string[] = [];
  if (work.seasonYear != null) parts.push(`${work.seasonYear}年`);
  if (work.seasonName) parts.push(SEASON_LABEL[work.seasonName]);
  if (work.media) parts.push(MEDIA_LABEL[work.media]);
  return parts.join(" / ") || "情報なし";
}

function formatSatisfaction(rate: number | null): string | null {
  if (rate == null) return null;
  const percent = rate <= 1 ? rate * 100 : rate;
  return `${percent.toFixed(1)}%`;
}

export function AnimeCard({
  work,
  gachaMode = true,
}: {
  work: AnnictWork;
  gachaMode?: boolean;
}) {
  const rarity = getRarity(work.watchersCount, work.satisfactionRate);
  const satisfaction = formatSatisfaction(work.satisfactionRate);
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasImage = !!work.image?.recommendedImageUrl && !imageError;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDialogOpen(true);
    }
  };

  const card = !gachaMode ? (
    <Card
      id={`work-${work.annictId}`}
      role="button"
      tabIndex={0}
      onClick={() => setDialogOpen(true)}
      onKeyDown={handleKey}
      aria-label={`「${work.title}」の詳細を見る`}
      className="cursor-pointer overflow-hidden p-0 scroll-mt-4 transition-shadow focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex gap-4 p-4">
        <div className="shrink-0 w-24 h-36 rounded-md overflow-hidden bg-muted">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.image!.recommendedImageUrl!}
              alt={work.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <svg
                viewBox="0 0 64 64"
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="8" y="12" width="48" height="40" rx="3" />
                <circle cx="22" cy="26" r="4" />
                <path d="M8 44 L24 30 L36 40 L48 28 L56 36" />
              </svg>
              <span className="text-[10px]">No image</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h3 className="font-semibold leading-snug line-clamp-2">
            {work.title}
          </h3>
          <p className="text-sm text-muted-foreground">{formatSeason(work)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>視聴登録 {work.watchersCount.toLocaleString()}人</span>
            {satisfaction && <span>満足度 {satisfaction}</span>}
          </div>
          <p className="mt-auto text-xs text-muted-foreground">
            クリックで詳細を表示
          </p>
        </div>
      </div>
    </Card>
  ) : (
    <Card
      id={`work-${work.annictId}`}
      role="button"
      tabIndex={0}
      onClick={() => setDialogOpen(true)}
      onKeyDown={handleKey}
      aria-label={`「${work.title}」の詳細を見る`}
      className="gacha-card cursor-pointer overflow-hidden p-0 scroll-mt-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      data-rarity={rarity}
    >
      <div className="gacha-card-titlebar">
        <span
          className="gacha-card-rarity"
          aria-label={`レアリティ${RARITY_STARS[rarity]}`}
        >
          {RARITY_STARS[rarity]}
        </span>
        <h3 className="gacha-card-title">{work.title}</h3>
      </div>
      <CardContent className="gacha-card-body p-0">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.image!.recommendedImageUrl!}
            alt={work.title}
            className="gacha-card-image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="gacha-card-image gacha-card-image-empty"
            aria-label="画像なし"
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="8" y="12" width="48" height="40" rx="3" />
              <circle cx="22" cy="26" r="4" />
              <path d="M8 44 L24 30 L36 40 L48 28 L56 36" />
            </svg>
            <span>NO IMAGE</span>
          </div>
        )}
        <div className="gacha-card-rows">
          <div className="gacha-card-row">
            <div className="gacha-card-label">放送</div>
            <div className="gacha-card-value">{formatSeason(work)}</div>
          </div>
          <div className="gacha-card-row">
            <div className="gacha-card-label">視聴登録</div>
            <div className="gacha-card-value">
              {work.watchersCount.toLocaleString()}人
            </div>
          </div>
          {satisfaction && (
            <div className="gacha-card-row">
              <div className="gacha-card-label">満足度</div>
              <div className="gacha-card-value gacha-card-value-emph">
                {satisfaction}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <p className="border-t border-[oklch(0.85_0.04_250/0.4)] bg-[oklch(0.97_0.02_230/0.55)] px-4 py-1.5 text-center text-[10px] tracking-widest text-[oklch(0.5_0.04_250)]">
        クリックで詳細を表示
      </p>
    </Card>
  );

  return (
    <>
      {card}
      {dialogOpen && (
        <AnimeDetailDialog
          annictId={work.annictId}
          initial={{
            title: work.title,
            watchersCount: work.watchersCount,
            satisfactionRate: work.satisfactionRate,
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
