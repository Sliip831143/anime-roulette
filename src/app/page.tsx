"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SearchForm, type SearchParams } from "@/components/search-form";
import { AnimeCard } from "@/components/anime-card";
import { GachaSequence } from "@/components/gacha-sequence";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { AnnictWork } from "@/lib/annict";

const MODE_STORAGE_KEY = "anime-roulette-mode";

export default function Home() {
  const [results, setResults] = useState<AnnictWork[] | null>(null);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [pendingWorks, setPendingWorks] = useState<AnnictWork[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCount, setLastCount] = useState(5);
  const [gachaMode, setGachaMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (resultsVersion > 0) setShowResultsPanel(true);
  }, [resultsVersion]);

  const scrollToWork = (id: number) => {
    document
      .getElementById(`work-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "simple") setGachaMode(false);
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mode = gachaMode ? "gacha" : "simple";
    localStorage.setItem(MODE_STORAGE_KEY, gachaMode ? "gacha" : "simple");
  }, [gachaMode]);

  const handleSubmit = async (params: SearchParams) => {
    setLoading(true);
    setLastCount(params.count);
    const sp = new URLSearchParams();
    if (params.yearFrom != null) sp.set("yearFrom", String(params.yearFrom));
    if (params.yearTo != null) sp.set("yearTo", String(params.yearTo));
    for (const s of params.seasons) sp.append("seasons", s);
    sp.set("count", String(params.count));
    sp.set("popularity", params.popularity);
    sp.set("highRated", String(params.highRated));
    for (const m of params.media) sp.append("media", m);

    try {
      const res = await fetch(`/api/anime?${sp.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得に失敗しました");
      const works = data.works as AnnictWork[];
      if (works.length === 0) {
        setResults(works);
        setResultsVersion((v) => v + 1);
        toast.info("条件に合うアニメが見つかりませんでした");
      } else if (gachaMode) {
        setResults(null);
        setPendingWorks(works);
      } else {
        setResults(works);
        setResultsVersion((v) => v + 1);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      toast.error(`エラー: ${msg}`);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSequenceClose = () => {
    if (pendingWorks) {
      setResults(pendingWorks);
      setResultsVersion((v) => v + 1);
    }
    setPendingWorks(null);
  };

  return (
    <div
      className="page-root flex flex-col flex-1 items-center px-4 py-5 sm:py-10"
      style={!mounted ? { visibility: "hidden" } : undefined}
    >
      <main className="w-full max-w-3xl space-y-5 sm:space-y-8">
        <header className="space-y-3">
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
          />
        </section>

        <Separator
          className={results != null ? "" : "hidden"}
        />

        <section
          ref={resultsRef}
          className={`space-y-4 scroll-mt-4${
            results != null ? "" : " hidden"
          }`}
        >
          <h2
            className={
              gachaMode ? "gacha-title text-xl" : "text-xl font-semibold"
            }
          >
            結果
          </h2>
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
