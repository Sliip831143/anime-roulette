import { NextResponse } from "next/server";
import { AnnictRateLimitError } from "@/lib/annict-rate-limit";
import { z } from "zod";
import { getWorkDetail } from "@/lib/annict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  // GraphQL の Int（32bit）に収まらない id は Annict へ投げても拒否されるだけなので、ここで 400 にする
  id: z.coerce.number().int().min(1).max(2_147_483_647),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid id", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const work = await getWorkDetail(parsed.data.id);
    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }
    return NextResponse.json({ work });
  } catch (error) {
    // 上流エラーの詳細（GraphQL クエリ全文等）はサーバーログにのみ残し、
    // クライアントには汎用メッセージを返す（/api/anime と同方針）。
    console.error(`GET /api/anime/${parsed.data.id} failed:`, error);
    if (error instanceof AnnictRateLimitError) {
      // Annict のレート制限。待てば解消するので 502 ではなく 429 で返し、
      // 分かる場合は Retry-After も透過してクライアントが待ち時間を判断できるようにする。
      return NextResponse.json(
        { error: "Annict が混み合っています。少し待ってからお試しください" },
        {
          status: 429,
          headers:
            error.retryAfterSeconds != null
              ? { "Retry-After": String(error.retryAfterSeconds) }
              : undefined,
        },
      );
    }
    const isConfigError =
      error instanceof Error && error.message.includes("ANNICT_TOKEN");
    return NextResponse.json(
      {
        error: isConfigError
          ? "サーバーの設定に問題があります"
          : "詳細情報の取得に失敗しました。時間をおいてお試しください",
      },
      { status: isConfigError ? 500 : 502 },
    );
  }
}
