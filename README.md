# アニメルーレット — Anime Roulette

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)](https://anime-roulette-inky.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#ライセンス)

> Annict GraphQL API を使って **観るアニメをガチャで抽選** するルーレットアプリ。
> ブルーアーカイブ風 UI の「ガチャモード」と、shadcn ベースの「簡易モード」を切り替え可能。

🔗 **デモ**: <https://anime-roulette-inky.vercel.app/>

---

## 目次

- [主な機能](#主な機能)
- [隠しコマンド（DevTools コンソール）](#隠しコマンドdevtools-コンソール)
- [技術スタック](#技術スタック)
- [パフォーマンス最適化](#パフォーマンス最適化)
- [アクセシビリティ](#アクセシビリティ)
- [PWA / SEO](#pwa--seo)
- [セットアップ](#セットアップ)
- [アーキテクチャ](#アーキテクチャ)
- [スクリプト](#スクリプト)
- [デプロイ（Vercel）](#デプロイvercel)
- [計測（Analytics / CI）](#計測analytics--ci)
- [ライセンス](#ライセンス)

---

## 主な機能

### 検索フィルタ
- 放送年（単年・範囲・未指定）。**「🎲 ランダム」ボタン**で範囲内から1年を自動抽選してバッジ表示
- 季節（春／夏／秋／冬、年指定時のみ）※デフォルトは非表示、隠しコマンドで表示
- 人気度ティア（すべて／人気のみ／超人気のみ）。**「人気のみ」の閾値は隠しコマンドでカスタマイズ可能**
- 高評価のみ（満足度70%以上）
- メディア種別（TV／映画／OVA／Web／その他、デフォルトは TV のみ）
- 取得件数 1〜10件（**隠しコマンドで 1〜50件 の数値入力モードへ拡張可能**）

### モード切替
ヘッダー右上のセグメントピル（[簡易][ガチャ]）で切替。`localStorage` に永続化。初回ロード時は HTML 描画前のインラインスクリプトで `data-mode` を即時設定して FOUC を防止。

#### ガチャモード（デフォルト）
- 申請書風の UI、レアリティ別の枠発光、ガチャ演出付き
- **PC（md 以上）では2カラムレイアウト + 区切り線**で快適な配置
- 丸ゴシック（Zen Maru Gothic）

#### シンプルモード
- 装飾控えめのミニマル shadcn UI、即時結果表示
- ニュートラルなモノクロ寄り配色、デフォルトの Geist フォント

### ガチャ演出（ガチャモード時のみ）
「ガチャを引く」押下後、フルスクリーンオーバーレイで以下のシーケンスを再生：

1. **intro_1**: アロナが封筒を持って登場（自動 1.0s）
2. **intro_2**: 封筒を振り上げる（自動 0.75s、軽くバウンス）
3. **slam**: 下に叩きつけ → 白フラッシュ＋衝撃波（自動 0.6s）
4. **cards**: ガチャ結果カード（★1/★2/★3 のデザイン別）を横一列に stagger drop。6枚以上で2列折り返し。クリック／タップ／Enter で次へ
5. **reveal**（カード枚数分繰り返し）
   - カードが左下から中央へ舞い込む（550ms）
   - 画面全体がホワイトアウト（300ms、フェードイン後維持）
   - ★3 かつ画像ありの場合のみ、画像を縦→横の Ken Burns で全画面演出（各 1.5s）
   - 白フェードアウトとシームレスにアニメ情報をフェードイン、クリック／タップ／Enter で次へ
6. **closing**: 最後のクリックでステージごとフェードアウト → 結果一覧がフェードイン

右上の `SKIP »` ボタンまたは Esc キーで演出を即時終了。

### レアリティ
| ティア | 条件 | 視覚 |
|---|---|---|
| ★3 虹 | `watchersCount >= 25,000` または (`watchersCount >= 12,000` AND `satisfactionRate >= 85%`) | 虹色アクセント、結果カードの虹色発光、ガチャ画面背景もパープル／ピンク基調へ |
| ★2 金 | `watchersCount >= 10,000`（虹に該当しない） | 金色アクセント、金光発光 |
| ★1 青 | それ以外（大半） | 青色アクセント |

### 結果表示
- 結果カード（ガチャモード時は申請書ストライプ風、簡易モード時はミニマル）
- 画像なし／取得失敗時は同サイズの `NO IMAGE` プレースホルダーへフォールバック
- **PC（1024px〜）のみ**: 右下に折り畳み可能な「結果一覧パネル」。タイトルクリックで該当カードへスムーズスクロール
- スクロール時、右下に「ページトップへ戻る」ボタンを表示
- ガチャ演出終了時は結果セクションへ自動スクロール

### レスポンシブ
- スマホ（〜768px）: ガチャ演出のアニメ情報画面はシングルカラム（タイトル → サムネ → 申請書 → リンクの順）
- スマホ時はアロナを `object-fit: cover` で縦80vh いっぱいに表示

---

## 隠しコマンド（DevTools コンソール）

ブラウザの DevTools コンソールで `cmd("/...")` を実行すると、開発者向けの設定切替や状態確認ができます。状態は localStorage に永続化されます。

| コマンド | 説明 |
|---|---|
| `cmd("/help")` | 利用可能コマンド一覧を表示 |
| `cmd("/state")` | 現在の各種設定を一覧表示 |
| `cmd("/season")` | 季節フィルタの表示切替（デフォルト非表示） |
| `cmd("/debug")` | APIリクエスト・レアリティ判定の詳細ログを切替 |
| `cmd("/anim")` | ガチャ演出の ON/OFF 切替（OFF で即結果表示） |
| `cmd("/max")` | 取得件数 UI を Slider ⇔ 数値入力で切替（1〜50件） |
| `cmd("/popularity tune <n>")` | 「人気のみ」の視聴登録閾値をカスタマイズ |
| `cmd("/reset")` | localStorage の全設定を初期化 |

ページロード時にコンソールに案内が自動出力されます。

---

## 技術スタック

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** + **shadcn/ui** + **base-ui**
- **Annict GraphQL API**（`graphql-request`）
- **Zod**（入力バリデーション）
- **sonner**（トースト）
- **next/font**（Zen Maru Gothic / Geist / Geist Mono）
- **@vercel/analytics** + **@vercel/speed-insights**
- **sharp**（画像変換スクリプト用、devDependency）
- **pnpm**（パッケージマネージャ）

---

## パフォーマンス最適化

- **画像最適化**: ガチャ用 PNG を `<picture>` 要素経由で AVIF/WebP に切替。`arona_*.png` (合計 5.6MB) → AVIF 133KB (約 **97%削減**)。`sharp` ベースの変換スクリプト同梱
- **CSS アニメ軽量化**: `card-fly-in` を `left/top` から `transform` のみに変更、`will-change` を要所に付与、★3 カードの `drop-shadow` を 3個→2個に削減
- **画像 preload**: `<head>` で AVIF を `type` 付き preload（非対応ブラウザはスキップ）
- **`prefers-reduced-motion` 対応**: OS 設定者には animation/transition を 0.01ms に短縮、装飾的な無限ループは完全停止

---

## アクセシビリティ

- セマンティック HTML、`aria-label` / `aria-pressed` / `aria-modal` などの ARIA 属性
- キーボード操作（ガチャ演出は `Enter` / `Space` で進行、`Esc` でスキップ）
- `prefers-reduced-motion` 対応
- レアリティを `aria-label` で読み上げ補助

---

## PWA / SEO

### PWA
- `manifest.json` / 192px・512px アイコン / Apple touch icon を完備
- Service Worker（`public/sw.js`）でプリキャッシュ + 同一オリジン GET キャッシュファースト戦略
- ホーム画面追加対応、Android はスプラッシュ画面も自動生成
- 開発時は SW を登録しない（HMR 競合回避）

### SEO
- `metadata` API で title template / description / keywords / authors / openGraph / twitter を網羅
- `src/app/opengraph-image.png` / `twitter-image.png` を配置（Next.js が自動で OGP メタタグを生成）
- **JSON-LD 構造化データ**（WebApplication schema）を `<head>` に注入
- `src/app/sitemap.ts` / `robots.ts` で `/sitemap.xml` / `/robots.txt` を自動配信

---

## セットアップ

### 1. 依存インストール

```bash
pnpm install
```

### 2. 環境変数

`.env.example` を `.env.local` にコピーし、Annict の個人アクセストークンを設定。

```bash
cp .env.example .env.local
```

```bash
# .env.local
ANNICT_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 任意：LAN 内の別端末（スマホ・別 PC 等）から dev サーバにアクセスする場合
# ALLOWED_DEV_ORIGINS=192.168.x.x,192.168.x.y
```

トークンは <https://annict.com/settings/apps> から発行できます。

### 3. 起動

```bash
pnpm dev
```

<http://localhost:3000> を開きます。

---

## アーキテクチャ

```
src/
├── app/
│   ├── api/anime/route.ts        # Annict GraphQL を呼ぶ Route Handler
│   ├── globals.css               # Tailwind + ガチャモード・演出・レスポンシブ用 CSS
│   ├── layout.tsx                # metadata / JSON-LD / preload / FOUC 抑制
│   ├── page.tsx                  # メイン画面 + 隠しコマンドハンドラ
│   ├── manifest.ts               # PWA manifest（自動配信）
│   ├── sitemap.ts                # /sitemap.xml（自動配信）
│   ├── robots.ts                 # /robots.txt（自動配信）
│   ├── icon.png                  # ファビコン
│   ├── apple-icon.png            # iOS ホーム画面アイコン
│   ├── opengraph-image.png       # OGP 画像
│   └── twitter-image.png         # Twitter Card 画像
├── components/
│   ├── search-form.tsx           # 検索フォーム（layout prop で stack/two-column 切替）
│   ├── anime-card.tsx            # 結果カード（モード別デザイン）
│   ├── gacha-sequence.tsx        # ガチャ演出のフルスクリーンオーバーレイ
│   ├── sw-register.tsx           # Service Worker 登録（本番のみ）
│   └── ui/                       # shadcn/ui プリミティブ
└── lib/
    ├── annict.ts                 # GraphQL クライアント / クエリ / ページネーション
    ├── seasons.ts                # 年→seasons 配列の展開
    ├── rarity.ts                 # レアリティ判定（watchersCount + satisfactionRate）
    └── utils.ts                  # cn ヘルパ

public/
├── logo.png                      # メインロゴ
├── icon-192.png / icon-512.png   # PWA icons
├── sw.js                         # Service Worker
└── gacha/                        # アロナ画像 / カード裏面（PNG + WebP + AVIF）

scripts/
├── convert-images.mjs            # PNG → AVIF + WebP 一括変換
└── generate-meta-assets.mjs      # OGP / apple-icon / PWA アイコン生成

.github/workflows/
└── lighthouse.yml                # PR/push ごとに Lighthouse 計測

.lighthouserc.json                # Lighthouse 閾値（perf 85% / a11y 90% / etc.）
```

### Annict API の制約と対処

- API には年単独・年範囲のフィルタが存在せず `seasons: [String!]`（例 `"2024-spring"`）のみ。クライアント側で年×季節を展開して送る（`src/lib/seasons.ts`）
- `WorkOrderField` は `WATCHERS_COUNT` / `SEASON` / `CREATED_AT` の3種のみ。「人気アニメ」は `WATCHERS_COUNT DESC` で代用
- **ランダム抽出は「上位最大1,000件（200件×5ページのカーソルページネーション）をプール → サーバーでフィルタ → シャッフル → 指定件数を返却」で実現**（`src/app/api/anime/route.ts`、`searchAnimeWorksPaginated`）
  - 200件のみだとプールが人気作偏重になり、ガチャの低レアが出ないため深掘りしている

### satisfactionRate の単位

`Float` 型でドキュメントに単位記載なし。0-1 スケール／0-100 スケールどちらでも動作するよう `rate <= 1 ? rate * 100 : rate` で正規化（`src/lib/rarity.ts`、`src/components/anime-card.tsx`）。

### 画像取得失敗時のフォールバック

- ガチャ演出：`revealIndex` 切替時に `new Image()` で preload して `onerror` を検知。失敗が判定済みなら ★3 でも Ken Burns をスキップして直接情報表示へ
- 結果カード：`<img onError>` で `imageError` フラグを立て、`NO IMAGE` プレースホルダーに自動フォールバック

---

## スクリプト

| コマンド | 説明 |
|---|---|
| `pnpm dev` | 開発サーバ起動 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番サーバ起動 |
| `pnpm lint` | ESLint 実行 |
| `node scripts/convert-images.mjs` | `public/gacha/*.png` を AVIF + WebP に一括変換 |
| `node scripts/generate-meta-assets.mjs` | OGP / Apple touch icon / PWA アイコンを再生成 |

---

## デプロイ（Vercel）

1. リポジトリを GitHub にプッシュ
2. <https://vercel.com/new> で GitHub アカウントでサインイン
3. 該当リポジトリを Import。Framework は Next.js で自動検出されます
4. **Environment Variables** で `ANNICT_TOKEN` を追加（Production / Preview / Development 全環境にチェック推奨）
5. **Deploy** をクリック

`vercel.json` で実行リージョンを東京（`hnd1`）に固定しているため、Annict API へのレイテンシが最小になります。

---

## 計測（Analytics / CI）

- **Vercel Web Analytics**: 実ユーザーのページビュー計測
- **Vercel Speed Insights**: Core Web Vitals（LCP / FID / CLS）の継続モニタリング
- **Lighthouse CI**（`.github/workflows/lighthouse.yml`）: PR/push ごとに Lighthouse スコアを自動計測。閾値: パフォーマンス 85% / アクセシビリティ 90% / ベストプラクティス 90% / SEO 90%

---

## ライセンス

MIT
