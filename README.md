# アニメルーレット -Anime Roulette-

[![CI](https://github.com/Sliip831143/anime-roulette/actions/workflows/ci.yml/badge.svg)](https://github.com/Sliip831143/anime-roulette/actions/workflows/ci.yml)
[![Lighthouse CI](https://github.com/Sliip831143/anime-roulette/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/Sliip831143/anime-roulette/actions/workflows/lighthouse.yml)
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
- [テスト](#テスト)
- [デプロイ（Vercel）](#デプロイvercel)
- [計測（Analytics / CI）](#計測analytics--ci)
- [開発体験（DX）](#開発体験dx)
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
   - ★3 かつ画像ありの場合のみ、画像を縦→横の Ken Burns で全画面演出（各 1.5s）。前半（縦パン）・後半（横パン）の開始時に一瞬の白フラッシュを挟み、光の中から画像が現れる
   - 白フェードアウトとシームレスにアニメ情報をフェードイン、クリック／タップ／Enter で次へ
6. **closing**: 最後のクリックでステージごとフェードアウト → 結果一覧がフェードイン

右上の `SKIP »` ボタンまたは Esc キーで演出を即時終了。

> **開発用デモ**: dev サーバで URL に `?gachatest=1` を付けてアクセスすると（例: `http://localhost:3000/?gachatest=1`）、検索を経由せずモックの ★3 作品でガチャ演出を即再生できます。出現頻度の低い「★3＋サムネイルあり」の Ken Burns 演出を素早く確認するための開発用導線で、リロードのたびに再実行できます。`NODE_ENV=production` のビルドでは fixture ごと読み込まれず無効化されます（`src/lib/gacha-test-fixture.ts`）。

### レアリティ
| ティア | 条件 | 視覚 |
|---|---|---|
| ★3 虹 | `watchersCount >= 22,000` または (`watchersCount >= 10,500` AND `satisfactionRate >= 83%`) | 虹色アクセント、結果カードの虹色発光、ガチャ画面背景もパープル／ピンク基調へ |
| ★2 金 | `watchersCount >= 5,800`（虹に該当しない） | 金色アクセント、金光発光 |
| ★1 青 | それ以外（大半） | 青色アクセント |

> [!NOTE]
> **レアリティはガチャ演出のための区分であり、作品を評価・格付けするものではありません。**
> Annict の視聴登録数など公開指標を「ガチャの当たり度合い」という演出上の見せ方に変換しているだけで、★1 だから作品として劣る／★3 だから優れている、といった意味は一切ありません。視聴登録数が少ない作品にも名作は数多くあり、本アプリはあくまで「次に観るアニメを楽しく選ぶ」ための演出としてレアリティを用いています。

### 結果表示
- 結果カード（ガチャモード時は申請書ストライプ風、簡易モード時はミニマル）
- 画像なし／取得失敗時は同サイズの `NO IMAGE` プレースホルダーへフォールバック
- **PC（1024px〜）のみ**: 右下に折り畳み可能な「結果一覧パネル」。タイトルクリックで該当カードへスムーズスクロール
- スクロール時、右下に「ページトップへ戻る」ボタンを表示
- ガチャ演出終了時は結果セクションへ自動スクロール
- **結果カードクリックで詳細ダイアログを開く**: タップ／クリック／Tab + Enter で
  モーダル表示。エピソード一覧（折りたたみ）／キャスト／スタッフ／放送局・開始日／
  Annict・公式サイト・Wikipedia・公式 X・ハッシュタグ検索の各外部リンク／X シェア
  ボタンを集約。Esc キー・背景クリック・×ボタンで閉じる。React Portal で `document.body`
  直下にレンダリングして、結果エリアのスタッキングコンテキストに引きずられず viewport
  全体に表示
- **X (Twitter) シェアボタン**: 詳細ダイアログから作品単位でツイート。
  シェアされた URL（`/share`）は **動的 OGP**（next/og + Edge runtime）でレアリティ別の
  画像が表示される
- **「結果をシェア」一括シェア**: 結果セクションの見出し横のボタンから、ガチャ結果一覧を
  ひとつのツイートに整形。X 仕様の文字数（CJK 2 カウント・URL 23 固定 / 280 上限）を
  厳密にカウントし、超過分は末尾から削って「…他N件」に省略。シェア URL は `?from=x` で
  X 側の OGP キャッシュをバスト

### エラー体験
- React **Error Boundary**（`app/error.tsx`）で予期しないエラーを捕捉し、「もう一度試す」「トップへ戻る」を提示
- **オフライン検知**（`navigator.onLine` + online/offline イベント）で接続喪失を toast 通知
- API 取得失敗時は結果セクション上部に **「もう一度引く」リトライ UI** を表示（直前の検索条件を保持）

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
- **Vitest**（単体テスト）
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
- **キーボードフォーカスリングの統一**: 全フォーム部品（input / checkbox / radio / slider / 送信ボタン）に同一トーンの薄青リング（簡易モードはグレー）を `:focus-visible` / `:focus-within` で適用
- **カーソル統一**: 送信ボタン・スライダー thumb・結果バッジの ×ボタンなど操作可能要素はすべて `cursor: pointer` に揃え、Base UI の隠し input が UA stylesheet で `cursor:default` を上書きする問題にも対処
- **結果カードのキーボード操作**: `role="button"` + `tabIndex={0}` で Tab フォーカス可能化、Enter / Space で詳細ダイアログを開く。ダイアログは `role="dialog"` + `aria-modal="true"` でセマンティクスを明示し、Esc で閉じる

---

## PWA / SEO

### PWA
- `manifest.json` / 192px・512px アイコン / Apple touch icon を完備
- Service Worker（`public/sw.js`）: 静的アセットのプリキャッシュ + 用途別キャッシュ戦略
  - HTML ナビゲーションは**ネットワーク優先**（最新デプロイの JS バンドルを確実に参照させ、旧 HTML 固定化を防止）
  - ハッシュ付き `/_next/static`・画像など同一オリジン GET は**キャッシュファースト**
  - `/api/*`・`/_next/data/*` は常にネットワーク優先、外部オリジン（Annict CDN 等）は介入せずパススルー
- ホーム画面追加対応、Android はスプラッシュ画面も自動生成
- 開発時は SW を登録しない（HMR 競合回避）

### SEO
- `metadata` API で title template / description / keywords / authors / openGraph / twitter / robots.googleBot / formatDetection を網羅
- **静的 OGP**: `src/app/opengraph-image.png` / `twitter-image.png`（ロゴ + 「Anime Roulette」サブタイトルを上下中央配置）を `scripts/generate-meta-assets.mjs` で生成
- **動的 OGP**: `app/api/og/route.tsx`（Edge runtime + `next/og`）で「○○が出ました」シェア画像を動的生成。`/share?title=…&rarity=…&id=…` から参照。レアリティ別の色（★1 青 / ★2 黄 / ★3 ピンク紫）の SVG 星アイコンを描画
- **JSON-LD 構造化データ**: WebApplication / **FAQPage** / **HowTo** schema の 3 種を `<head>` に注入。リッチリザルトテストで FAQ が「有効なアイテム」として検出済み
- `src/app/sitemap.ts` / `robots.ts` で `/sitemap.xml` / `/robots.txt` を自動配信
- **Google Search Console** に登録済み（meta verification + sitemap 送信）

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
│   ├── api/anime/route.ts        # Annict GraphQL を呼ぶ Route Handler（zod 検証付き）
│   ├── api/anime/schema.test.ts  # 入力 zod スキーマの境界値テスト
│   ├── api/anime/[id]/route.ts   # 単一作品の詳細取得 API（モーダル表示用）
│   ├── api/og/route.tsx          # 動的 OGP 画像生成（next/og + Edge runtime）
│   ├── share/page.tsx            # シェアランディング（generateMetadata で動的 OGP）
│   ├── error.tsx                 # Error Boundary（リトライ / トップへ戻る）
│   ├── globals.css               # Tailwind + ガチャモード・演出・レスポンシブ用 CSS
│   ├── layout.tsx                # metadata / JSON-LD（WebApplication / FAQ / HowTo） / prefetch / FOUC 抑制
│   ├── page.tsx                  # メイン画面 + 隠しコマンドハンドラ + オフライン検知 + リトライ UI
│   ├── manifest.ts               # PWA manifest（自動配信）
│   ├── sitemap.ts                # /sitemap.xml（自動配信）
│   ├── robots.ts                 # /robots.txt（自動配信）
│   ├── icon.png                  # ファビコン
│   ├── apple-icon.png            # iOS ホーム画面アイコン
│   ├── opengraph-image.png       # OGP 画像（静的フォールバック）
│   └── twitter-image.png         # Twitter Card 画像（静的フォールバック）
├── components/
│   ├── search-form.tsx           # 検索フォーム（layout prop で stack/two-column 切替）
│   ├── anime-card.tsx            # 結果カード（モード別デザイン、クリックで詳細ダイアログ）
│   ├── anime-detail-dialog.tsx   # 結果カード詳細モーダル（Portal + Esc クローズ、外部リンク集約）
│   ├── gacha-sequence.tsx        # ガチャ演出のフルスクリーンオーバーレイ（intro〜reveal〜closing）
│   ├── sw-register.tsx           # Service Worker 登録（本番のみ）
│   └── ui/                       # shadcn/ui プリミティブ
└── lib/
    ├── annict.ts                 # GraphQL クライアント / クエリ / ページネーション
    ├── seasons.ts                # 年→seasons 配列の展開
    ├── seasons.test.ts           # seasons 展開の境界値・順序保持テスト
    ├── rarity.ts                 # レアリティ判定（watchersCount + satisfactionRate）
    ├── rarity.test.ts            # レアリティ判定の単体テスト（100% カバー）
    ├── share.ts                  # X (Twitter) シェア URL ビルダー（個別 + 一括、X カウント仕様準拠）
    ├── share.test.ts             # 一括シェアテキスト生成の境界値・X カウント・省略ロジックのテスト
    ├── gacha-test-fixture.ts     # 開発用ガチャ演出デモ（?gachatest=1）のモック★3作品
    └── utils.ts                  # cn ヘルパ

public/
├── logo.png                      # メインロゴ
├── icon-192.png / icon-512.png   # PWA icons
├── sw.js                         # Service Worker
└── gacha/                        # アロナ画像 / カード裏面（PNG + WebP + AVIF）

scripts/
├── convert-images.mjs            # PNG → AVIF + WebP 一括変換
└── generate-meta-assets.mjs      # OGP / apple-icon / PWA アイコン生成

.github/
├── workflows/
│   ├── ci.yml                    # PR/push ごとに lint → typecheck → test:run
│   └── lighthouse.yml            # PR/push ごとに Lighthouse 計測
└── dependabot.yml                # npm / GitHub Actions の週次自動更新 PR

.husky/pre-commit                 # pnpm exec lint-staged を実行（pre-commit hook）

CLAUDE.md                         # プロジェクト固有の Claude 指示（コミット時の README 同期ワークフロー等）
.lighthouserc.json                # Lighthouse 閾値（perf 85% / a11y 90% / etc.）
.editorconfig                     # エディタ統一（utf-8 / LF / 2スペ）
.nvmrc                            # Node 22 (LTS)
.vscode/{settings,extensions}.json  # ワークスペース推奨設定・推奨拡張
```

### Annict API の制約と対処

- API には年単独・年範囲のフィルタが存在せず `seasons: [String!]`（例 `"2024-spring"`）のみ。クライアント側で年×季節を展開して送る（`src/lib/seasons.ts`）
- `WorkOrderField` は `WATCHERS_COUNT` / `SEASON` / `CREATED_AT` の3種のみ。「人気アニメ」は `WATCHERS_COUNT DESC` で代用
- **ランダム抽出は「上位最大2,600件（200件×13ページのカーソルページネーション）をプール → サーバーでフィルタ → シャッフル → 指定件数を返却」で実現**（`src/app/api/anime/route.ts`、`searchAnimeWorksPaginated`）
  - 200件のみだとプールが人気作偏重になり、ガチャの低レアが出ないため深掘りしている
  - プールは seasons の組み合わせごとに module スコープでキャッシュ（TTL 24時間）。カーソルページネーションは直列のためページ数に比例して取得が遅くなるが、2回目以降のガチャはキャッシュ命中で Annict 取得ゼロ（フィルタ＋シャッフルのみ）で即応答する
- **`Work` には `organizations` / `ratingsCount` フィールドが存在しない**（GraphQL introspection で確認済み）。詳細ダイアログでは取得しない
- **`Staff.roleOther` はスキーマ宣言が non-nullable だが実データで null が返る**ことがあり、GraphQL の error propagation で staff レコード全体が消失する。詳細取得クエリでは `roleOther` を含めず、職位は `roleText` のみで運用

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
| `pnpm lint:fix` | ESLint で自動修正 |
| `pnpm typecheck` | `tsc --noEmit` で型チェック |
| `pnpm test` | Vitest を Watch モードで起動 |
| `pnpm test:run` | テストを1回実行（CI 向け） |
| `pnpm test:coverage` | カバレッジレポート生成（`coverage/index.html`） |
| `pnpm analyze` | `@next/bundle-analyzer` でバンドルサイズの HTML レポートを生成 |
| `node scripts/convert-images.mjs` | `public/gacha/*.png` を AVIF + WebP に一括変換 |
| `node scripts/generate-meta-assets.mjs` | OGP / Apple touch icon / PWA アイコンを再生成 |

---

## テスト

[Vitest](https://vitest.dev/) による単体テストを整備。

### カバー対象（4 ファイル / 計 53 ケース）
- **`src/lib/rarity.test.ts`**: レアリティ判定（`getRarity`）の境界値テスト（16 ケース、100% カバー）
- **`src/lib/seasons.test.ts`**: 年→seasons 展開ロジック (`expandSeasons`) と `isSeason` の境界・順序保持・エラー系
- **`src/app/api/anime/schema.test.ts`**: API route の zod スキーマ（querySchema）の正常・異常系。デフォルト値、年範囲、count 上下限、enum 検証、`highRated` の boolean 変換まで
- **`src/lib/share.test.ts`**: 一括シェアテキスト (`buildBatchTweetText`) の境界値。X 仕様のカウント（CJK 2 / URL 23 / 上限 280）、超過時の「…他N件」省略、ヘッダー/フッター整形を保証

### 実行

```bash
pnpm test           # Watch モード（ファイル変更で自動再実行）
pnpm test:run       # 1回実行（CI 向け）
pnpm test:coverage  # カバレッジレポート生成 → coverage/index.html
```

### 設計方針
- **コロケーション**: テストファイルは対象ファイルと同じディレクトリに配置（`rarity.ts` の隣に `rarity.test.ts`）
- **境界値・null・スケール変換** を重点的に確認し、回帰を防止
- `src/components/ui/**` （shadcn）は外部ライブラリ扱いでカバレッジ対象外

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
- **Google Search Console**: 検索パフォーマンス・構造化データ・インデックス状況のモニタリング（meta verification 済み）
- **Lighthouse CI**（`.github/workflows/lighthouse.yml`）: PR/push ごとに Lighthouse スコアを自動計測。アサートは **カテゴリスコア (performance / accessibility / best-practices / seo) のみ・すべて `warn` 判定**で運用（個別 audit は無視し、CI を緑のまま継続モニタリング）
- **CI / verify**（`.github/workflows/ci.yml`）: PR/push ごとに `pnpm lint` → `pnpm typecheck` → `pnpm test:run` を実行。Node バージョンは `.nvmrc` から取得（**Node 22 LTS**）

## 開発体験（DX）

- **Husky + lint-staged**: pre-commit でステージしたファイルのみ `eslint --fix` を実行
- **Dependabot**（`.github/dependabot.yml`）: npm 依存と GitHub Actions の週次自動 PR。マイナー/パッチはまとめて 1 PR
- **`.editorconfig`** / **`.nvmrc`** / **`.vscode/{settings,extensions}.json`**: エディタ・Node バージョンを統一、保存時 ESLint 自動修正、推奨拡張を共有

---

## ライセンス

MIT
