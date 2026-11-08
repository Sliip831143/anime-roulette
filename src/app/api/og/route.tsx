import { ImageResponse } from "next/og";
import { getWorkSummary } from "@/lib/annict";
import { getRarity, type Rarity } from "@/lib/rarity";
import { SITE_HOST, SITE_URL } from "@/lib/site";

// Next.js 16.4 で Edge Runtime が非推奨になったため nodejs で動かす（ImageResponse は両対応）
export const runtime = "nodejs";

// next/og のデフォルトフォントは ★ (U+2605) をカバーしないため、星は SVG で描く
const RARITY_COUNT: Record<Rarity, number> = { r1: 1, r2: 2, r3: 3 };

// ガチャ演出のレアリティアクセントに揃える：青 / 黄 / ピンク紫
const RARITY_ACCENT: Record<Rarity, string> = {
  r1: "#4a8fd9", // ★1 青
  r2: "#e8c44d", // ★2 黄
  r3: "#b572c8", // ★3 ピンク紫
};

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
      />
    </svg>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // タイトル・レアリティはクエリから受け取らず、id から Annict の実データを引く
  // （このドメインで任意文言のなりすまし画像を生成されないようにするため）。
  // id が無効・取得失敗時は既定文言の画像を返す。
  const idParam = searchParams.get("id");
  let rawTitle = "次に観るアニメ";
  let rarity: Rarity = "r1";
  if (idParam && /^\d+$/.test(idParam)) {
    try {
      const summary = await getWorkSummary(Number(idParam));
      if (summary) {
        rawTitle = summary.title;
        rarity = getRarity(summary.watchersCount, summary.satisfactionRate);
      }
    } catch (error) {
      console.error(`og: getWorkSummary(${idParam}) failed:`, error);
    }
  }
  const starCount = RARITY_COUNT[rarity];
  const accent = RARITY_ACCENT[rarity];
  const title = rawTitle.length > 40 ? rawTitle.slice(0, 39) + "…" : rawTitle;
  // ロゴはリクエストの Host ではなく固定の本番 URL から読む。request.url 由来だと
  // ローカル検証時に localhost となり next/og の SSRF 保護（プライベートアドレス拒否）で
  // 画像生成ごと失敗するうえ、Host ヘッダ次第で取得先が変わる余地を残すため。
  const logoUrl = new URL("/logo.png", SITE_URL).toString();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#eaf2fb",
        backgroundImage:
          "linear-gradient(135deg, #eaf2fb 0%, #d3e3f5 60%, #c9deef 100%)",
        fontFamily: "system-ui, sans-serif",
        padding: "60px 80px",
        position: "relative",
      }}
    >
      {/* 上部：ロゴ（控えめに） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        width={300}
        height={78}
        style={{ objectFit: "contain" }}
      />

      {/* 中央：レアリティバッジ（SVG の星を個数分） */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          marginTop: 44,
          padding: "6px 18px",
          borderRadius: 999,
          backgroundColor: "#ffffff",
          border: `2px solid ${accent}`,
          boxShadow: `0 3px 12px ${accent}40`,
        }}
      >
        {Array.from({ length: starCount }).map((_, i) => (
          <Star key={i} size={28} color={accent} />
        ))}
      </div>

      {/* タイトル */}
      <div
        style={{
          display: "flex",
          marginTop: 40,
          color: "#1f2d44",
          fontSize: 64,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 1000,
        }}
      >
        {title}
      </div>

      {/* 下部：キャッチコピー */}
      <div
        style={{
          display: "flex",
          marginTop: 48,
          color: "#5a6b88",
          fontSize: 28,
          fontWeight: 600,
        }}
      >
        が出ました
      </div>

      {/* フッター URL（中央配置の流れに含めて上下バランスを取る） */}
      <div
        style={{
          display: "flex",
          marginTop: 64,
          color: "#7a8aa3",
          fontSize: 20,
          letterSpacing: 1,
        }}
      >
        {SITE_HOST}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
