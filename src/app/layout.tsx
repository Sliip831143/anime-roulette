import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Zen_Maru_Gothic } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

// 本番URL（Vercelデプロイ先）。デプロイ先が変わったらここを差し替え
const SITE_URL = "https://anime-roulette-inky.vercel.app";
const SITE_TITLE = "アニメルーレット — Anime Roulette";
const SITE_DESCRIPTION =
  "Annictで観るアニメをガチャで抽選するルーレットアプリ。レアリティ付きガチャ演出で次に観る作品を決めよう。";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-rounded",
  subsets: ["latin"],
  weight: ["300", "500", "700", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | アニメルーレット",
  },
  description: SITE_DESCRIPTION,
  applicationName: "アニメルーレット",
  keywords: ["アニメ", "ガチャ", "ルーレット", "Annict", "観るアニメ"],
  authors: [{ name: "Sliip831143", url: "https://github.com/Sliip831143" }],
  creator: "Sliip831143",
  openGraph: {
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "アニメルーレット",
    locale: "ja_JP",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Search Console 所有権確認：登録時に発行されたコードをここに貼り付け
  // verification: { google: "xxxxxxxxxxxxxxxxxxxxxxxx" },
};

export const viewport: Viewport = {
  themeColor: "#c9deef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${zenMaruGothic.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* 構造化データ (JSON-LD) — WebApplication schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "アニメルーレット",
              alternateName: "Anime Roulette",
              applicationCategory: "EntertainmentApplication",
              operatingSystem: "Web",
              description: SITE_DESCRIPTION,
              url: SITE_URL,
              inLanguage: "ja",
              author: {
                "@type": "Person",
                name: "Sliip831143",
                url: "https://github.com/Sliip831143",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "JPY",
              },
            }),
          }}
        />
        {/* ガチャ演出で使う画像を AVIF で先行読込（type が一致しないブラウザは preload しない） */}
        <link rel="preload" as="image" href="/gacha/arona_1.avif" type="image/avif" />
        <link rel="preload" as="image" href="/gacha/arona_2.avif" type="image/avif" />
        <link rel="preload" as="image" href="/gacha/card_1.avif" type="image/avif" />
        <link rel="preload" as="image" href="/gacha/card_2.avif" type="image/avif" />
        <link rel="preload" as="image" href="/gacha/card_3.avif" type="image/avif" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('anime-roulette-mode');document.documentElement.dataset.mode=m==='simple'?'simple':'gacha';}catch(e){document.documentElement.dataset.mode='gacha';}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              `console.log(`,
              `"\\n    ██████  ███████\\n        ███  ███  ███\\n       ███  ███  ███\\n      ███  ███  ███\\n     ███  ███  ███\\n\\n      M I L L E N N I U M\\n\\n%c📦 Project   %cアニメルーレット — Anime Roulette\\n%c🔗 Source    %chttps://github.com/Sliip831143/anime-roulette\\n\\n%c🎲 Hidden commands available\\n%c  cmd(\\"/help\\")            %c利用可能コマンド一覧を表示\\n%c  cmd(\\"/state\\")           %c現在の各種設定を一覧表示\\n%c  cmd(\\"/season\\")          %c季節フィルタの表示切替\\n%c  cmd(\\"/debug\\")           %cAPIリクエスト・レアリティ判定のログ\\n%c  cmd(\\"/anim\\")            %cガチャ演出のON/OFF切替\\n%c  cmd(\\"/max\\")             %c取得件数UIをSlider⇔数値入力で切替\\n%c  cmd(\\"/popularity tune\\") %c「人気のみ」閾値をカスタマイズ\\n%c  cmd(\\"/reset\\")           %clocalStorageの全設定を初期化\\n",`,
              `"color:#7aa;font-weight:600",`,
              `"color:inherit",`,
              `"color:#7aa;font-weight:600",`,
              `"color:#48a;font-weight:600;text-decoration:underline",`,
              `"color:#7aa;font-weight:700;font-size:13px",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit",`,
              `"color:#3a7;font-weight:600", "color:inherit"`,
              `);`,
            ].join("\n"),
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
