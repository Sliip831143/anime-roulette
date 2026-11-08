"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AnimeDetailDialog } from "@/components/anime-detail-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoImageIcon } from "@/components/no-image-icon";
import { StatusButtons } from "@/components/status-buttons";
import { FavoriteButton } from "@/components/favorite-button";
import {
  clearStatus,
  emptyCollection,
  statsOf,
  type CollectionEntry,
  type CollectionStatus,
} from "@/lib/collection";
import { useCollection } from "@/lib/use-collection";
import { RARITY_LEVEL, RARITY_STARS, type Rarity } from "@/lib/rarity";
import { isInteractiveElementClick } from "@/lib/utils";

type Filter =
  "all" | Rarity | "watched" | "later" | "not_interested" | "favorite";
type Sort = "newest" | "oldest" | "rarity";

const FILTERS: { value: Filter; label: string; ariaLabel?: string }[] = [
  { value: "all", label: "すべて" },
  { value: "r3", label: "★★★", ariaLabel: "レアリティ3" },
  { value: "r2", label: "★★", ariaLabel: "レアリティ2" },
  { value: "r1", label: "★", ariaLabel: "レアリティ1" },
  { value: "watched", label: "観た" },
  { value: "later", label: "後で観る" },
  { value: "not_interested", label: "興味なし" },
  { value: "favorite", label: "お気に入り" },
];

const RARITY_ORDER: Record<Rarity, number> = { r3: 0, r2: 1, r1: 2 };

// 無限スクロールの 1 回あたりの表示件数。グリッド列数（2/3/4）の公倍数にして
// 途中ロード時に行が欠けないようにする
const PAGE_SIZE = 24;

// ガチャモード時の星の色。ガチャ結果カード（.gacha-card-rarity）と同じ色にしている
// （★1・★2=金、★3=虹グラデーション）。白地とのコントラストは
// WCAG 基準を大きく下回るが、レアリティ情報は sr-only テキストで補完している。
// 白地に溶けないよう、同系色を暗くした細い輪郭線を付ける（★3 は塗りが透明なので細く淡い紫）。
const GACHA_STAR_CLASS: Record<Rarity, string> = {
  r1: "text-[oklch(0.88_0.18_90)] [-webkit-text-stroke:1px_oklch(0.6_0.12_75/0.85)] [paint-order:stroke_fill]",
  r2: "text-[oklch(0.88_0.18_85)] [-webkit-text-stroke:1px_oklch(0.6_0.12_75/0.85)] [paint-order:stroke_fill]",
  r3: "bg-[linear-gradient(135deg,oklch(0.78_0.22_25),oklch(0.85_0.18_85),oklch(0.78_0.2_145),oklch(0.72_0.22_290))] bg-clip-text text-transparent [-webkit-text-stroke:0.6px_oklch(0.55_0.12_300/0.6)]",
};

export function CollectionView() {
  const { collection, setCollection, loaded, markStatus, markFavorite } =
    useCollection();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [openEntry, setOpenEntry] = useState<CollectionEntry | null>(null);
  // リセット確認ダイアログの表示対象（null = 非表示）
  const [pendingConfirm, setPendingConfirm] = useState<
    "reset-watched" | "reset-collection" | null
  >(null);
  // 無限スクロール：描画する件数（データは全件メモリ上にあり、描画だけ間引く）
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 状態トグルでカードが消えた際のフォーカス退避先（現在のフィルタチップ）を探すために参照する
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stats = useMemo(() => statsOf(collection), [collection]);

  const visibleEntries = useMemo(() => {
    const entries = Object.values(collection.entries).filter((e) => {
      if (filter === "all") return true;
      if (filter === "watched") return e.status === "watched";
      if (filter === "later") return e.status === "later";
      if (filter === "not_interested") return e.status === "not_interested";
      if (filter === "favorite") return e.favorite;
      return e.rarity === filter;
    });
    entries.sort((a, b) => {
      if (sort === "newest") return b.firstDrawnAt - a.firstDrawnAt;
      if (sort === "oldest") return a.firstDrawnAt - b.firstDrawnAt;
      return (
        RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] ||
        b.firstDrawnAt - a.firstDrawnAt
      );
    });
    return entries;
  }, [collection, filter, sort]);

  const shownEntries = visibleEntries.slice(0, visibleCount);
  const hasMore = visibleCount < visibleEntries.length;

  // 末尾の番兵が見えたら次のページ分を描画する。rootMargin で少し手前から先読み
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  };

  const changeSort = (next: Sort) => {
    setSort(next);
    setVisibleCount(PAGE_SIZE);
  };

  const handleOpen = useCallback((entry: CollectionEntry) => {
    setOpenEntry(entry);
  }, []);

  const handleStatusChange = useCallback(
    (annictId: number, next: CollectionStatus) => {
      const known = markStatus(annictId, next);
      if (next !== "none" && known) {
        toast.info("以後の抽選から除外します");
      }
    },
    [markStatus],
  );

  // お気に入りは抽選に影響しないのでトーストは出さない
  const handleFavoriteChange = useCallback(
    (annictId: number, on: boolean) => {
      markFavorite(annictId, on);
    },
    [markFavorite],
  );

  // 状態・お気に入りのフィルタ表示中にカードが消えた場合の退避先。
  // フォーカスしていたボタンごと DOM から外れてフォーカスが body に落ちる
  // （キーボード・SR 利用者が現在地を見失う）ため、描画後も行き先が無い場合のみ
  // 現在のフィルタチップへ移す。
  const focusCurrentChipIfLost = () => {
    requestAnimationFrame(() => {
      if (document.activeElement !== document.body) return;
      chipsRef.current
        ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
        ?.focus();
    });
  };

  // グリッド上のカードからのトグル専用。フィルタ表示中はトグルで該当カードが即座に消える。
  // ダイアログ内のトグルはダイアログが開いたままなので対象外（handleStatusChange を直接使う）。
  // 閉じた時点でカードが消えているケースは、ダイアログの onClose 側で退避する。
  const handleGridStatusChange = useCallback(
    (annictId: number, next: CollectionStatus) => {
      const removesCard =
        (filter === "watched" && next !== "watched") ||
        (filter === "later" && next !== "later") ||
        (filter === "not_interested" && next !== "not_interested") ||
        // お気に入りは watched 以外へ切り替えた時点で外れるためカードも消える
        (filter === "favorite" && next !== "watched");
      handleStatusChange(annictId, next);
      if (removesCard) focusCurrentChipIfLost();
    },
    [filter, handleStatusChange],
  );

  const handleGridFavoriteChange = useCallback(
    (annictId: number, on: boolean) => {
      handleFavoriteChange(annictId, on);
      if (filter === "favorite" && !on) focusCurrentChipIfLost();
    },
    [filter, handleFavoriteChange],
  );

  const handleResetWatched = () => {
    if (stats.watched === 0) return;
    setPendingConfirm("reset-watched");
  };

  // ひさびさに使うユーザー向け：「観た」を一括で抽選対象に戻す。
  // 「興味なし」は恒久的な意思表示とみなし一括対象外（個別解除のみ）。
  const confirmResetWatched = () => {
    setCollection((prev) => clearStatus(prev, "watched"));
    setPendingConfirm(null);
    // 「観た」が 0 件になるとこのボタン自体が消え、確認ダイアログからのフォーカス復帰先が無くなる
    focusCurrentChipIfLost();
    toast.success("「観た」をすべて抽選対象に戻しました");
  };

  const handleResetCollection = () => {
    if (stats.totalDraws === 0) return;
    setPendingConfirm("reset-collection");
  };

  const confirmResetCollection = () => {
    setCollection(emptyCollection());
    setVisibleCount(PAGE_SIZE);
    setPendingConfirm(null);
    focusCurrentChipIfLost();
    toast.success("図鑑をリセットしました");
  };

  // 下余白 pb-20（lg 未満のみ）は、右下固定の「トップへ戻る」ボタンが
  // 最下部カードの視聴状態ボタンに重ならないようにするための確保分
  return (
    <div
      className="flex flex-col flex-1 items-center px-4 py-5 pb-20 sm:py-8 sm:pb-20 lg:pb-8"
      style={!loaded ? { visibility: "hidden" } : undefined}
    >
      <main
        className={`w-full max-w-3xl space-y-4 sm:space-y-6${loaded ? " page-fade-in" : ""}`}
      >
        <header className="space-y-4">
          {/* 左右を同じ 1fr にして、左の「トップへ」の幅に関係なく見出しをページ中央に置く */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 justify-self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
              トップへ
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">図鑑</h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
            <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">収集</dt>
                <dd className="text-lg font-bold">{stats.unique}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className={GACHA_STAR_CLASS.r3}>
                  <span aria-hidden>★★★</span>
                  <span className="sr-only">レアリティ3</span>
                </dt>
                <dd className="font-semibold">{stats.byRarity.r3}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className={GACHA_STAR_CLASS.r2}>
                  <span aria-hidden>★★</span>
                  <span className="sr-only">レアリティ2</span>
                </dt>
                <dd className="font-semibold">{stats.byRarity.r2}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className={GACHA_STAR_CLASS.r1}>
                  <span aria-hidden>★</span>
                  <span className="sr-only">レアリティ1</span>
                </dt>
                <dd className="font-semibold">{stats.byRarity.r1}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">観た</dt>
                <dd className="font-semibold">{stats.watched}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">お気に入り</dt>
                <dd className="font-semibold">{stats.favorite}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">通算</dt>
                <dd className="font-semibold">{stats.totalDraws} 連</dd>
              </div>
            </dl>
            {stats.totalDraws > 0 && (
              <button
                type="button"
                onClick={handleResetCollection}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" aria-hidden />
                図鑑をリセット
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {/* チップ群は折り返さず 1 行を維持し、幅が足りない画面では横スクロールさせる */}
          <div
            ref={chipsRef}
            className="flex max-w-full items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => changeFilter(f.value)}
                aria-pressed={filter === f.value}
                aria-label={f.ariaLabel}
                className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label
            htmlFor="collection-sort"
            className="ml-auto text-xs text-muted-foreground"
          >
            並び順
          </label>
          <select
            id="collection-sort"
            value={sort}
            onChange={(e) => changeSort(e.target.value as Sort)}
            className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="rarity">レアリティ順</option>
          </select>
          {filter === "watched" && stats.watched > 0 && (
            <button
              type="button"
              onClick={handleResetWatched}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden />
              観たを一括で抽選対象に戻す
            </button>
          )}
        </div>

        {visibleEntries.length === 0 ? (
          <div className="space-y-3 rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {stats.unique === 0
                ? "まだ図鑑に作品がありません。ガチャを引くと自動で記録されます。"
                : "この条件に合う作品はありません。"}
            </p>
            {stats.unique === 0 && (
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                ガチャを引きに行く
              </Link>
            )}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {shownEntries.map((entry) => (
                <li key={entry.annictId}>
                  <CollectionCard
                    entry={entry}
                    onOpen={handleOpen}
                    onStatusChange={handleGridStatusChange}
                    onFavoriteChange={handleGridFavoriteChange}
                  />
                </li>
              ))}
            </ul>
            {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
            {!hasMore && visibleEntries.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground">
                すべて表示しました（{visibleEntries.length} 件）
              </p>
            )}
          </>
        )}

        {/* 無限スクロールの進行をスクリーンリーダーへ通知する */}
        <p aria-live="polite" className="sr-only">
          {visibleEntries.length === 0
            ? "該当する作品はありません"
            : `${visibleEntries.length} 件中 ${shownEntries.length} 件を表示中`}
        </p>
      </main>

      {openEntry && (
        <AnimeDetailDialog
          annictId={openEntry.annictId}
          initial={{
            title: openEntry.title,
            watchersCount: openEntry.watchersCount,
            satisfactionRate: openEntry.satisfactionRate,
          }}
          status={
            collection.entries[String(openEntry.annictId)]?.status ?? "none"
          }
          favorite={
            collection.entries[String(openEntry.annictId)]?.favorite ?? false
          }
          onFavoriteChange={(on) =>
            handleFavoriteChange(openEntry.annictId, on)
          }
          onStatusChange={(next) =>
            handleStatusChange(openEntry.annictId, next)
          }
          onClose={() => {
            setOpenEntry(null);
            // ダイアログ内で状態を変えてフィルタ対象から外れたカードは、閉じた時点で消えている
            focusCurrentChipIfLost();
          }}
        />
      )}
      {pendingConfirm === "reset-watched" && (
        <ConfirmDialog
          title="観たを抽選対象に戻す"
          description={
            <>
              <p>
                「観た」{stats.watched}{" "}
                件をすべて抽選対象に戻します。よろしいですか？
              </p>
              <p>図鑑の記録は消えません。お気に入りの印も外れます。</p>
            </>
          }
          confirmLabel="すべて戻す"
          onConfirm={confirmResetWatched}
          onClose={() => setPendingConfirm(null)}
        />
      )}
      {pendingConfirm === "reset-collection" && (
        <ConfirmDialog
          title="図鑑をリセット"
          description={
            <>
              <p>
                図鑑の記録 {stats.unique}{" "}
                件と通算回数をすべて削除します。よろしいですか？
              </p>
              <p>
                視聴状態やお気に入りの設定も消え、すべて抽選対象に戻ります。
                この操作は取り消せません。
              </p>
            </>
          }
          confirmLabel="リセットする"
          destructive
          onConfirm={confirmResetCollection}
          onClose={() => setPendingConfirm(null)}
        />
      )}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="scroll-top-btn"
          aria-label="ページトップへ戻る"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * 図鑑のカード 1 枚。キーボード・支援技術向けの「詳細を開く」操作はタイトルの
 * 実 button に集約し、カード全体には冗長なマウス用 onClick だけを付ける
 * （カード自体を role="button" にすると内側の StatusButtons が
 * ARIA 的に無効化されるため）。内側の button 起点のクリックは無視する。
 * 画像の読み込み失敗はエントリごとに保持し、結果カードと同じ
 * No image 表示（.gacha-card-image-empty 相当）に切り替える。
 * 状態トグル時に表示中の全カードが再レンダーされないよう memo 化している。
 */
const CollectionCard = memo(function CollectionCard({
  entry,
  onOpen,
  onStatusChange,
  onFavoriteChange,
}: {
  entry: CollectionEntry;
  onOpen: (entry: CollectionEntry) => void;
  onStatusChange: (annictId: number, next: CollectionStatus) => void;
  onFavoriteChange: (annictId: number, on: boolean) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const hasImage = !!entry.imageUrl && !imageError;

  const openFromCardClick = (e: React.MouseEvent) => {
    if (isInteractiveElementClick(e)) return;
    onOpen(entry);
  };

  return (
    <div
      onClick={openFromCardClick}
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.imageUrl!}
            alt={entry.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 border border-dashed border-[oklch(0.7_0.06_250/0.45)] bg-[linear-gradient(135deg,oklch(0.96_0.03_230),oklch(0.97_0.02_290))] font-mono text-[9px] tracking-[0.18em] text-[oklch(0.5_0.06_250)]">
            <NoImageIcon className="h-9 w-9 text-[oklch(0.62_0.06_250/0.7)]" />
            <span>NO IMAGE</span>
          </div>
        )}
        {entry.status === "watched" && (
          <FavoriteButton
            className="absolute top-1.5 right-1.5"
            favorite={entry.favorite}
            onChange={(on) => onFavoriteChange(entry.annictId, on)}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="flex items-center justify-between gap-1 text-xs">
          <span className={GACHA_STAR_CLASS[entry.rarity]}>
            <span aria-hidden>{RARITY_STARS[entry.rarity]}</span>
            <span className="sr-only">
              レアリティ{RARITY_LEVEL[entry.rarity]}
            </span>
          </span>
          {entry.drawCount > 1 && (
            <span className="text-muted-foreground">×{entry.drawCount}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpen(entry)}
          aria-label={`「${entry.title}」の詳細を見る`}
          className="line-clamp-2 cursor-pointer rounded-sm text-left text-xs font-medium leading-snug focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {entry.title}
        </button>
        <div className="mt-auto pt-1">
          <StatusButtons
            status={entry.status}
            onChange={(next) => onStatusChange(entry.annictId, next)}
          />
        </div>
      </div>
    </div>
  );
});
