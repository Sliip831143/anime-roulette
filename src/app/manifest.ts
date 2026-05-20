import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "アニメルーレット",
    short_name: "アニメルーレット",
    description: "次に観るアニメをガチャ演出で楽しく抽選するルーレットアプリ",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eaf2fb",
    theme_color: "#c9deef",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
