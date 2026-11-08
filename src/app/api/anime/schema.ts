import { z } from "zod";
import { MEDIA_VALUES } from "@/lib/annict";
import { MIN_YEAR, SEASONS } from "@/lib/seasons";

// 年は「Annict にデータが存在する範囲（MIN_YEAR〜現在年）」にサーバー側でもクランプする。
// UI の制約と揃えるだけでなく、任意の年範囲でキャッシュキーを無限に作られて
// キャッシュミス→Annict への 13 ページフェッチを誘発される DoS 経路を塞ぐ意味がある。
// 上限（現在年）はインスタンスが年をまたいで生存しても正しく判定できるよう parse 時に評価する。
const yearSchema = z.coerce
  .number()
  .int()
  .min(MIN_YEAR)
  .refine((y) => y <= new Date().getFullYear(), {
    message: `year must be between ${MIN_YEAR} and the current year`,
  });

export const querySchema = z
  .object({
    yearFrom: yearSchema.optional(),
    yearTo: yearSchema.optional(),
    seasons: z.array(z.enum(SEASONS)).optional(),
    count: z.coerce.number().int().min(1).max(100).default(5),
    popularity: z.enum(["all", "popular", "very_popular"]).default("all"),
    popularityThreshold: z.coerce.number().int().min(0).optional(),
    highRated: z
      .union([z.literal("true"), z.literal("false")])
      .default("false")
      .transform((v) => v === "true"),
    media: z.array(z.enum(MEDIA_VALUES)).optional(),
  })
  .refine(
    (v) => v.yearFrom == null || v.yearTo == null || v.yearFrom <= v.yearTo,
    {
      message: "yearFrom must be less than or equal to yearTo",
      path: ["yearFrom"],
    },
  )
  .refine((v) => v.yearFrom != null || v.yearTo != null || !v.seasons?.length, {
    message: "seasons require at least one of yearFrom/yearTo",
    path: ["seasons"],
  });
