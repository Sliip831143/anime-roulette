# アニメルーレット -Anime Roulette-

Annict GraphQL API を使って、観るアニメの候補をランダム抽出する Next.js アプリ。
ブルーアーカイブ風 UI の「ガチャモード」と、shadcn ベースの「簡易モード」を切り替え可能。

## 機能

### フィルタ
- 放送年（単年・範囲・未指定）
- 季節（春／夏／秋／冬、年指定時のみ）
- 人気度ティア（すべて／人気のみ／超人気のみ）
- 高評価のみ（満足度70%以上）
- メディア種別（TV／映画／OVA／Web／その他、デフォルトはTVのみ）
- 取得件数 1〜10件

### モード切替
ヘッダー右上のセグメントピル（[簡易][ガチャ]）で切替。`localStorage` に永続化、初回ロード時は HTML 描画前のインラインスクリプトで `data-mode` を即時設定して FOUC を防止。

#### ガチャモード（デフォルト）
- 青〜パステルの背景、斜めライン＋三角形の幾何模様（★3 を含む結果ではパープル／ピンク基調へ自動切替）
- 丸ゴシック（Zen Maru Gothic）
- 申請書風アニメ情報 UI（中央サムネ／右上 `ANIME ARCHIVE` カルテ／左下タイトルバー）
- レアリティ別の枠発光（青／金／虹）
- 「ガチャを引く」CTA／ロゴ画像／申請書スタイルの結果カード

#### 簡易モード
- 装飾控えめのミニマル shadcn UI
- 演出なしで即時に結果一覧を表示
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

### レアリティティア
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
- スマホ時はアロナを `object-fit: cover` で縦80vhいっぱいに表示

## 技術スタック

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui + base-ui
- Annict GraphQL API（`graphql-request`）
- next/font（Zen Maru Gothic / Geist / Geist Mono）
- Zod（入力バリデーション）
- sonner（トースト）
- pnpm

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

```
ANNICT_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

トークンは https://annict.com/settings/apps から発行できます。

### 3. 起動

```bash
pnpm dev
```

http://localhost:3000 を開きます。

## アーキテクチャ

```
src/
├── app/
│   ├── api/anime/route.ts   # Annict GraphQL を呼ぶ Route Handler
│   ├── globals.css          # Tailwind + ガチャモード／演出／レスポンシブ用 CSS
│   ├── layout.tsx           # next/font 読込、data-mode 初期化スクリプト
│   ├── icon.png             # ファビコン（紫×ロゴ）
│   └── page.tsx             # メイン画面（モード切替 / 結果表示 / 戻るボタン / 結果一覧パネル）
├── components/
│   ├── search-form.tsx      # 検索フォーム
│   ├── anime-card.tsx       # 結果カード（ガチャ用申請書ストライプ／簡易用ミニマル）
│   ├── gacha-sequence.tsx   # ガチャ演出のフルスクリーンオーバーレイ
│   └── ui/                  # shadcn/ui プリミティブ
├── lib/
│   ├── annict.ts            # GraphQL クライアント / クエリ / ページネーション
│   ├── seasons.ts           # 年→seasons配列の展開
│   ├── rarity.ts            # レアリティ判定（watchersCount + satisfactionRate）
│   └── utils.ts             # cn ヘルパ
└── public/
    ├── logo.png             # メインロゴ
    └── gacha/               # アロナ画像・カード裏面画像（★1/★2/★3）
```

### Annict API の制約と対処

- API には年単独・年範囲のフィルタが存在せず `seasons: [String!]`（例 `"2024-spring"`）のみ。クライアント側で年×季節を展開して送る (`src/lib/seasons.ts`)。
- `WorkOrderField` は `WATCHERS_COUNT` / `SEASON` / `CREATED_AT` の3種のみ。「人気アニメ」は `WATCHERS_COUNT DESC` で代用。
- **ランダム抽出は「上位最大1,000件（200件×5ページのカーソルページネーション）をプール → サーバーでフィルタ → シャッフル → 指定件数を返却」で実現** (`src/app/api/anime/route.ts`、`searchAnimeWorksPaginated`)。
  - 200件のみだとプールが人気作偏重になり、ガチャの低レアが出ないため深掘りしている。

### satisfactionRate の単位

`Float` 型でドキュメントに単位記載なし。0-1スケール／0-100スケールどちらでも動作するよう `rate <= 1 ? rate * 100 : rate` で正規化 (`src/lib/rarity.ts`、`src/components/anime-card.tsx`)。

### 画像取得失敗時のフォールバック

- ガチャ演出：`revealIndex` 切替時に `new Image()` で preload して `onerror` を検知。失敗が判定済みなら ★3 でも Ken Burns をスキップして直接情報表示へ
- 結果カード：`<img onError>` で `imageError` フラグを立て、`NO IMAGE` プレースホルダーに自動フォールバック

## デプロイ（Vercel）

1. リポジトリを GitHub にプッシュ。
2. https://vercel.com/new を開き、GitHub アカウントでサインイン。
3. 該当リポジトリを Import。Framework は Next.js で自動検出されます。
4. **Environment Variables** で `ANNICT_TOKEN` を追加（Production / Preview / Development 全環境にチェック推奨）。
5. **Deploy** をクリック。

`vercel.json` で実行リージョンを東京（`hnd1`）に固定しているため、Annict API へのレイテンシが最小になります。

## ライセンス

MIT
