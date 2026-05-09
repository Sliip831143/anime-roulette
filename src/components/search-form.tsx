"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { SEASONS, SEASON_LABELS_JA, type Season } from "@/lib/seasons";

export type SearchParams = {
  yearFrom?: number;
  yearTo?: number;
  seasons: Season[];
  count: number;
};

type Props = {
  loading: boolean;
  onSubmit: (params: SearchParams) => void;
};

export function SearchForm({ loading, onSubmit }: Props) {
  const [yearFromText, setYearFromText] = useState("");
  const [yearToText, setYearToText] = useState("");
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [count, setCount] = useState(5);

  const yearFrom = parseYear(yearFromText);
  const yearTo = parseYear(yearToText);
  const seasonsEnabled = yearFrom != null || yearTo != null;

  const error = useMemo(() => {
    if (yearFromText && yearFrom == null) return "開始年は1900〜2100の整数で入力してください";
    if (yearToText && yearTo == null) return "終了年は1900〜2100の整数で入力してください";
    if (yearFrom != null && yearTo != null && yearFrom > yearTo)
      return "開始年は終了年以下にしてください";
    return null;
  }, [yearFromText, yearToText, yearFrom, yearTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (error) return;
    onSubmit({
      yearFrom: yearFrom ?? undefined,
      yearTo: yearTo ?? undefined,
      seasons: seasonsEnabled ? selectedSeasons : [],
      count,
    });
  };

  const toggleSeason = (season: Season, checked: boolean) => {
    setSelectedSeasons((prev) =>
      checked ? [...prev, season] : prev.filter((s) => s !== season),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>放送年（任意）</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="開始年"
            min={1900}
            max={2100}
            value={yearFromText}
            onChange={(e) => setYearFromText(e.target.value)}
            className="w-32"
          />
          <span className="text-muted-foreground">〜</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="終了年"
            min={1900}
            max={2100}
            value={yearToText}
            onChange={(e) => setYearToText(e.target.value)}
            className="w-32"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          単年なら片方だけ、未指定なら全期間から抽出します。
        </p>
      </div>

      <div className="space-y-2">
        <Label className={seasonsEnabled ? "" : "text-muted-foreground"}>
          季節（任意・年指定時のみ有効）
        </Label>
        <div className="flex flex-wrap gap-4">
          {SEASONS.map((season) => (
            <label
              key={season}
              className={`flex items-center gap-2 ${
                seasonsEnabled ? "" : "opacity-50"
              }`}
            >
              <Checkbox
                checked={selectedSeasons.includes(season)}
                disabled={!seasonsEnabled}
                onCheckedChange={(checked) =>
                  toggleSeason(season, checked === true)
                }
              />
              <span>{SEASON_LABELS_JA[season]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>取得件数: {count}件</Label>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[count]}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            if (typeof next === "number") setCount(next);
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || error != null} className="w-full">
        {loading ? "取得中..." : "候補を取得"}
      </Button>
    </form>
  );
}

function parseYear(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1900 || n > 2100) return null;
  return n;
}
