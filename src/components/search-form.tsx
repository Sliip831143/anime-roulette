"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SEASONS, SEASON_LABELS_JA, type Season } from "@/lib/seasons";

export type Popularity = "all" | "popular" | "very_popular";

const POPULARITY_OPTIONS: { value: Popularity; label: string; hint: string }[] = [
  { value: "all", label: "すべて", hint: "制限なし" },
  { value: "popular", label: "人気のみ", hint: "視聴登録1,000人以上" },
  { value: "very_popular", label: "超人気のみ", hint: "視聴登録5,000人以上" },
];

export const MEDIA_VALUES = ["TV", "OVA", "MOVIE", "WEB", "OTHER"] as const;
export type Media = (typeof MEDIA_VALUES)[number];

const MEDIA_LABELS_JA: Record<Media, string> = {
  TV: "TV",
  MOVIE: "映画",
  OVA: "OVA",
  WEB: "Web",
  OTHER: "その他",
};

export type SearchParams = {
  yearFrom?: number;
  yearTo?: number;
  seasons: Season[];
  count: number;
  popularity: Popularity;
  highRated: boolean;
  media: Media[];
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
  const [popularity, setPopularity] = useState<Popularity>("all");
  const [highRated, setHighRated] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);

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
      popularity,
      highRated,
      media: selectedMedia,
    });
  };

  const toggleSeason = (season: Season, checked: boolean) => {
    setSelectedSeasons((prev) =>
      checked ? [...prev, season] : prev.filter((s) => s !== season),
    );
  };

  const toggleMedia = (m: Media, checked: boolean) => {
    setSelectedMedia((prev) =>
      checked ? [...prev, m] : prev.filter((v) => v !== m),
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
        <Label>人気度</Label>
        <RadioGroup
          value={popularity}
          onValueChange={(v) =>
            typeof v === "string" && setPopularity(v as Popularity)
          }
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {POPULARITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-2 cursor-pointer"
            >
              <RadioGroupItem value={opt.value} className="mt-1" />
              <span className="flex flex-col">
                <span className="text-sm">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={highRated}
            onCheckedChange={(checked) => setHighRated(checked === true)}
          />
          <span className="text-sm">
            高評価のみ
            <span className="ml-2 text-xs text-muted-foreground">
              満足度70%以上
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <Label>メディア種別</Label>
        <div className="flex flex-wrap gap-4">
          {MEDIA_VALUES.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedMedia.includes(m)}
                onCheckedChange={(checked) => toggleMedia(m, checked === true)}
              />
              <span className="text-sm">{MEDIA_LABELS_JA[m]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          未選択ですべて対象。一部だけ選ぶと該当種別に絞り込みます。
        </p>
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
