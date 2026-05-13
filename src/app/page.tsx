"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SearchForm, type SearchParams } from "@/components/search-form";
import { AnimeCard } from "@/components/anime-card";
import { GachaSequence } from "@/components/gacha-sequence";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { AnnictWork } from "@/lib/annict";

const MODE_STORAGE_KEY = "anime-roulette-mode";

export default function Home() {
  const [results, setResults] = useState<AnnictWork[] | null>(null);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [pendingWorks, setPendingWorks] = useState<AnnictWork[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCount, setLastCount] = useState(5);
  const [gachaMode, setGachaMode] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "simple") setGachaMode(false);
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
        toast.info("条件に合うアニメが見つかりませんでした");
      } else if (gachaMode) {
        setResults(null);
        setPendingWorks(works);
      } else {
        setResults(works);
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
    <div className="flex flex-col flex-1 items-center px-4 py-10">
      <main className="w-full max-w-3xl space-y-8">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h1
              className={
                gachaMode
                  ? "gacha-title text-3xl tracking-tight"
                  : "text-3xl font-semibold tracking-tight"
              }
            >
              Anime Roulette
            </h1>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <span>シンプル</span>
              <Switch
                checked={gachaMode}
                onCheckedChange={(checked) => setGachaMode(checked === true)}
                aria-label="ガチャモード切り替え"
              />
              <span>ガチャ</span>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            Annict APIから観るアニメの候補を抽出します。条件を指定して人気作からランダムに引きましょう。
          </p>
        </header>

        <Separator />

        <section className={gachaMode ? "gacha-form" : ""}>
          <SearchForm
            loading={loading}
            onSubmit={handleSubmit}
            submitLabel={gachaMode ? "ガチャを引く" : "候補を取得"}
            loadingLabel={gachaMode ? "ガチャ準備中..." : "取得中..."}
          />
        </section>

        <Separator />

        <section className="space-y-4">
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
          ) : results == null ? (
            <p className="text-sm text-muted-foreground">
              「候補を取得」ボタンを押すと結果が表示されます。
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              条件に合うアニメが見つかりませんでした。
            </p>
          ) : (
            <div
              key={resultsVersion}
              className="grid gap-4 results-fade-in"
            >
              {results.map((work) => (
                <AnimeCard key={work.annictId} work={work} />
              ))}
            </div>
          )}
        </section>
      </main>
      {pendingWorks && (
        <GachaSequence works={pendingWorks} onClose={handleSequenceClose} />
      )}
    </div>
  );
}
