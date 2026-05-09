# Anime Roulette

Annict GraphQL API を使って、観るアニメの候補をランダム抽出する Next.js アプリ。

## 機能

- 放送年（単年・範囲・未指定）でフィルタ
- 季節（春／夏／秋／冬）でフィルタ（年指定時のみ）
- 1〜20件の取得件数指定
- 人気上位50作品プールから指定件数をランダム抽出

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Annict GraphQL API（`graphql-request`）
- Zod（入力バリデーション）
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
│   ├── layout.tsx
│   └── page.tsx             # メイン画面
├── components/
│   ├── search-form.tsx      # 検索フォーム
│   ├── anime-card.tsx       # 結果カード
│   └── ui/                  # shadcn/ui プリミティブ
└── lib/
    ├── annict.ts            # GraphQL クライアント / クエリ
    ├── seasons.ts           # 年→seasons配列の展開
    └── utils.ts             # cn ヘルパ
```

### Annict API の制約と対処

- API には年単独・年範囲のフィルタが存在せず `seasons: [String!]`（例 `"2024-spring"`）のみ。クライアント側で年×季節を展開して送る (`src/lib/seasons.ts`)。
- `WorkOrderField` は `WATCHERS_COUNT` / `SEASON` / `CREATED_AT` の3種のみ。「人気アニメ」は `WATCHERS_COUNT DESC` で代用。
- ランダム抽出は「人気上位50件をプール → サーバーでシャッフル → 指定件数を返却」で実現 (`src/app/api/anime/route.ts`)。

## デプロイ（AWS Amplify Hosting）

1. リポジトリを GitHub にプッシュ。
2. Amplify Console で「Host web app」→ GitHub 連携でリポジトリを選択。
3. ビルド設定は `amplify.yml` が自動検出されます。
4. 環境変数 `ANNICT_TOKEN` を Amplify Console の「環境変数」に追加。
5. デプロイ実行。

`.next` を artifact として SSR/Route Handler が動作するよう Amplify がコンピュートを自動構成します。

## ライセンス

MIT
