import { describe, it, expect } from "vitest";
import { querySchema } from "./schema";

const minimal = {
  yearFrom: undefined,
  yearTo: undefined,
  seasons: [] as string[],
  count: undefined,
  popularity: undefined,
  popularityThreshold: undefined,
  highRated: undefined,
  media: [] as string[],
};

describe("querySchema (anime API)", () => {
  it("最小入力でデフォルト値が当たる", () => {
    const result = querySchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(5);
      expect(result.data.popularity).toBe("all");
      expect(result.data.highRated).toBe(false);
    }
  });

  it("正常系：全項目を有効値で指定すると通る", () => {
    const result = querySchema.safeParse({
      ...minimal,
      yearFrom: "2020",
      yearTo: "2023",
      seasons: ["spring", "summer"],
      count: "10",
      popularity: "popular",
      popularityThreshold: "500",
      highRated: "true",
      media: ["TV", "MOVIE"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yearFrom).toBe(2020);
      expect(result.data.yearTo).toBe(2023);
      expect(result.data.count).toBe(10);
      expect(result.data.highRated).toBe(true);
      expect(result.data.media).toEqual(["TV", "MOVIE"]);
    }
  });

  it("yearFrom が範囲外（1899）は失敗", () => {
    const result = querySchema.safeParse({ ...minimal, yearFrom: "1899" });
    expect(result.success).toBe(false);
  });

  it("yearFrom が範囲外（2101）は失敗", () => {
    const result = querySchema.safeParse({ ...minimal, yearFrom: "2101" });
    expect(result.success).toBe(false);
  });

  // 年の受付範囲は Annict にデータが存在する MIN_YEAR（1991）〜現在年に
  // サーバー側でもクランプする（UI の制約と一致させ、キャッシュキーの
  // 組み合わせ爆発と Annict への無駄な問い合わせを防ぐ）。
  it("yearFrom が MIN_YEAR 未満（1990）は失敗", () => {
    const result = querySchema.safeParse({ ...minimal, yearFrom: "1990" });
    expect(result.success).toBe(false);
  });

  it("yearFrom が MIN_YEAR（1991）は成功", () => {
    const result = querySchema.safeParse({ ...minimal, yearFrom: "1991" });
    expect(result.success).toBe(true);
  });

  it("yearTo が現在年は成功", () => {
    const year = String(new Date().getFullYear());
    const result = querySchema.safeParse({ ...minimal, yearTo: year });
    expect(result.success).toBe(true);
  });

  it("yearTo が現在年+1（未来）は失敗", () => {
    const year = String(new Date().getFullYear() + 1);
    const result = querySchema.safeParse({ ...minimal, yearTo: year });
    expect(result.success).toBe(false);
  });

  it("yearFrom > yearTo は失敗", () => {
    const result = querySchema.safeParse({
      ...minimal,
      yearFrom: "2025",
      yearTo: "2020",
    });
    expect(result.success).toBe(false);
  });

  it("年なしで seasons だけ指定したら失敗", () => {
    const result = querySchema.safeParse({
      ...minimal,
      seasons: ["spring"],
    });
    expect(result.success).toBe(false);
  });

  it("count が 0 は失敗", () => {
    const result = querySchema.safeParse({ ...minimal, count: "0" });
    expect(result.success).toBe(false);
  });

  it("count が 101 は失敗（上限 100）", () => {
    const result = querySchema.safeParse({ ...minimal, count: "101" });
    expect(result.success).toBe(false);
  });

  it("popularity の不正値は失敗", () => {
    const result = querySchema.safeParse({
      ...minimal,
      popularity: "extremely_popular",
    });
    expect(result.success).toBe(false);
  });

  it("media の不正値は失敗", () => {
    const result = querySchema.safeParse({
      ...minimal,
      media: ["VHS"],
    });
    expect(result.success).toBe(false);
  });

  it("seasons の不正値は失敗", () => {
    const result = querySchema.safeParse({
      ...minimal,
      yearFrom: "2023",
      seasons: ["fall"],
    });
    expect(result.success).toBe(false);
  });

  it("popularityThreshold は 1 以上の整数を許容", () => {
    const result = querySchema.safeParse({
      ...minimal,
      popularity: "popular",
      popularityThreshold: "1",
    });
    expect(result.success).toBe(true);
  });

  it("popularityThreshold の 0 以下は失敗（0 は「すべて」と同じで人気のみの条件として無意味）", () => {
    for (const v of ["0", "-1"]) {
      const result = querySchema.safeParse({
        ...minimal,
        popularityThreshold: v,
      });
      expect(result.success).toBe(false);
    }
  });

  it("highRated は 'true'/'false' の文字列のみ受理し boolean に変換", () => {
    const t = querySchema.safeParse({ ...minimal, highRated: "true" });
    const f = querySchema.safeParse({ ...minimal, highRated: "false" });
    expect(t.success && t.data.highRated).toBe(true);
    expect(f.success && f.data.highRated).toBe(false);
  });

  it("highRated に 'yes' などは不正で失敗", () => {
    const result = querySchema.safeParse({ ...minimal, highRated: "yes" });
    expect(result.success).toBe(false);
  });
});
