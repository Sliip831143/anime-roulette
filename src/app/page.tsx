"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SearchForm, type SearchParams } from "@/components/search-form";
import { AnimeCard } from "@/components/anime-card";
import { GachaSequence } from "@/components/gacha-sequence";
import { usePeriodicCheer } from "@/components/use-periodic-cheer";
import { BookMarked, Heart } from "lucide-react";
import { XLogo } from "@/components/x-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { openBatchTweetIntent } from "@/lib/share";
import type { AnnictWork } from "@/lib/annict";
import { getRarity, RARITY_STARS } from "@/lib/rarity";
import {
  excludedIdsOf,
  pickAfterExclusion,
  recordDraws,
  type CollectionStatus,
} from "@/lib/collection";
import { useCollection } from "@/lib/use-collection";
import {
  ANIM_DISABLED_KEY,
  DEBUG_MODE_KEY,
  DEFAULT_POPULAR_THRESHOLD,
  EXTENDED_COUNT_KEY,
  MODE_STORAGE_KEY,
  POPULAR_THRESHOLD_KEY,
  SEASON_VISIBLE_KEY,
  SETTINGS_CHANGED_EVENT,
  readSettings,
  safeSetItem,
} from "@/lib/settings";

// 立ち絵の表示中、この間隔ごとに立ち絵が跳ねて吹き出しを出す（操作の有無に関係なく繰り返す）
const MASCOT_CHEER_INTERVAL_MS = 20_000;
// 演出の状態を保つ時間。globals.css の mascot-hop / mascot-bubble（3s）より短くすること
// （アニメーションが先に終わると、跳ねる動きと吹き出しが最初から繰り返されてしまう）
const MASCOT_CHEER_MS = 2_600;

export default function Home() {
  const [results, setResults] = useState<AnnictWork[] | null>(null);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [pendingWorks, setPendingWorks] = useState<AnnictWork[] | null>(null);
  // 結果カードを表示した状態から引き直したか。演出中は結果を一旦空にするため、
  // これがないと演出の裏と終了フェード中に立ち絵が一瞬出てしまう
  const [redrawing, setRedrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastCount, setLastCount] = useState(5);
  const [gachaMode, setGachaMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [seasonVisible, setSeasonVisible] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [animDisabled, setAnimDisabled] = useState(false);
  const [extendedCount, setExtendedCount] = useState(false);
  const [popularThreshold, setPopularThreshold] = useState(
    DEFAULT_POPULAR_THRESHOLD,
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);
  // 結果 0 件時に恒常表示する文言の出し分け（トーストは消えても理由が残るように）
  const [emptyReason, setEmptyReason] = useState<"no-match" | "excluded">(
    "no-match",
  );
  const { collection, setCollection, collectionRef, markStatus, markFavorite } =
    useCollection();
  const debugModeRef = useRef(false);
  const animDisabledRef = useRef(false);
  const gachaModeRef = useRef(true);
  const popularThresholdRef = useRef(DEFAULT_POPULAR_THRESHOLD);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  useEffect(() => {
    animDisabledRef.current = animDisabled;
  }, [animDisabled]);

  useEffect(() => {
    gachaModeRef.current = gachaMode;
  }, [gachaMode]);

  useEffect(() => {
    popularThresholdRef.current = popularThreshold;
  }, [popularThreshold]);

  useEffect(() => {
    if (resultsVersion === 0) return;
    const el = resultsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior: "smooth" });
  }, [resultsVersion]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showResultsPanel, setShowResultsPanel] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // オフライン検知：起動時にオフラインなら一度通知、復帰時にも通知
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("オフラインです。ネットワーク接続を確認してください");
    }
    const handleOnline = () => toast.success("オンラインに戻りました");
    const handleOffline = () =>
      toast.error("オフラインになりました。接続を確認してください");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const scrollToWork = (id: number) => {
    document
      .getElementById(`work-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // 図鑑（collection）の読み込み・保存・再読込は useCollection が担う
  const applyStoredSettings = useCallback(() => {
    const s = readSettings();
    setGachaMode(s.gachaMode);
    setSeasonVisible(s.seasonVisible);
    setDebugMode(s.debugMode);
    setAnimDisabled(s.animDisabled);
    setExtendedCount(s.extendedCount);
    setPopularThreshold(s.popularThreshold);
  }, []);

  useEffect(() => {
    // localStorage はクライアント限定なので、ハイドレーション直後に effect で読み込んで
    // state へ反映する必要がある（典型的なハイドレーション例外）。
    /* eslint-disable react-hooks/set-state-in-effect */
    applyStoredSettings();
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [applyStoredSettings]);

  // 隠しコマンド（ConsoleCmd）が localStorage を書き換えたら state へ反映する
  useEffect(() => {
    window.addEventListener(SETTINGS_CHANGED_EVENT, applyStoredSettings);
    return () =>
      window.removeEventListener(SETTINGS_CHANGED_EVENT, applyStoredSettings);
  }, [applyStoredSettings]);

  // 開発用：?gachatest=1 でモック★3作品のガチャ演出を即起動する。
  // 「★3かつサムネイルあり」の Ken Burns 演出は実データだと出現頻度が低く
  // 確認しづらいため、検索を飛ばしてリロードだけで再実行できるようにしている。
  // 本番ビルドでは NODE_ENV ガードにより fixture ごと読み込まれない。
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gachatest") !== "1") return;
    let cancelled = false;
    import("@/lib/gacha-test-fixture").then(({ GACHA_TEST_WORKS }) => {
      if (cancelled) return;
      setResults(null);
      setPendingWorks(GACHA_TEST_WORKS);
      console.log(
        "%c[gachatest] モック★3作品でガチャ演出を起動しました",
        "color:#7aa;font-weight:700",
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // mounted 前は初期値（gacha）のままなので書き込まない。
    // ここで書くと localStorage の保存値を上書きし、直後の読み込みが誤った値を拾う
    if (!mounted) return;
    document.documentElement.dataset.mode = gachaMode ? "gacha" : "simple";
    safeSetItem(MODE_STORAGE_KEY, gachaMode ? "gacha" : "simple");
  }, [gachaMode, mounted]);

  // ★3 が出やすい条件（超人気のみ／高評価のみ）を選んでいる間と、★3 を含む結果を表示している間は、
  // ガチャモードのページ背景を★3演出と同じピンク系に切り替える
  const [rareFilterActive, setRareFilterActive] = useState(false);
  const hasR3Result =
    results?.some(
      (w) => getRarity(w.watchersCount, w.satisfactionRate) === "r3",
    ) ?? false;
  const rainbowBg = gachaMode && (rareFilterActive || hasR3Result);
  const mascotVisible =
    gachaMode &&
    (results == null || results.length === 0) &&
    !(redrawing && (loading || pendingWorks != null));
  // 一定間隔で立ち絵が跳ねて吹き出しを出す
  const mascotCheering = usePeriodicCheer(
    mascotVisible,
    MASCOT_CHEER_INTERVAL_MS,
    MASCOT_CHEER_MS,
  );

  useEffect(() => {
    if (rainbowBg) {
      document.documentElement.dataset.gachaBg = "rainbow";
    } else {
      delete document.documentElement.dataset.gachaBg;
    }
  }, [rainbowBg]);

  useEffect(() => {
    if (!mounted) return;
    safeSetItem(SEASON_VISIBLE_KEY, seasonVisible ? "1" : "0");
  }, [seasonVisible, mounted]);

  useEffect(() => {
    if (!mounted) return;
    safeSetItem(DEBUG_MODE_KEY, debugMode ? "1" : "0");
  }, [debugMode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    safeSetItem(ANIM_DISABLED_KEY, animDisabled ? "1" : "0");
  }, [animDisabled, mounted]);

  useEffect(() => {
    if (!mounted) return;
    safeSetItem(EXTENDED_COUNT_KEY, extendedCount ? "1" : "0");
  }, [extendedCount, mounted]);

  useEffect(() => {
    if (!mounted) return;
    safeSetItem(POPULAR_THRESHOLD_KEY, String(popularThreshold));
  }, [popularThreshold, mounted]);

  const handleSubmit = async (params: SearchParams) => {
    setRedrawing(results != null && results.length > 0);
    setLoading(true);
    setLastCount(params.count);
    setLastParams(params);
    setLastError(null);
    const sp = new URLSearchParams();
    if (params.yearFrom != null) sp.set("yearFrom", String(params.yearFrom));
    if (params.yearTo != null) sp.set("yearTo", String(params.yearTo));
    for (const s of params.seasons) sp.append("seasons", s);
    // 除外後も指定件数を確保できるよう多めに取得する（API 上限 100）。
    // 除外リストはサーバーに送らず、受信後にクライアント側でフィルタする。
    const requestCount = Math.min(params.count * 3, 100);
    sp.set("count", String(requestCount));
    sp.set("popularity", params.popularity);
    if (
      params.popularity === "popular" &&
      popularThresholdRef.current !== DEFAULT_POPULAR_THRESHOLD
    ) {
      sp.set("popularityThreshold", String(popularThresholdRef.current));
    }
    sp.set("highRated", String(params.highRated));
    for (const m of params.media) sp.append("media", m);

    const url = `/api/anime?${sp.toString()}`;
    const debug = debugModeRef.current;
    if (debug) {
      console.group(
        "%c[debug] gacha submit",
        "color:#7aa;font-weight:700",
      );
      console.log("params:", params);
      console.log("url:", url);
    }

    try {
      const res = await fetch(url);
      if (debug) console.log(`status: ${res.status}`);
      if (!res.ok) {
        // Vercel の関数タイムアウト (504) 等は text/plain で本文を返すため、
        // JSON 前提でパースすると "Unexpected token" 例外がそのままユーザーに見える。
        // JSON ボディなら error フィールドを取り、それ以外は status コード別の既定文を出す。
        let serverMessage: string | null = null;
        try {
          const errBody = await res.json();
          if (typeof errBody?.error === "string") serverMessage = errBody.error;
          if (debug) console.log("error body (json):", errBody);
        } catch {
          if (debug) console.log("error body: (non-JSON)");
        }
        const fallback =
          res.status === 504
            ? "サーバが混雑しています。少し待って「もう一度引く」をお試しください"
            : `取得に失敗しました（HTTP ${res.status}）`;
        throw new Error(serverMessage ?? fallback);
      }
      const data = await res.json();
      if (debug) console.log("raw:", data);
      const works = data.works as AnnictWork[];

      const excluded = excludedIdsOf(collectionRef.current);
      const { picked, excludedCount } = pickAfterExclusion(
        works,
        excluded,
        params.count,
      );
      if (picked.length > 0) {
        setCollection((prev) => recordDraws(prev, picked));
      }
      if (excludedCount > 0 && picked.length < params.count) {
        // 多め取得してもなお不足した場合、原因が除外なのか
        // 「条件に合う作品自体が少ない」のかで文言を分ける
        toast.info(
          picked.length === 0
            ? "条件に合う作品はすべて除外中でした（図鑑から解除できます）"
            : works.length >= params.count
              ? `除外中の作品を除いたため ${picked.length} 件のみの表示になりました`
              : `条件に合う作品が少なく ${picked.length} 件のみの表示になりました`,
        );
      }

      if (debug && Array.isArray(works)) {
        console.group(`works (${works.length}件) — rarity 判定`);
        works.forEach((w) => {
          const r = getRarity(w.watchersCount, w.satisfactionRate);
          console.log(
            `  ${RARITY_STARS[r]}  ${w.title}  ` +
              `(watchers=${w.watchersCount}, sat=${w.satisfactionRate})`,
          );
        });
        console.groupEnd();
      }

      if (picked.length === 0) {
        setEmptyReason(excludedCount > 0 ? "excluded" : "no-match");
        setResults(picked);
        setResultsVersion((v) => v + 1);
        if (excludedCount === 0) {
          toast.info("条件に合うアニメが見つかりませんでした");
        }
      } else if (
        gachaModeRef.current &&
        !animDisabledRef.current &&
        picked.length <= 10
      ) {
        setResults(null);
        setPendingWorks(picked);
      } else {
        setResults(picked);
        setResultsVersion((v) => v + 1);
        setShowResultsPanel(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      if (debug) console.log("error:", e);
      toast.error(`エラー: ${msg}`);
      setResults(null);
      setLastError(msg);
    } finally {
      if (debug) console.groupEnd();
      setLoading(false);
    }
  };

  // memo 化した AnimeCard に渡すため useCallback で安定化する
  const handleStatusChange = useCallback(
    (annictId: number, next: CollectionStatus) => {
      const known = markStatus(annictId, next);
      if (next !== "none" && known) {
        toast.info("以後の抽選から除外します（図鑑から戻せます）");
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

  const handleSequenceClose = () => {
    if (pendingWorks) {
      setResults(pendingWorks);
      setResultsVersion((v) => v + 1);
      setShowResultsPanel(true);
    }
    setPendingWorks(null);
  };

  // 下余白 pb-20（lg 未満のみ）は、右下固定の「トップへ戻る」ボタンが
  // 最下部カードの視聴状態ボタンに重ならないようにするための確保分
  return (
    <div
      className="page-root flex flex-col flex-1 items-center px-4 py-5 pb-20 sm:py-8 sm:pb-20 lg:pb-8"
      style={!mounted ? { visibility: "hidden" } : undefined}
    >
      <main
        className={`w-full max-w-3xl space-y-4 sm:space-y-6${gachaMode ? " flex flex-1 flex-col" : ""}${mounted ? " page-fade-in" : ""}`}
      >
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            {gachaMode ? (
              <h1 className="gacha-hero">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="アニメルーレット"
                  className="gacha-hero-logo"
                />
              </h1>
            ) : (
              <h1 className="text-xl md:text-[1.375rem] font-semibold tracking-tight">
                アニメルーレット
              </h1>
            )}
            <div className="flex items-center gap-2">
              <Link
                href="/collection"
                aria-label={
                  mounted && Object.keys(collection.entries).length > 0
                    ? `図鑑（${Object.keys(collection.entries).length}件収集済み）`
                    : undefined
                }
                className="hidden items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                <BookMarked className="size-3.5" aria-hidden />
                図鑑
                {mounted && Object.keys(collection.entries).length > 0 && (
                  <span
                    aria-hidden
                    className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary"
                  >
                    {Object.keys(collection.entries).length}
                  </span>
                )}
              </Link>
              <div
                className="mode-toggle"
                role="group"
                aria-label="モード切り替え"
              >
                <button
                  type="button"
                  className={`mode-toggle-btn${!gachaMode ? " is-active" : ""}`}
                  onClick={() => setGachaMode(false)}
                  aria-pressed={!gachaMode}
                >
                  簡易
                </button>
                <button
                  type="button"
                  className={`mode-toggle-btn${gachaMode ? " is-active" : ""}`}
                  onClick={() => setGachaMode(true)}
                  aria-pressed={gachaMode}
                >
                  ガチャ
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className={gachaMode ? "gacha-form" : "simple-form"}>
          {gachaMode && (
            <div className="gacha-form-header">CONDITIONS</div>
          )}
          <SearchForm
            loading={loading}
            onSubmit={handleSubmit}
            submitLabel={gachaMode ? "ガチャを引く" : "候補を取得"}
            loadingLabel={gachaMode ? "Loading..." : "取得中..."}
            showSeason={seasonVisible}
            extendedCount={extendedCount}
            popularThreshold={popularThreshold}
            onRareFilterChange={setRareFilterActive}
          />
        </section>

        {lastError && !loading && (
          <section
            role="alert"
            aria-live="polite"
            className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4"
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-destructive">
                取得に失敗しました
              </p>
              <p className="text-xs text-muted-foreground break-all">
                {lastError}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!lastParams || loading}
              onClick={() => lastParams && handleSubmit(lastParams)}
            >
              もう一度引く
            </Button>
          </section>
        )}

        <Separator
          className={results != null ? "" : "hidden"}
        />

        <section
          ref={resultsRef}
          className={`space-y-4 scroll-mt-4${
            results != null ? "" : " hidden"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              className={
                gachaMode ? "gacha-title text-xl" : "text-xl font-semibold"
              }
            >
              結果
            </h2>
            {results && results.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openBatchTweetIntent(
                    results.map((w) => ({
                      title: w.title,
                      rarity: getRarity(w.watchersCount, w.satisfactionRate),
                    })),
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XLogo className="size-3" />
                結果をシェア
              </button>
            )}
          </div>
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: lastCount }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-md" />
              ))}
            </div>
          ) : results && results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyReason === "excluded" ? (
                <>
                  条件に合う作品はすべて除外中でした。
                  <Link
                    href="/collection"
                    className="text-primary hover:underline"
                  >
                    図鑑
                  </Link>
                  から解除できます。
                </>
              ) : (
                "条件に合うアニメが見つかりませんでした。"
              )}
            </p>
          ) : results && results.length > 0 ? (
            <div
              key={resultsVersion}
              className="grid gap-4 results-fade-in"
            >
              {results.map((work) => (
                <AnimeCard
                  key={work.annictId}
                  work={work}
                  gachaMode={gachaMode}
                  status={collection.entries[String(work.annictId)]?.status ?? "none"}
                  onStatusChange={handleStatusChange}
                  favorite={collection.entries[String(work.annictId)]?.favorite ?? false}
                  onFavoriteChange={handleFavoriteChange}
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* キャラ画像。ガチャ結果がない間（未抽選・0 件）だけ、フォームの下に残った高さを使って表示する。
            結果表示中からの引き直しでは、取得中〜演出終了まで出さない。
            クリックでブルーアーカイブ公式サイトを新しいタブで開く */}
        {mascotVisible && (
          <div className={`gacha-mascot${mascotCheering ? " is-cheering" : ""}`}>
            <a
              href="https://bluearchive.jp/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ブルーアーカイブ公式サイト（新しいタブで開く）"
            >
              <picture>
                <source srcSet="/gacha/arona_3.avif" type="image/avif" />
                <source srcSet="/gacha/arona_3.webp" type="image/webp" />
                <img
                  src="/gacha/arona_3.png"
                  alt=""
                  width={760}
                  height={981}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              {mascotCheering && (
                <span className="gacha-mascot-bubble" aria-hidden>
                  <Heart className="gacha-mascot-heart" />
                </span>
              )}
            </a>
          </div>
        )}
      </main>
      {pendingWorks && (
        <GachaSequence works={pendingWorks} onClose={handleSequenceClose} />
      )}
      {/* スマホ用（640px 未満）：ヘッダーから退避した図鑑リンク */}
      <Link
        href="/collection"
        className="collection-fab"
        aria-label={
          mounted && Object.keys(collection.entries).length > 0
            ? `図鑑（${Object.keys(collection.entries).length}件収集済み）`
            : "図鑑"
        }
      >
        <BookMarked aria-hidden />
        {mounted && Object.keys(collection.entries).length > 0 && (
          <span className="collection-fab-badge" aria-hidden>
            {Object.keys(collection.entries).length}
          </span>
        )}
      </Link>
      {results && results.length > 0 && showScrollTop && (
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
      {results && results.length > 0 && showResultsPanel && (
        <aside className="results-panel" aria-label="結果一覧">
          <header className="results-panel-header">
            <span>結果一覧</span>
            <button
              type="button"
              className="results-panel-close"
              onClick={() => setShowResultsPanel(false)}
              aria-label="結果一覧を閉じる"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>
          <ol className="results-panel-list">
            {results.map((work, i) => (
              <li key={work.annictId}>
                <button
                  type="button"
                  onClick={() => scrollToWork(work.annictId)}
                  title={work.title}
                >
                  <span className="results-panel-index">{i + 1}</span>
                  <span className="results-panel-title">{work.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
