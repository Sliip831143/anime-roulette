import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAnimeWorks } from "@/lib/annict";
import { expandSeasons, SEASONS } from "@/lib/seasons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POOL_SIZE = 50;

const querySchema = z
  .object({
    yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
    yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
    seasons: z.array(z.enum(SEASONS)).optional(),
    count: z.coerce.number().int().min(1).max(20).default(5),
  })
  .refine(
    (v) => v.yearFrom == null || v.yearTo == null || v.yearFrom <= v.yearTo,
    { message: "yearFrom must be less than or equal to yearTo", path: ["yearFrom"] },
  )
  .refine((v) => v.yearFrom != null || v.yearTo != null || !v.seasons?.length, {
    message: "seasons require at least one of yearFrom/yearTo",
    path: ["seasons"],
  });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    yearFrom: searchParams.get("yearFrom") ?? undefined,
    yearTo: searchParams.get("yearTo") ?? undefined,
    seasons: searchParams.getAll("seasons"),
    count: searchParams.get("count") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { yearFrom, yearTo, seasons, count } = parsed.data;

  try {
    const expandedSeasons = expandSeasons({ yearFrom, yearTo, seasons });
    const pool = await searchAnimeWorks({
      seasons: expandedSeasons,
      first: POOL_SIZE,
    });
    const picked = shuffle(pool).slice(0, count);
    return NextResponse.json({ works: picked, total: pool.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("ANNICT_TOKEN") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
