import type { MetadataRoute } from "next";

const SITE_URL = "https://anime-roulette-inky.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /api/anime は Annict 中継の JSON エンドポイントなのでクロール不要。
        // /api/og（動的 OGP 画像）は X 等の SNS カードクローラーが取得する必要が
        // あるため disallow に含めない。/api/ 全体を塞ぐとシェア画像が出なくなる。
        disallow: ["/api/anime"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
