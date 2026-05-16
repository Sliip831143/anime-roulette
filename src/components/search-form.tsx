"use client";

import { useEffect, useMemo, useState } from "react";
import { Dices, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SEASONS, SEASON_LABELS_JA, type Season } from "@/lib/seasons";

const YEAR_RANDOM_DEFAULT_MIN = 1990;
const DEFAULT_POPULAR_THRESHOLD = 1000;

export type Popularity = "all" | "popular" | "very_popular";

type PopularityOption = { value: Popularity; label: string; hint: string };
const buildPopularityOptions = (popularThreshold: number): PopularityOption[] => [
  { value: "all", label: "すべて", hint: "制限なし" },
  {
    value: "popular",
    label: "人気のみ",
    hint: `視聴登録${popularThreshold.toLocaleString()}人以上`,
  },
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

const SLIDER_MAX_COUNT = 10;
const EXTENDED_MAX_COUNT = 50;

type Props = {
  loading: boolean;
  onSubmit: (params: SearchParams) => void;
  submitLabel?: string;
  loadingLabel?: string;
  layout?: "stack" | "two-column";
  showSeason?: boolean;
  extendedCount?: boolean;
  popularThreshold?: number;
};

export function SearchForm({
  loading,
  onSubmit,
  submitLabel = "候補を取得",
  loadingLabel = "取得中...",
  layout = "stack",
  showSeason = true,
  extendedCount = false,
  popularThreshold = DEFAULT_POPULAR_THRESHOLD,
}: Props) {
  const [yearFromText, setYearFromText] = useState("");
  const [yearToText, setYearToText] = useState("");
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [count, setCount] = useState(5);
  const [popularity, setPopularity] = useState<Popularity>("all");
  const [highRated, setHighRated] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>(["TV"]);

  const yearFrom = parseYear(yearFromText);
  const yearTo = parseYear(yearToText);
  const seasonsEnabled = yearFrom != null || yearTo != null;
  const twoColumn = layout === "two-column";
  const currentMaxCount = extendedCount ? EXTENDED_MAX_COUNT : SLIDER_MAX_COUNT;
  const popularityOptions = useMemo(
    () => buildPopularityOptions(popularThreshold),
    [popularThreshold],
  );

  useEffect(() => {
    if (count > currentMaxCount) setCount(currentMaxCount);
  }, [currentMaxCount, count]);

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
    const effectiveFrom = pickedYear ?? yearFrom ?? undefined;
    const effectiveTo = pickedYear ?? yearTo ?? undefined;
    onSubmit({
      yearFrom: effectiveFrom,
      yearTo: effectiveTo,
      seasons:
        showSeason && (seasonsEnabled || pickedYear != null)
          ? selectedSeasons
          : [],
      count,
      popularity,
      highRated,
      media: selectedMedia,
    });
  };

  const handleYearFromChange = (text: string) => {
    setYearFromText(text);
    setPickedYear(null);
  };

  const handleYearToChange = (text: string) => {
    setYearToText(text);
    setPickedYear(null);
  };

  const handleRandomYear = () => {
    const currentYear = new Date().getFullYear();
    let lo: number;
    let hi: number;
    if (yearFrom != null && yearTo != null) {
      lo = Math.min(yearFrom, yearTo);
      hi = Math.max(yearFrom, yearTo);
    } else if (yearFrom != null) {
      lo = yearFrom;
      hi = currentYear;
    } else if (yearTo != null) {
      lo = YEAR_RANDOM_DEFAULT_MIN;
      hi = yearTo;
    } else {
      lo = YEAR_RANDOM_DEFAULT_MIN;
      hi = currentYear;
    }
    if (lo > hi) [lo, hi] = [hi, lo];
    const picked = Math.floor(Math.random() * (hi - lo + 1)) + lo;
    setPickedYear(picked);
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

  const yearSection = (
    <div className="space-y-2">
      <Label>放送年（任意）</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="開始年"
          min={1900}
          max={2100}
          value={yearFromText}
          onChange={(e) => handleYearFromChange(e.target.value)}
          className="w-28 sm:w-32"
        />
        <span className="text-muted-foreground">〜</span>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="終了年"
          min={1900}
          max={2100}
          value={yearToText}
          onChange={(e) => handleYearToChange(e.target.value)}
          className="w-28 sm:w-32"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRandomYear}
          disabled={error != null}
          aria-label="放送年をランダムで決定"
          className="shrink-0 gap-1.5"
        >
          <Dices className="size-4" aria-hidden />
          <span>ランダム</span>
        </Button>
      </div>
      {pickedYear != null && (
        <div className="flex items-center gap-2">
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          >
            <Dices className="size-3.5" aria-hidden />
            {pickedYear}年で抽選
            <button
              type="button"
              onClick={() => setPickedYear(null)}
              aria-label="抽選結果をクリア"
              className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-primary/70 hover:bg-primary/20 hover:text-primary"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        単年なら片方だけ、未指定なら全期間から抽出します。
        <br />
        「ランダム」で範囲内から1年を抽選します。
      </p>
    </div>
  );

  const seasonSection = (
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
  );

  const popularitySection = (
    <div className="space-y-2">
      <Label>人気度</Label>
      <RadioGroup
        value={popularity}
        onValueChange={(v) =>
          typeof v === "string" && setPopularity(v as Popularity)
        }
        className={
          twoColumn
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-1 gap-2 sm:grid-cols-3"
        }
      >
        {popularityOptions.map((opt) => (
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
  );

  const highRatedSection = (
    <div className="space-y-2">
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={highRated}
          onCheckedChange={(checked) => setHighRated(checked === true)}
          className="mt-1"
        />
        <span className="flex flex-col">
          <span className="text-sm">高評価のみ</span>
          <span className="text-xs text-muted-foreground">
            満足度70%以上
          </span>
        </span>
      </label>
    </div>
  );

  const mediaSection = (
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
  );

  const countSection = (
    <div className="space-y-2">
      <Label>取得件数: {count}件</Label>
      {extendedCount ? (
        <div className="space-y-1.5">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={EXTENDED_MAX_COUNT}
            value={count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= EXTENDED_MAX_COUNT) {
                setCount(n);
              }
            }}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            1〜{EXTENDED_MAX_COUNT}件で指定（<code>/max</code> による拡張中）
          </p>
        </div>
      ) : (
        <Slider
          min={1}
          max={SLIDER_MAX_COUNT}
          step={1}
          value={[Math.min(count, SLIDER_MAX_COUNT)]}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            if (typeof next === "number") setCount(next);
          }}
        />
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      {twoColumn ? (
        <div className="grid gap-y-2.5 sm:gap-y-3 md:gap-y-5 md:grid-cols-2">
          <div className="space-y-2.5 sm:space-y-3 md:space-y-5 md:border-r md:border-slate-200 md:pr-6">
            {yearSection}
            {showSeason && seasonSection}
            {mediaSection}
          </div>
          <div className="space-y-2.5 sm:space-y-3 md:space-y-5 md:pl-6">
            {popularitySection}
            {highRatedSection}
            {countSection}
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {yearSection}
          {showSeason && seasonSection}
          {popularitySection}
          {highRatedSection}
          {mediaSection}
          {countSection}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || error != null} className="w-full">
        {loading ? loadingLabel : submitLabel}
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
