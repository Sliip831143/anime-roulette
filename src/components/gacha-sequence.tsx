"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnnictWork } from "@/lib/annict";
import { getRarity, type Rarity } from "@/lib/rarity";

type Phase =
  | "intro_1"
  | "intro_2"
  | "slam"
  | "cards"
  | "reveal_fly"
  | "reveal_burst"
  | "reveal_kb_v"
  | "reveal_kb_h"
  | "reveal_info"
  | "closing"
  | "done";

const CARD_IMG: Record<Rarity, string> = {
  r1: "/gacha/card_1.png",
  r2: "/gacha/card_2.png",
  r3: "/gacha/card_3.png",
};

const RARITY_STAR: Record<Rarity, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};

const SEASON_LABEL_MAP: Record<NonNullable<AnnictWork["seasonName"]>, string> = {
  WINTER: "冬",
  SPRING: "春",
  SUMMER: "夏",
  AUTUMN: "秋",
};

const MEDIA_LABEL_MAP: Record<NonNullable<AnnictWork["media"]>, string> = {
  TV: "TV",
  OVA: "OVA",
  MOVIE: "映画",
  WEB: "Web",
  OTHER: "その他",
};

function formatYearSeason(work: AnnictWork): string {
  const parts: string[] = [];
  if (work.seasonYear != null) parts.push(`${work.seasonYear}年`);
  if (work.seasonName) parts.push(SEASON_LABEL_MAP[work.seasonName]);
  return parts.join(" ") || "情報なし";
}


function formatSatisfaction(rate: number | null): string | null {
  if (rate == null) return null;
  const percent = rate <= 1 ? rate * 100 : rate;
  return `満足度${percent.toFixed(1)}%`;
}

type Props = {
  works: AnnictWork[];
  onClose: () => void;
};

export function GachaSequence({ works, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("intro_1");
  const [revealIndex, setRevealIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // revealIndex が進むたびに画像エラー状態をリセットし、次の画像を preload して有効性を確認
  useEffect(() => {
    setImageError(false);
    const url = works[revealIndex]?.image?.recommendedImageUrl;
    if (!url) return;
    const probe = new Image();
    probe.onerror = () => setImageError(true);
    probe.src = url;
  }, [revealIndex, works]);

  const advance = useCallback(() => {
    if (phase === "cards") {
      setPhase("reveal_fly");
    } else if (phase === "reveal_info") {
      if (revealIndex + 1 >= works.length) {
        setPhase("closing");
      } else {
        setRevealIndex(revealIndex + 1);
        setPhase("reveal_fly");
      }
    }
  }, [phase, revealIndex, works.length]);

  // フェーズタイマー（自動進行フェーズのみ）
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    switch (phase) {
      case "intro_1":
        t = setTimeout(() => setPhase("intro_2"), 1000);
        break;
      case "intro_2":
        t = setTimeout(() => setPhase("slam"), 750);
        break;
      case "slam":
        t = setTimeout(() => setPhase("cards"), 600);
        break;
      case "reveal_fly":
        t = setTimeout(() => setPhase("reveal_burst"), 550);
        break;
      case "reveal_burst":
        t = setTimeout(() => {
          const work = works[revealIndex];
          if (!work) {
            setPhase("done");
            return;
          }
          const r = getRarity(work.watchersCount, work.satisfactionRate);
          if (r === "r3" && work.image?.recommendedImageUrl && !imageError) {
            setPhase("reveal_kb_v");
          } else {
            setPhase("reveal_info");
          }
        }, 300);
        break;
      case "reveal_kb_v":
        t = setTimeout(() => setPhase("reveal_kb_h"), 1500);
        break;
      case "reveal_kb_h":
        t = setTimeout(() => setPhase("reveal_info"), 1500);
        break;
      case "closing":
        t = setTimeout(() => setPhase("done"), 600);
        break;
      case "done":
        onClose();
        break;
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [phase, revealIndex, works, onClose, imageError]);

  // キー入力で進行
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPhase("closing");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advance]);

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(".gacha-skip")) return;
    if (target.closest("a")) return;
    advance();
  };

  if (phase === "done") return null;

  const currentWork = works[revealIndex];
  const currentRarity = currentWork
    ? getRarity(currentWork.watchersCount, currentWork.satisfactionRate)
    : null;
  const showFlyCard =
    (phase === "reveal_fly" || phase === "reveal_burst") && currentRarity != null;

  return (
    <div
      className={`gacha-stage${phase === "closing" ? " is-closing" : ""}`}
      onClick={handleStageClick}
      role="dialog"
      aria-modal="true"
      aria-label="ガチャ演出"
    >
      <div className="gacha-rays" aria-hidden="true" />
      <div className="gacha-particles" aria-hidden="true" />

      <button
        type="button"
        className="gacha-skip"
        onClick={(e) => {
          e.stopPropagation();
          setPhase("closing");
        }}
        aria-label="演出をスキップ"
      >
        <span className="gacha-skip-inner">
          SKIP
          <span className="gacha-skip-chevron" aria-hidden="true">&gt;&gt;</span>
        </span>
      </button>

      {phase === "intro_1" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/gacha/arona_1.png"
          alt=""
          className="gacha-arona gacha-arona-1"
          aria-hidden="true"
        />
      )}

      {phase === "intro_2" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/gacha/arona_2.png"
          alt=""
          className="gacha-arona gacha-arona-2"
          aria-hidden="true"
        />
      )}

      {phase === "slam" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gacha/arona_2.png"
            alt=""
            className="gacha-arona gacha-arona-slam"
            aria-hidden="true"
          />
          <span className="gacha-flash" aria-hidden="true" />
          <span className="gacha-shockwave" aria-hidden="true" />
        </>
      )}

      {phase === "cards" && (
        <>
          <div
            className={`gacha-cards-row${works.length >= 6 ? " is-wrap" : ""}`}
          >
            {works.map((w, i) => {
              const r = getRarity(w.watchersCount, w.satisfactionRate);
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={CARD_IMG[r]}
                  alt=""
                  className="gacha-card-back idle"
                  data-rarity={r}
                  style={{ ["--i" as string]: String(i) } as React.CSSProperties}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <div className="gacha-hint">クリック / Enter で開始</div>
        </>
      )}

      {showFlyCard && currentRarity && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CARD_IMG[currentRarity]}
          alt=""
          className="gacha-fly-card"
          aria-hidden="true"
        />
      )}

      {phase === "reveal_burst" && (
        <span className="gacha-white-flash" aria-hidden="true" />
      )}

      {(phase === "reveal_info" || phase === "reveal_kb_v") && (
        <span className="gacha-white-fade" aria-hidden="true" />
      )}

      {(phase === "reveal_kb_v" || phase === "reveal_kb_h") &&
        currentWork?.image?.recommendedImageUrl &&
        !imageError && (
          <div
            className={
              phase === "reveal_kb_v"
                ? "gacha-kenburns kb-vertical"
                : "gacha-kenburns kb-horizontal"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentWork.image.recommendedImageUrl}
              alt={currentWork.title}
              onError={() => {
                setImageError(true);
                setPhase("reveal_info");
              }}
            />
          </div>
        )}

      {phase === "reveal_info" && currentWork && currentRarity && (
        <>
          <div className="gacha-info" data-rarity={currentRarity}>
           <div className="gacha-info-inner">
            {currentWork.image?.recommendedImageUrl && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentWork.image.recommendedImageUrl}
                alt={currentWork.title}
                className="gacha-info-bg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="gacha-info-bg gacha-info-bg-empty"
                aria-label="画像なし"
              >
                <svg
                  className="gacha-info-bg-empty-icon"
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
                <span className="gacha-info-bg-empty-label">NO IMAGE</span>
                <span className="gacha-info-bg-empty-sub">
                  visual unavailable
                </span>
              </div>
            )}

            <span className="gacha-info-progress">
              {revealIndex + 1} / {works.length}
            </span>

            <aside className="gacha-info-paper" aria-label="作品情報">
              <div className="gacha-info-paper-header">ANIME ARCHIVE</div>
              <div className="gacha-info-paper-rows">
                <div className="gacha-info-paper-row">
                  <div className="gacha-info-paper-label">放送年</div>
                  <div className="gacha-info-paper-value">
                    {formatYearSeason(currentWork)}
                  </div>
                </div>
                <div className="gacha-info-paper-row">
                  <div className="gacha-info-paper-label">メディア</div>
                  <div className="gacha-info-paper-value">
                    {currentWork.media
                      ? MEDIA_LABEL_MAP[currentWork.media]
                      : "情報なし"}
                  </div>
                </div>
                <div className="gacha-info-paper-row">
                  <div className="gacha-info-paper-label">視聴登録</div>
                  <div className="gacha-info-paper-value">
                    {currentWork.watchersCount.toLocaleString()}人
                  </div>
                </div>
                {formatSatisfaction(currentWork.satisfactionRate) && (
                  <div className="gacha-info-paper-row">
                    <div className="gacha-info-paper-label">満足度</div>
                    <div className="gacha-info-paper-value gacha-info-paper-value-emph">
                      {formatSatisfaction(currentWork.satisfactionRate)?.replace(
                        "満足度",
                        "",
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <div className="gacha-info-titlebar">
              <div className="gacha-info-titlebar-header">
                <span
                  className="gacha-info-titlebar-rarity"
                  aria-label={`レアリティ${RARITY_STAR[currentRarity]}`}
                >
                  {RARITY_STAR[currentRarity]}
                </span>
                <h3 className="gacha-info-titlebar-title">
                  {currentWork.title}
                </h3>
              </div>
              <div className="gacha-info-titlebar-message">
                <a
                  href={`https://annict.com/works/${currentWork.annictId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Annictで見る
                </a>
                {currentWork.officialSiteUrl && (
                  <>
                    <span className="gacha-info-titlebar-divider">/</span>
                    <a
                      href={currentWork.officialSiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      公式サイト
                    </a>
                  </>
                )}
              </div>
            </div>
           </div>
          </div>
          <div className="gacha-hint">
            {revealIndex + 1 < works.length
              ? "クリック / Enter で次へ"
              : "クリック / Enter で結果一覧へ"}
          </div>
        </>
      )}
    </div>
  );
}
