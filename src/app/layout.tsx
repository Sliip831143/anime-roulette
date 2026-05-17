import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Zen_Maru_Gothic } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

// 本番URL（Vercelデプロイ先）。デプロイ先が変わったらここを差し替え
const SITE_URL = "https://anime-roulette-inky.vercel.app";
const SITE_TITLE = "アニメルーレット -Anime Roulette-";
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
  category: "entertainment",
  keywords: [
    "アニメ",
    "ガチャ",
    "ルーレット",
    "Annict",
    "観るアニメ",
    "アニメ抽選",
    "次に観るアニメ",
    "ランダム",
  ],
  authors: [{ name: "Sliip831143", url: "https://github.com/Sliip831143" }],
  creator: "Sliip831143",
  publisher: "Sliip831143",
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
    creator: "@Sliip831143",
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "ja-JP": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  verification: {
    google: "jLXjp_mB17mnm3SQ7gp7G4bjl1jJT5OGdsdkUD6_nnQ",
  },
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
              isAccessibleForFree: true,
              browserRequirements: "Requires JavaScript. Modern browser recommended.",
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
        {/* 構造化データ (JSON-LD) — FAQPage schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "アニメルーレットとはどんなアプリですか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Annict のアニメデータベースから、放送年・季節・人気度・満足度・メディア種別などの条件に合った作品をランダムに抽選するガチャ風のWebアプリです。",
                  },
                },
                {
                  "@type": "Question",
                  name: "利用にユーザー登録や Annict のログインは必要ですか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "不要です。アカウント作成やログインなしで、すぐにガチャを引いて観るアニメを抽選できます。",
                  },
                },
                {
                  "@type": "Question",
                  name: "料金はかかりますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "無料でご利用いただけます。広告も表示しません。",
                  },
                },
                {
                  "@type": "Question",
                  name: "どんな条件でアニメを絞り込めますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "放送年（範囲指定・ランダム抽選可）、季節、人気度（視聴登録数の閾値）、高評価（満足度70%以上）、メディア種別（TV/映画/OVA/Web/その他）で絞り込めます。",
                  },
                },
                {
                  "@type": "Question",
                  name: "個人情報や視聴履歴は保存されますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "個人情報や視聴履歴は一切保存しません。モードや表示設定など、UIの状態のみブラウザの localStorage に保存されます。",
                  },
                },
                {
                  "@type": "Question",
                  name: "結果のレアリティ（★1〜★3）はどう決まりますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Annict 上の視聴登録数と満足度を組み合わせて判定します。視聴登録が多く満足度も高い作品ほど高レアリティ（★★★）になります。",
                  },
                },
              ],
            }),
          }}
        />
        {/* 構造化データ (JSON-LD) — HowTo schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "アニメルーレットで観るアニメを決める方法",
              description:
                "アニメルーレットを使って、次に観るアニメをガチャ感覚で決める手順。",
              totalTime: "PT1M",
              step: [
                {
                  "@type": "HowToStep",
                  position: 1,
                  name: "モードを選ぶ",
                  text: "画面右上で「ガチャ」または「簡易」モードを選択します。演出を楽しみたい場合はガチャモード、結果のみ確認したい場合は簡易モードがおすすめです。",
                  url: `${SITE_URL}/#mode`,
                },
                {
                  "@type": "HowToStep",
                  position: 2,
                  name: "条件を指定する",
                  text: "放送年・人気度・高評価・メディア種別など、抽選に使う条件を入力します。すべて未指定でも全期間から抽選可能です。",
                  url: `${SITE_URL}/#filters`,
                },
                {
                  "@type": "HowToStep",
                  position: 3,
                  name: "ガチャを引く",
                  text: "「ガチャを引く」ボタンを押すと、Annict から条件に合う作品を取得し、レアリティ付きのカード演出で発表します。",
                  url: `${SITE_URL}/#gacha`,
                },
                {
                  "@type": "HowToStep",
                  position: 4,
                  name: "気になる作品を確認する",
                  text: "結果一覧から気になる作品をクリックし、Annict や公式サイトで詳細・配信情報を確認します。気に入らなければ何度でも引き直せます。",
                  url: `${SITE_URL}/#result`,
                },
              ],
            }),
          }}
        />
        {/* ガチャ演出で使う画像を AVIF で先取り。
            演出は「ガチャを引く」押下後にしか表示されず初期ロード時には使われないため、
            preload（数秒以内に使う前提）ではなく prefetch（アイドル時に裏でキャッシュ）を使う */}
        <link rel="prefetch" href="/gacha/arona_1.avif" as="image" />
        <link rel="prefetch" href="/gacha/arona_2.avif" as="image" />
        <link rel="prefetch" href="/gacha/card_1.avif" as="image" />
        <link rel="prefetch" href="/gacha/card_2.avif" as="image" />
        <link rel="prefetch" href="/gacha/card_3.avif" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('anime-roulette-mode');document.documentElement.dataset.mode=m==='simple'?'simple':'gacha';}catch(e){document.documentElement.dataset.mode='gacha';}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              `console.log(`,
              `"\\n    ██████  ███████\\n        ███  ███  ███\\n       ███  ███  ███\\n      ███  ███  ███\\n     ███  ███  ███\\n\\n      M I L L E N N I U M\\n\\n%c📦 Project   %cアニメルーレット -Anime Roulette-\\n%c🔗 Source    %chttps://github.com/Sliip831143/anime-roulette\\n\\n%c🎲 Hidden commands available\\n%c  cmd(\\"/help\\")            %c利用可能コマンド一覧を表示\\n%c  cmd(\\"/state\\")           %c現在の各種設定を一覧表示\\n%c  cmd(\\"/season\\")          %c季節フィルタの表示切替\\n%c  cmd(\\"/debug\\")           %cAPIリクエスト・レアリティ判定のログ\\n%c  cmd(\\"/anim\\")            %cガチャ演出のON/OFF切替\\n%c  cmd(\\"/max\\")             %c取得件数UIをSlider⇔数値入力で切替\\n%c  cmd(\\"/popularity tune\\") %c「人気のみ」閾値をカスタマイズ\\n%c  cmd(\\"/reset\\")           %clocalStorageの全設定を初期化\\n",`,
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
