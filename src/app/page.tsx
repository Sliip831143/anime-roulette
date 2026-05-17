"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SearchForm, type SearchParams } from "@/components/search-form";
import { AnimeCard } from "@/components/anime-card";
import { GachaSequence } from "@/components/gacha-sequence";
import { Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { openBatchTweetIntent } from "@/lib/share";
import type { AnnictWork } from "@/lib/annict";
import { getRarity, RARITY_STARS } from "@/lib/rarity";

const STORAGE_PREFIX = "anime-roulette-";
const MODE_STORAGE_KEY = `${STORAGE_PREFIX}mode`;
const SEASON_VISIBLE_KEY = `${STORAGE_PREFIX}season-visible`;
const DEBUG_MODE_KEY = `${STORAGE_PREFIX}debug`;
const ANIM_DISABLED_KEY = `${STORAGE_PREFIX}anim-disabled`;
const EXTENDED_COUNT_KEY = `${STORAGE_PREFIX}extended-count`;
const POPULAR_THRESHOLD_KEY = `${STORAGE_PREFIX}popular-threshold`;

const DEFAULT_POPULAR_THRESHOLD = 1000;

type CmdDef = { usage: string; desc: string };
const CMD_DEFS: CmdDef[] = [
  { usage: 'cmd("/help")', desc: "利用可能コマンド一覧を表示" },
  { usage: 'cmd("/state")', desc: "現在の各種設定を一覧表示" },
  {
    usage: 'cmd("/season"|"/season on"|"/season off")',
    desc: "季節フィルタの表示切替（デフォルト非表示）",
  },
  {
    usage: 'cmd("/debug"|"/debug on"|"/debug off")',
    desc: "APIリクエスト・レアリティ判定の詳細ログを切替",
  },
  {
    usage: 'cmd("/anim"|"/anim on"|"/anim off")',
    desc: "ガチャ演出のON/OFF切替（OFFで即結果表示）",
  },
  {
    usage: 'cmd("/max"|"/max on"|"/max off")',
    desc: "取得件数UIを切替（Slider 1〜10 ⇔ 数値入力 1〜50、ONで演出も自動OFF）",
  },
  {
    usage: 'cmd("/popularity tune <n>"|"/popularity reset")',
    desc: `「人気のみ」の視聴登録閾値をカスタマイズ（デフォルト${DEFAULT_POPULAR_THRESHOLD}）`,
  },
  {
    usage: 'cmd("/reset")',
    desc: "localStorageの全設定をクリアして初期状態へ",
  },
];

declare global {
  interface Window {
    cmd?: (input: string) => void;
  }
}

export default function Home() {
  const [results, setResults] = useState<AnnictWork[] | null>(null);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [pendingWorks, setPendingWorks] = useState<AnnictWork[] | null>(null);
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
  const debugModeRef = useRef(false);
  const animDisabledRef = useRef(false);
  const gachaModeRef = useRef(true);
  const seasonVisibleRef = useRef(false);
  const extendedCountRef = useRef(false);
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
    seasonVisibleRef.current = seasonVisible;
  }, [seasonVisible]);

  useEffect(() => {
    extendedCountRef.current = extendedCount;
  }, [extendedCount]);

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

  useEffect(() => {
    // localStorage はクライアント限定なので、ハイドレーション直後に effect で読み込んで
    // state へ反映する必要がある（典型的なハイドレーション例外）。
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "simple") setGachaMode(false);
    const storedSeason = localStorage.getItem(SEASON_VISIBLE_KEY);
    if (storedSeason === "1") setSeasonVisible(true);
    const storedDebug = localStorage.getItem(DEBUG_MODE_KEY);
    if (storedDebug === "1") setDebugMode(true);
    const storedAnim = localStorage.getItem(ANIM_DISABLED_KEY);
    if (storedAnim === "1") setAnimDisabled(true);
    const storedExtended = localStorage.getItem(EXTENDED_COUNT_KEY);
    if (storedExtended === "1") setExtendedCount(true);
    const storedPopular = Number(localStorage.getItem(POPULAR_THRESHOLD_KEY));
    if (Number.isInteger(storedPopular) && storedPopular >= 0) {
      setPopularThreshold(storedPopular);
    }
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mode = gachaMode ? "gacha" : "simple";
    localStorage.setItem(MODE_STORAGE_KEY, gachaMode ? "gacha" : "simple");
  }, [gachaMode]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(SEASON_VISIBLE_KEY, seasonVisible ? "1" : "0");
  }, [seasonVisible, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(DEBUG_MODE_KEY, debugMode ? "1" : "0");
  }, [debugMode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(ANIM_DISABLED_KEY, animDisabled ? "1" : "0");
  }, [animDisabled, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(EXTENDED_COUNT_KEY, extendedCount ? "1" : "0");
  }, [extendedCount, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(POPULAR_THRESHOLD_KEY, String(popularThreshold));
  }, [popularThreshold, mounted]);

  useEffect(() => {
    const log = (label: string, on: boolean) =>
      console.log(
        `%c[cmd] ${label}: %c${on ? "ON" : "OFF"}`,
        "color:#7aa;font-weight:600",
        on ? "color:#3a7;font-weight:700" : "color:#a55;font-weight:700",
      );

    const applyToggle = (
      arg: string | undefined,
      label: string,
      setter: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      if (arg === "on") {
        setter(true);
        log(label, true);
      } else if (arg === "off") {
        setter(false);
        log(label, false);
      } else {
        setter((prev) => {
          log(label, !prev);
          return !prev;
        });
      }
    };

    const handler = (input: string) => {
      const parts = String(input ?? "").trim().split(/\s+/);
      const head = parts[0];
      const arg = parts[1]?.toLowerCase();

      if (head === "/help") {
        console.group(
          "%c[cmd] /help — 利用可能コマンド",
          "color:#7aa;font-weight:700",
        );
        CMD_DEFS.forEach((c) => {
          console.log(
            `  %c${c.usage}%c  ${c.desc}`,
            "color:#3a7;font-weight:600",
            "color:inherit",
          );
        });
        console.groupEnd();
        return;
      }

      if (head === "/state") {
        const onOff = (b: boolean) => (b ? "ON" : "OFF");
        const items: { label: string; value: string }[] = [
          { label: "mode", value: gachaModeRef.current ? "gacha" : "simple" },
          { label: "season filter", value: onOff(seasonVisibleRef.current) },
          { label: "debug log", value: onOff(debugModeRef.current) },
          {
            label: "gacha anim",
            value: animDisabledRef.current ? "OFF (skip)" : "ON",
          },
          {
            label: "count UI",
            value: extendedCountRef.current
              ? "extended (number input, 1〜50)"
              : "default (slider, 1〜10)",
          },
          {
            label: "popular threshold",
            value: `${popularThresholdRef.current.toLocaleString()} (default ${DEFAULT_POPULAR_THRESHOLD.toLocaleString()})`,
          },
        ];
        console.group(
          "%c[cmd] /state — 現在の設定",
          "color:#7aa;font-weight:700",
        );
        items.forEach((it) => {
          console.log(
            `  %c${it.label.padEnd(20)}%c${it.value}`,
            "color:#7aa;font-weight:600",
            "color:inherit",
          );
        });
        console.groupEnd();
        return;
      }

      if (head === "/season") {
        applyToggle(arg, "season", setSeasonVisible);
        return;
      }

      if (head === "/debug") {
        applyToggle(arg, "debug", setDebugMode);
        return;
      }

      if (head === "/anim") {
        // /anim on = 演出ON(animDisabled=false)、/anim off = 演出OFF(animDisabled=true)
        if (arg === "on") {
          setAnimDisabled(false);
          log("anim", true);
        } else if (arg === "off") {
          setAnimDisabled(true);
          log("anim", false);
        } else {
          setAnimDisabled((prev) => {
            log("anim", prev);
            return !prev;
          });
        }
        return;
      }

      if (head === "/max") {
        const applyExtended = (on: boolean) => {
          setExtendedCount(on);
          console.log(
            `%c[cmd] max (extended count UI): %c${on ? "ON" : "OFF"}`,
            "color:#7aa;font-weight:600",
            on ? "color:#3a7;font-weight:700" : "color:#a55;font-weight:700",
          );
          if (on) {
            setAnimDisabled(true);
            console.log(
              `%c[cmd] anim: %cauto-OFF (件数拡張中はガチャ演出を自動停止)`,
              "color:#7aa;font-weight:600",
              "color:#a55;font-weight:700",
            );
          }
        };
        if (arg === "on") {
          applyExtended(true);
        } else if (arg === "off") {
          applyExtended(false);
        } else {
          setExtendedCount((prev) => {
            const next = !prev;
            console.log(
              `%c[cmd] max (extended count UI): %c${next ? "ON" : "OFF"}`,
              "color:#7aa;font-weight:600",
              next ? "color:#3a7;font-weight:700" : "color:#a55;font-weight:700",
            );
            if (next) {
              setAnimDisabled(true);
              console.log(
                `%c[cmd] anim: %cauto-OFF (件数拡張中はガチャ演出を自動停止)`,
                "color:#7aa;font-weight:600",
                "color:#a55;font-weight:700",
              );
            }
            return next;
          });
        }
        return;
      }

      if (head === "/popularity") {
        const sub = parts[1]?.toLowerCase();
        if (sub === undefined) {
          console.log(
            `%c[cmd] popularity threshold (current): %c${popularThresholdRef.current}`,
            "color:#7aa;font-weight:600",
            "color:#3a7;font-weight:700",
          );
          return;
        }
        if (sub === "reset") {
          setPopularThreshold(DEFAULT_POPULAR_THRESHOLD);
          console.log(
            `%c[cmd] popularity threshold: %creset to ${DEFAULT_POPULAR_THRESHOLD}`,
            "color:#7aa;font-weight:600",
            "color:#3a7;font-weight:700",
          );
          return;
        }
        if (sub === "tune") {
          const n = Number(parts[2]);
          if (!Number.isInteger(n) || n < 0) {
            console.log(
              `%c[cmd] /popularity tune <n>: 0以上の整数を指定してください`,
              "color:#a55;font-weight:600",
            );
            return;
          }
          setPopularThreshold(n);
          console.log(
            `%c[cmd] popularity threshold: %c${n}`,
            "color:#7aa;font-weight:600",
            "color:#3a7;font-weight:700",
          );
          return;
        }
        console.log(
          `%c[cmd] /popularity: 使い方は cmd("/popularity tune <n>") / cmd("/popularity reset")`,
          "color:#a55;font-weight:600",
        );
        return;
      }

      if (head === "/reset") {
        const removed: string[] = [];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            localStorage.removeItem(key);
            removed.push(key);
          }
        }
        setGachaMode(true);
        setSeasonVisible(false);
        setDebugMode(false);
        setAnimDisabled(false);
        setExtendedCount(false);
        setPopularThreshold(DEFAULT_POPULAR_THRESHOLD);
        console.group(
          "%c[cmd] /reset — localStorage を初期化しました",
          "color:#7aa;font-weight:700",
        );
        if (removed.length === 0) {
          console.log("  (削除されたキーはありません)");
        } else {
          removed.forEach((k) => console.log(`  removed: ${k}`));
        }
        console.log(
          "%c  反映が不完全な場合はページをリロードしてください",
          "color:#999;font-style:italic",
        );
        console.groupEnd();
        return;
      }

      console.log(
        `%c[cmd] unknown command: %c${input}\n%cTry: cmd("/help")`,
        "color:#a55;font-weight:600",
        "color:inherit",
        "color:#999;font-style:italic",
      );
    };

    window.cmd = handler;
    return () => {
      if (window.cmd === handler) delete window.cmd;
    };
  }, []);

  const handleSubmit = async (params: SearchParams) => {
    setLoading(true);
    setLastCount(params.count);
    setLastParams(params);
    setLastError(null);
    const sp = new URLSearchParams();
    if (params.yearFrom != null) sp.set("yearFrom", String(params.yearFrom));
    if (params.yearTo != null) sp.set("yearTo", String(params.yearTo));
    for (const s of params.seasons) sp.append("seasons", s);
    sp.set("count", String(params.count));
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
      const data = await res.json();
      if (debug) {
        console.log(`status: ${res.status}`);
        console.log("raw:", data);
      }
      if (!res.ok) throw new Error(data.error ?? "取得に失敗しました");
      const works = data.works as AnnictWork[];

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

      if (works.length === 0) {
        setResults(works);
        setResultsVersion((v) => v + 1);
        toast.info("条件に合うアニメが見つかりませんでした");
      } else if (
        gachaModeRef.current &&
        !animDisabledRef.current &&
        works.length <= 10
      ) {
        setResults(null);
        setPendingWorks(works);
      } else {
        setResults(works);
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

  const handleSequenceClose = () => {
    if (pendingWorks) {
      setResults(pendingWorks);
      setResultsVersion((v) => v + 1);
      setShowResultsPanel(true);
    }
    setPendingWorks(null);
  };

  return (
    <div
      className="page-root flex flex-col flex-1 items-center px-4 py-5 sm:py-8"
      style={!mounted ? { visibility: "hidden" } : undefined}
    >
      <main
        className={`w-full max-w-3xl space-y-4 sm:space-y-6${mounted ? " page-fade-in" : ""}`}
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
              <h1 className="text-xl font-semibold tracking-tight">
                アニメルーレット
              </h1>
            )}
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
        </header>

        <section className={gachaMode ? "gacha-form" : "simple-form"}>
          {gachaMode && (
            <div className="gacha-form-header">SEARCH FORM</div>
          )}
          <SearchForm
            loading={loading}
            onSubmit={handleSubmit}
            submitLabel={gachaMode ? "ガチャを引く" : "候補を取得"}
            loadingLabel={gachaMode ? "Loading..." : "取得中..."}
            layout={gachaMode ? "two-column" : "stack"}
            showSeason={seasonVisible}
            extendedCount={extendedCount}
            popularThreshold={popularThreshold}
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
                aria-label="結果一覧を X でシェア"
              >
                <Share2 className="size-3.5" aria-hidden />
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
              条件に合うアニメが見つかりませんでした。
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
                />
              ))}
            </div>
          ) : null}
        </section>
      </main>
      {pendingWorks && (
        <GachaSequence works={pendingWorks} onClose={handleSequenceClose} />
      )}
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
