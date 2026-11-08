"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X as XIcon } from "lucide-react";
import { XLogo } from "@/components/x-logo";
import { useFocusTrap } from "@/components/use-focus-trap";
import type { AnnictWorkDetail } from "@/lib/annict";
import { formatSatisfaction, formatSeasonMedia } from "@/lib/format";
import { getRarity } from "@/lib/rarity";
import { safeHttpUrl } from "@/lib/safe-url";
import { openTweetIntent } from "@/lib/share";
import { StatusButtons } from "@/components/status-buttons";
import { FavoriteButton } from "@/components/favorite-button";
import type { CollectionStatus } from "@/lib/collection";

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
  status?: CollectionStatus;
  onStatusChange?: (next: CollectionStatus) => void;
  favorite?: boolean;
  onFavoriteChange?: (on: boolean) => void;
  onClose: () => void;
};

export function AnimeDetailDialog({
  annictId,
  initial,
  status = "none",
  onStatusChange,
  favorite = false,
  onFavoriteChange,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<AnnictWorkDetail | null>(null);
  // 初期値を true にして effect 内では set しない（annictId はマウント中変わらない前提）
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // プレビュー表示中は本体側のトラップを止め、トラップが同時に 2 つ動かないようにする
  // プレビューは画像があるときだけ存在する。画像の読み込み失敗でプレビューが消えた後も previewOpen が
  // 残ると、本体側のトラップが止まったまま（Tab で背後へ抜ける・Esc が 1 回効かない）になるため、
  // 「表示中」で判定する
  const hasImage = !!detail?.image?.recommendedImageUrl && !imageFailed;
  const previewVisible = previewOpen && hasImage;
  useFocusTrap(panelRef, !previewVisible);
  useFocusTrap(previewRef, previewVisible);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/anime/${annictId}`)
      .then(async (res) => {
        // Vercel の関数タイムアウト (504) 等は text/plain で返るため、JSON として読めなければ null にする
        // （そのまま res.json() すると "Unexpected token" の例外文が画面に出る）
        let data: { error?: unknown; work?: AnnictWorkDetail } | null = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        return { ok: res.ok, status: res.status, data };
      })
      .then(({ ok, status, data }) => {
        if (cancelled) return;
        if (!ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : status === 504
                ? "サーバが混雑しています。少し待ってからもう一度開いてください"
                : `詳細の取得に失敗しました（HTTP ${status}）`,
          );
        } else if (data?.work) {
          setDetail(data.work);
        } else {
          setError("詳細の取得に失敗しました");
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

  // プレビュー表示中は Esc でプレビューのみ閉じる（ダイアログは閉じない）。
  // capture フェーズ + stopPropagation で上のダイアログ用ハンドラより先に処理する。
  useEffect(() => {
    if (!previewVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [previewVisible]);

  const work = detail;
  const rarity = getRarity(initial.watchersCount, initial.satisfactionRate);
  const annictUrl = `https://annict.com/works/${annictId}`;
  // Annict 由来の URL は javascript: 等の危険スキーム混入に備えて無害化してから使う
  const officialSiteUrl = safeHttpUrl(work?.officialSiteUrl);
  const wikipediaUrl = safeHttpUrl(work?.wikipediaUrl);

  // SSR ガード（document が無い環境ではレンダーしない）
  if (typeof document === "undefined") return null;

  // 親要素のスタッキングコンテキスト（animation や transform を持つ親）の影響で
  // fixed が viewport 基準にならないため、Portal で body 直下にレンダリング
  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${initial.title} の詳細`}
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
        onClick={onClose}
      >
        <div
          ref={panelRef}
          className="relative w-full max-w-2xl rounded-[6px] bg-card shadow-xl"
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
                  <div className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-[6px] bg-muted sm:w-36">
                    {hasImage ? (
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="group block h-full w-full cursor-pointer"
                        aria-label={`${work.title} の画像を拡大表示`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={work.image!.recommendedImageUrl!}
                          alt={work.title}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                          onError={() => setImageFailed(true)}
                        />
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">放送</dt>
                    <dd>{formatSeasonMedia(work)}</dd>
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
                  {officialSiteUrl && (
                    <a
                      href={officialSiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      公式サイト
                    </a>
                  )}
                  {wikipediaUrl && (
                    <a
                      href={wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Wikipedia
                    </a>
                  )}
                  {work.twitterUsername && (
                    <a
                      href={`https://x.com/${encodeURIComponent(work.twitterUsername)}`}
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
                  {/* 視聴状態・お気に入り・シェアは操作系としてまとめ、行末の同一グループに置く */}
                  <span className="ml-auto inline-flex items-center gap-4">
                    {onStatusChange && (
                      <StatusButtons
                        status={status}
                        onChange={onStatusChange}
                      />
                    )}
                    {status === "watched" && onFavoriteChange && (
                      <FavoriteButton
                        favorite={favorite}
                        onChange={onFavoriteChange}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        openTweetIntent({ annictId, title: work.title, rarity })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-primary"
                      aria-label={`「${work.title}」を X でシェア`}
                    >
                      <XLogo className="size-3" />
                      シェア
                    </button>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {previewVisible && (
        <div
          ref={previewRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${work?.title ?? initial.title} の画像プレビュー`}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 sm:p-8"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-3 top-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white/90 hover:bg-black/60 hover:text-white"
            aria-label="プレビューを閉じる"
          >
            <XIcon className="size-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={work!.image!.recommendedImageUrl!}
            alt={work?.title ?? initial.title}
            className="max-h-full max-w-full cursor-default object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>,
    document.body,
  );
}
