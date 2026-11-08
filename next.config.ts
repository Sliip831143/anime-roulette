import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// 開発時に同一LAN内の別端末（スマホ・別Mac等）からアクセスする場合に許可する Origin。
// .env.local の ALLOWED_DEV_ORIGINS にカンマ区切りで指定（例: "192.168.1.7,192.168.1.8"）。
// 未指定なら何も追加しない。
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins && allowedDevOrigins.length > 0
    ? { allowedDevOrigins }
    : {}),
  // next/image は使っておらず（画像は <img> / <picture> で直接配信）、画像最適化 API（/_next/image）は
  // 不要なのに到達可能な状態だった。過去に SVG / AVIF 処理経由の RCE が報告された攻撃面なので無効化する。
  images: { unoptimized: true },
  // dev 時に左下へ出る Next.js のインジケーターが、スマホ幅で左下固定の図鑑ボタンと重なるため出さない
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // MIME スニッフィング防止
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 外部遷移時にフル URL を漏らさない（クエリに作品情報が乗るため）
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 使っていない強力な API を明示的に無効化
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // iframe 埋め込みを禁止（クリックジャッキング対策）。
          // frame-ancestors のみの CSP なのでスクリプト等の動作には影響しない。
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

// `pnpm analyze` で ANALYZE=true となり、ビルド時にバンドルサイズのレポートが生成される
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
