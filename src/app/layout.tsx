import type { Metadata } from "next";
import { Geist, Geist_Mono, Zen_Maru_Gothic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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
  title: "アニメルーレット -Anime Roulette-",
  description: "Annict APIで観るアニメの候補を抽出するアプリ",
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
      </body>
    </html>
  );
}
