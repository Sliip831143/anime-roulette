"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SearchForm, type SearchParams } from "@/components/search-form";
import { AnimeCard } from "@/components/anime-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { AnnictWork } from "@/lib/annict";

export default function Home() {
  const [results, setResults] = useState<AnnictWork[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCount, setLastCount] = useState(5);

  const handleSubmit = async (params: SearchParams) => {
    setLoading(true);
    setLastCount(params.count);
    const sp = new URLSearchParams();
    if (params.yearFrom != null) sp.set("yearFrom", String(params.yearFrom));
    if (params.yearTo != null) sp.set("yearTo", String(params.yearTo));
    for (const s of params.seasons) sp.append("seasons", s);
    sp.set("count", String(params.count));

    try {
      const res = await fetch(`/api/anime?${sp.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得に失敗しました");
      setResults(data.works as AnnictWork[]);
      if ((data.works as AnnictWork[]).length === 0) {
        toast.info("条件に合うアニメが見つかりませんでした");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      toast.error(`エラー: ${msg}`);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center px-4 py-10">
      <main className="w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Anime Roulette
          </h1>
          <p className="text-sm text-muted-foreground">
            Annict APIから観るアニメの候補を抽出します。条件を指定して人気作からランダムに引きましょう。
          </p>
        </header>

        <Separator />

        <section>
          <SearchForm loading={loading} onSubmit={handleSubmit} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">結果</h2>
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
            <div className="grid gap-4">
              {results.map((work) => (
                <AnimeCard key={work.annictId} work={work} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
