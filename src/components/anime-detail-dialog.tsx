"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X as XIcon, Share2 } from "lucide-react";
import type { AnnictWork, AnnictWorkDetail } from "@/lib/annict";
import { getRarity } from "@/lib/rarity";
import { openTweetIntent } from "@/lib/share";

const SEASON_LABEL: Record<
  NonNullable<AnnictWork["seasonName"]>,
  string
> = { WINTER: "冬", SPRING: "春", SUMMER: "夏", AUTUMN: "秋" };

const MEDIA_LABEL: Record<NonNullable<AnnictWork["media"]>, string> = {
  TV: "TV",
  OVA: "OVA",
  MOVIE: "映画",
  WEB: "Web",
  OTHER: "その他",
};

function formatSeason(work: AnnictWorkDetail): string {
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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  annictId: number;
  // 詳細取得前でも表示する初期情報（結果カードから渡す）
  initial: {
    title: string;
    watchersCount: number;
    satisfactionRate: number | null;
  };
  onClose: () => void;
};

export function AnimeDetailDialog({ annictId, initial, onClose }: Props) {
  const [detail, setDetail] = useState<AnnictWorkDetail | null>(null);
  // 初期値を true にして effect 内では set しない（annictId はマウント中変わらない前提）
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/anime/${annictId}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setError(data?.error ?? "詳細の取得に失敗しました");
        } else {
          setDetail(data.work as AnnictWorkDetail);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "不明なエラー");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [annictId]);

  // Esc キーで閉じる + body スクロールロック
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const work = detail;
  const rarity = getRarity(initial.watchersCount, initial.satisfactionRate);
  const hasImage = !!work?.image?.recommendedImageUrl;
  const annictUrl = `https://annict.com/works/${annictId}`;

  // SSR ガード（document が無い環境ではレンダーしない）
  if (typeof document === "undefined") return null;

  // 親要素のスタッキングコンテキスト（animation や transform を持つ親）の影響で
  // fixed が viewport 基準にならないため、Portal で body 直下にレンダリング
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${initial.title} の詳細`}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="閉じる"
        >
          <XIcon className="size-5" aria-hidden />
        </button>

        <div className="space-y-5 p-5 sm:p-8">
          <header className="space-y-1.5 pr-10">
            <h2 className="text-xl leading-snug font-semibold sm:text-2xl">
              {work?.title ?? initial.title}
            </h2>
            {(work?.titleKana || work?.titleEn) && (
              <p className="text-xs text-muted-foreground">
                {work?.titleKana}
                {work?.titleKana && work?.titleEn ? " / " : ""}
                {work?.titleEn}
              </p>
            )}
          </header>

          {loading && (
            <p className="text-sm text-muted-foreground">読み込み中…</p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              エラー: {error}
            </p>
          )}

          {work && (
            <>
              {/* メイン情報 + 画像 */}
              <div className="flex gap-4">
                <div className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-md bg-muted sm:w-36">
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={work.image!.recommendedImageUrl!}
                      alt={work.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">放送</dt>
                  <dd>{formatSeason(work)}</dd>
                  <dt className="text-muted-foreground">話数</dt>
                  <dd>
                    {work.episodesCount > 0
                      ? `${work.episodesCount}話`
                      : "情報なし"}
                  </dd>
                  <dt className="text-muted-foreground">視聴登録</dt>
                  <dd>{work.watchersCount.toLocaleString()}人</dd>
                  {formatSatisfaction(work.satisfactionRate) && (
                    <>
                      <dt className="text-muted-foreground">満足度</dt>
                      <dd>{formatSatisfaction(work.satisfactionRate)}</dd>
                    </>
                  )}
                  {work.reviewsCount > 0 && (
                    <>
                      <dt className="text-muted-foreground">レビュー</dt>
                      <dd>{work.reviewsCount.toLocaleString()}件</dd>
                    </>
                  )}
                </dl>
              </div>

              {work.programs.length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-semibold">放送局・配信</h3>
                  <ul className="space-y-1 text-sm">
                    {work.programs.slice(0, 5).map((p, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap gap-x-2 text-muted-foreground"
                      >
                        <span className="text-foreground">
                          {p.channel?.name ?? "不明"}
                        </span>
                        {formatDate(p.startedAt) && (
                          <span>開始: {formatDate(p.startedAt)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {work.staffs.length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-semibold">スタッフ</h3>
                  <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    {work.staffs.slice(0, 20).map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {s.roleText || "—"}
                        </span>
                        <span>{s.name ?? ""}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {work.casts.length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-semibold">キャスト</h3>
                  <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    {work.casts.slice(0, 20).map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {c.character?.name ?? c.name ?? "—"}
                        </span>
                        <span>{c.person?.name ?? ""}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {work.episodes.length > 0 && (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-semibold">
                    エピソード（{work.episodes.length}話）
                  </h3>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      展開して見る
                    </summary>
                    <ol className="mt-2 space-y-0.5">
                      {work.episodes.map((e, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 text-muted-foreground">
                            {e.numberText || `#${i + 1}`}
                          </span>
                          <span>{e.title || "(無題)"}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </section>
              )}

              {/* リンク + シェア */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-sm">
                <a
                  href={annictUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Annict で見る
                </a>
                {work.officialSiteUrl && (
                  <a
                    href={work.officialSiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    公式サイト
                  </a>
                )}
                {work.wikipediaUrl && (
                  <a
                    href={work.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Wikipedia
                  </a>
                )}
                {work.twitterUsername && (
                  <a
                    href={`https://x.com/${work.twitterUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    公式 X
                  </a>
                )}
                {work.twitterHashtag && (
                  <a
                    href={`https://x.com/search?q=${encodeURIComponent("#" + work.twitterHashtag)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    #{work.twitterHashtag}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    openTweetIntent({ annictId, title: work.title, rarity })
                  }
                  className="ml-auto inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-primary"
                  aria-label={`「${work.title}」を X でシェア`}
                >
                  <Share2 className="size-3.5" aria-hidden />
                  シェア
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
