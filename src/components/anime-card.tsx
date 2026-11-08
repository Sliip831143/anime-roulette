"use client";

import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { AnnictWork } from "@/lib/annict";
import { formatSatisfaction, formatSeasonMedia } from "@/lib/format";
import { getRarity, RARITY_LEVEL, RARITY_STARS } from "@/lib/rarity";
import { AnimeDetailDialog } from "@/components/anime-detail-dialog";
import { NoImageIcon } from "@/components/no-image-icon";
import { StatusButtons } from "@/components/status-buttons";
import { FavoriteButton } from "@/components/favorite-button";
import type { CollectionStatus } from "@/lib/collection";
import { isInteractiveElementClick } from "@/lib/utils";

/**
 * 結果カード。キーボード・支援技術向けの「詳細を開く」操作はタイトルの
 * 実 button に集約し、カード全体には冗長なマウス用 onClick だけを付ける
 * （カード自体を role="button" にすると内側の StatusButtons が
 * ARIA 的に無効化されるため）。内側の button/a 起点のクリックは無視する。
 * 状態トグル時に結果の全カードが再レンダーされないよう memo 化している
 * （onStatusChange は annictId を受ける安定コールバック前提）。
 */
export const AnimeCard = memo(function AnimeCard({
  work,
  status = "none",
  onStatusChange,
  favorite = false,
  onFavoriteChange,
}: {
  work: AnnictWork;
  status?: CollectionStatus;
  onStatusChange?: (annictId: number, next: CollectionStatus) => void;
  favorite?: boolean;
  onFavoriteChange?: (annictId: number, on: boolean) => void;
}) {
  const rarity = getRarity(work.watchersCount, work.satisfactionRate);
  const satisfaction = formatSatisfaction(work.satisfactionRate);
  const [imageError, setImageError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasImage = !!work.image?.recommendedImageUrl && !imageError;
  // お気に入りは「観た」作品にだけ付く印。状態ボタンが出ないカードでは出さない
  const showFavorite = status === "watched" && !!onFavoriteChange;
  const favoriteButton = (className: string) =>
    showFavorite ? (
      <FavoriteButton
        className={className}
        favorite={favorite}
        onChange={(on) => onFavoriteChange!(work.annictId, on)}
      />
    ) : null;

  const openFromCardClick = (e: React.MouseEvent) => {
    if (isInteractiveElementClick(e)) return;
    setDialogOpen(true);
  };

  const titleButton = (className: string) => (
    <button
      type="button"
      onClick={() => setDialogOpen(true)}
      aria-label={`「${work.title}」の詳細を見る`}
      className={`cursor-pointer text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${className}`}
    >
      {work.title}
    </button>
  );

  const card = (
    <Card
      id={`work-${work.annictId}`}
      onClick={openFromCardClick}
      className="gacha-card cursor-pointer overflow-hidden p-0 scroll-mt-4"
      data-rarity={rarity}
    >
      <div className="gacha-card-titlebar">
        <span className="gacha-card-rarity">
          <span aria-hidden>{RARITY_STARS[rarity]}</span>
          <span className="sr-only">レアリティ{RARITY_LEVEL[rarity]}</span>
        </span>
        <h3 className="gacha-card-title">
          {titleButton("rounded-sm")}
        </h3>
        {favoriteButton("absolute right-3 top-1/2 -translate-y-1/2")}
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
          <div className="gacha-card-image gacha-card-image-empty">
            <NoImageIcon />
            <span>NO IMAGE</span>
          </div>
        )}
        <div className="gacha-card-rows">
          <div className="gacha-card-row">
            <div className="gacha-card-label">放送</div>
            <div className="gacha-card-value">{formatSeasonMedia(work)}</div>
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
      {onStatusChange && (
        <div className="flex items-center justify-end border-t border-[oklch(0.85_0.04_250/0.4)] bg-[oklch(0.97_0.02_230/0.55)] px-4 py-1.5">
          <StatusButtons
            status={status}
            onChange={(next) => onStatusChange(work.annictId, next)}
          />
        </div>
      )}
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
          status={status}
          onStatusChange={
            onStatusChange
              ? (next) => onStatusChange(work.annictId, next)
              : undefined
          }
          favorite={favorite}
          onFavoriteChange={
            onFavoriteChange
              ? (on) => onFavoriteChange(work.annictId, on)
              : undefined
          }
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
});
