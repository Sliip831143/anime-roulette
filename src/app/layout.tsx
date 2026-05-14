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
            __html: `console.log("\\n    ██████  ███████\\n        ███  ███  ███\\n       ███  ███  ███\\n      ███  ███  ███\\n     ███  ███  ███\\n\\n      M I L L E N N I U M\\n");`,
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
