import { ImageResponse } from "next/og";

export const runtime = "edge";

const RARITY_STARS: Record<string, string> = {
  r1: "★",
  r2: "★★",
  r3: "★★★",
};

const RARITY_LABEL: Record<string, string> = {
  r1: "BRONZE",
  r2: "SILVER",
  r3: "GOLD",
};

const RARITY_ACCENT: Record<string, string> = {
  r1: "#8b8b8b",
  r2: "#7aa7c9",
  r3: "#d9b65a",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTitle = searchParams.get("title") ?? "次に観るアニメ";
  const rarity = searchParams.get("rarity") ?? "r1";
  const stars = RARITY_STARS[rarity] ?? RARITY_STARS.r1;
  const label = RARITY_LABEL[rarity] ?? RARITY_LABEL.r1;
  const accent = RARITY_ACCENT[rarity] ?? RARITY_ACCENT.r1;
  const title = rawTitle.length > 40 ? rawTitle.slice(0, 39) + "…" : rawTitle;

  return new ImageResponse(
    (
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
        {/* 上部：ブランド */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#36527a",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          <span style={{ fontSize: 38 }}>🎲</span>
          ANIME ROULETTE
        </div>

        {/* 中央：レアリティバッジ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginTop: 56,
            padding: "10px 28px",
            borderRadius: 999,
            backgroundColor: "#ffffff",
            color: accent,
            fontSize: 28,
            fontWeight: 800,
            border: `3px solid ${accent}`,
            boxShadow: `0 4px 16px ${accent}40`,
          }}
        >
          <span style={{ fontSize: 36, letterSpacing: 2 }}>{stars}</span>
          <span style={{ letterSpacing: 6 }}>{label}</span>
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
          が出ました ✨
        </div>

        {/* フッター URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            color: "#7a8aa3",
            fontSize: 20,
            letterSpacing: 1,
          }}
        >
          anime-roulette-inky.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
