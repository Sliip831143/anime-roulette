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
> ブルーアーカイブ風 UI。ガチャ演出はヘッダーのスイッチで ON/OFF を切り替え可能。

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
- [開発ガイド](#開発ガイド)
- [Claude Code との協働](#claude-code-との協働)
- [ライセンス](#ライセンス)

---

## 主な機能

### 検索フィルタ
- 放送年（単年・範囲・未指定）。**「🎲 ランダム」ボタン**で範囲内から1年を自動抽選してバッジ表示
- **「今期」ボタン**（ランダムの横）: 現在月が属するクール（1〜3月 冬 / 4〜6月 春 / 7〜9月 夏 / 10〜12月 秋）に放送を始めた作品だけから抽選し、「2026年秋アニメで抽選」のようにバッジ表示。前クールからの継続作品は含めない。放送開始直後は視聴登録数・満足度が溜まっておらず 0 件になりやすいため、ON の間は年・季節・人気度・高評価を無効にし、メディア種別と取得件数だけを効かせる（`src/lib/seasons.ts` の `getCurrentSeason`）
- 季節（春／夏／秋／冬）。年を手入力したとき、または「🎲 ランダム」で本年以外の年が選ばれたときに有効（ランダムで本年が選ばれた場合は未放送の季節を含みうるため無効）※デフォルトは非表示、隠しコマンドで表示
- 人気度ティア（すべて／人気のみ／超人気のみ）。**「人気のみ」の閾値は隠しコマンドでカスタマイズ可能**
- 高評価のみ（満足度70%以上）
- メディア種別（TV／映画／OVA／Web、デフォルトは TV のみ）
- 取得件数 1〜10件（**隠しコマンドで 1〜50件 の数値入力モードへ拡張可能**）。「募集回数: n回」と表示

### 演出切替
ヘッダー右上の「演出」スイッチでガチャ演出の ON/OFF を切替（デフォルト ON）。`localStorage` に永続化。OFF のときは演出を飛ばして結果を即時表示する。
以前あった「簡易モード」（shadcn ベースの別テーマ）は廃止し、簡易モードを選んでいた場合は初回ロード時に演出 OFF へ引き継ぐ。**PC（md 以上）では2カラムレイアウト + 区切り線**で配置。

#### 画面テーマ
- 申請書風の UI、レアリティ別の枠発光、ガチャ演出付き。「ガチャを引く」ボタンの左に宝石のアイコンを添える
- 丸ゴシック（Zen Maru Gothic）
- ガチャ結果がない間（未抽選・0 件）だけ、フォームの下にアロナの立ち絵（装飾）を表示。フォームの下に残った高さだけを使ってスクロールを出さず、画像の下側は画面下端で見切れさせる。クリックでブルーアーカイブ公式サイトを新しいタブで開く。結果表示中から引き直したときは、取得中〜演出終了まで表示しない
- 立ち絵の表示中は 20 秒ごとに、立ち絵が 2 回小さく跳ねて右上にハートの吹き出しを約 2.5 秒表示する（操作の有無に関係なく繰り返す。`prefers-reduced-motion` の環境では出さない。`src/components/use-periodic-cheer.ts`）
- 「超人気のみ」「高評価のみ」のどちらかを選んでいる間と、★3 を含む結果を表示している間は、ページ背景を★3演出と同じパープル／ピンク基調にする。結果の表示中に両方の条件を外した場合は、次に引き直すまで元の背景に戻す

### ガチャ演出（演出 ON 時）
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

閾値は抽選プール規模（`src/app/api/anime/route.ts` の `POOL_PAGES` = 13 ページ × 200 件 ≒ 2,600 件）に対して ★3 ≈ 2% / ★2 ≈ 10% になるよう実測で調整した値。**プール規模と閾値はセット**なので、`POOL_PAGES` を変えたら閾値も再調整し、`src/lib/rarity.ts`（判定＋doc コメント）/ `src/lib/rarity.test.ts` / 上記の表を揃えて更新する。

> [!NOTE]
> **レアリティはガチャ演出のための区分であり、作品を評価・格付けするものではありません。**
> Annict の視聴登録数など公開指標を「ガチャの当たり度合い」という演出上の見せ方に変換しているだけで、★1 だから作品として劣る／★3 だから優れている、といった意味は一切ありません。視聴登録数が少ない作品にも名作は数多くあり、本アプリはあくまで「次に観るアニメを楽しく選ぶ」ための演出としてレアリティを用いています。

### 結果表示
- 結果カード（申請書ストライプ風）
- 画像なし／取得失敗時は同サイズの `NO IMAGE` プレースホルダーへフォールバック
- **PC（1024px〜）のみ**: 右下に折り畳み可能な「結果一覧パネル」。タイトルクリックで該当カードへスムーズスクロール
- スクロール時、右下に「ページトップへ戻る」ボタンを表示（図鑑ページも同様）
- ガチャ演出終了時は結果セクションへ自動スクロール
- **結果カードクリックで詳細ダイアログを開く**: タップ／クリック／Tab + Enter で
  モーダル表示。エピソード一覧（折りたたみ）／キャスト／スタッフ／放送局・開始日／
  Annict・公式サイト・Wikipedia・公式 X・ハッシュタグ検索の各外部リンク／X シェア
  ボタンを集約。Esc キー・背景クリック・×ボタンで閉じる。React Portal で `document.body`
  直下にレンダリングして、結果エリアのスタッキングコンテキストに引きずられず viewport
  全体に表示
- **サムネイル画像クリックで拡大プレビュー**: 画像取得成功時のみサムネイルをクリック可能にし、
  全画面オーバーレイで原寸画像（`object-contain`）を表示。背景クリック・×ボタン・Esc で閉じる。
  プレビュー表示中の Esc は capture フェーズで先取りし、詳細ダイアログ本体は閉じない
- **X (Twitter) シェアボタン**: 詳細ダイアログから作品単位でツイート。
  シェアされた URL（`/share`）は **動的 OGP**（next/og）でレアリティ別の
  画像が表示される
- **「結果をシェア」一括シェア**: 結果セクションの見出し横のボタンから、ガチャ結果一覧を
  ひとつのツイートに整形。X 仕様の文字数（CJK 2 カウント・URL 23 固定 / 280 上限）を
  厳密にカウントし、超過分は末尾から削って「…他N件」に省略。シェア URL は `?from=x` で
  X 側の OGP キャッシュをバスト
- **視聴状態トグル（観た / 後で観る / 興味なし）**: 結果カード・詳細ダイアログから直接マークでき、
  以後の抽選から除外される。3 区画を連結した 1 本のピルで、未選択はアイコンのみ・選択中だけラベル表示
  にしてカード幅を広げない。「観た」作品には丸いハートの **お気に入り** 印を付けられる（詳細は次の「図鑑と抽選除外」）

### 図鑑と抽選除外（ローカル完結）
- ガチャ結果に表示された作品を **localStorage に自動記録**。視聴状態はサーバーに一切
  送信しない（ログイン不要・ローカル完結の思想）。初回入手時のレアリティ等を
  スナップショットとして保持し、かぶり時は入手回数のみ加算
- **「観た / 後で観る / 興味なし」のいずれかを付けた作品は以後の抽選から除外**。除外リストはサーバーへ送らず、
  多め取得（指定件数×3、API 上限 100）した結果をクライアント側でフィルタ。
  除外の影響で件数が不足した場合は原因別（除外起因／候補自体が少ない）のトーストで案内し、
  全件除外時は結果エリアに図鑑への導線を常設表示
- **お気に入り**: 「観た」作品にだけ付けられる印（結果カードと図鑑カードは右上、詳細ダイアログは状態ボタンの隣）。
  `favorite ⇒ watched` を不変条件とし、「観た」以外に切り替えると自動的に外れる。旧データ（お気に入り欄なし）は
  読み込み時に false として扱う
- **図鑑ページ（`/collection`）**: 収集数・レアリティ内訳・「観た」数・「お気に入り」数・「通算N連」の統計、
  フィルタ（レアリティ / 観た / 後で観る / 興味なし / お気に入り）と並び順（新しい順 / 古い順 / レアリティ順）、
  無限スクロール（24件ずつ描画、IntersectionObserver で先読み）
- **リセット**: 「観た」の一括解除（記録は残る。お気に入りの印も外れる）と図鑑の全削除。どちらもテーマに合わせた
  自前の確認ダイアログ（`role="alertdialog"`、初期フォーカスはキャンセル、破壊的操作のみ
  destructive 色）で誤操作を防止
- 図鑑へはヘッダーのリンク（640px 以上）またはスマホ用の左下固定ボタンから遷移。
  どちらも収集数バッジ付き。星は結果カードと同じ色で、白地でも見えるよう細い輪郭線を付ける
- 保存はトグル連打を考慮した **300ms デバウンス**（ページ離脱・遷移時は即時フラッシュ）。
  破損・改ざんデータは読み込み時にエントリ単位で検証して黙って捨てる（正常分は温存）

### エラー体験
- React **Error Boundary**（`app/error.tsx`）で予期しないエラーを捕捉し、「もう一度試す」「トップへ戻る」を提示
- **オフライン検知**（`navigator.onLine` + online/offline イベント）で接続喪失を toast 通知
- API 取得失敗時は結果セクション上部に **「もう一度引く」リトライ UI** を表示（直前の検索条件を保持）
- **上流エラーの詳細はマスキング**: Annict API 由来のエラー（GraphQL クエリ全文等を含む）はサーバーログにのみ記録し、ユーザーには「アニメ情報の取得に失敗しました…」等の汎用メッセージのみ表示
- **Annict のレート制限（429）に追随**（`src/lib/annict-rate-limit.ts`）: `Retry-After` が短時間（10 秒以内）なら待って 1 回だけ再試行し、それでも解消しなければ 502 ではなく **429 + `Retry-After`** を返して「Annict が混み合っています」と案内する。Route Handler の 40 秒制限内で 13 ページ取得を完走させるため、長い待ちは諦めて早期に返す設計
- **図鑑の保存失敗**（容量超過・ストレージ無効等）はアプリ本体を止めず、`console.warn` ＋初回のみのトーストで通知。localStorage へのアクセス自体が例外を投げる環境（Cookie 全ブロック等）でも設定読み書きは安全にフォールバック

### レスポンシブ
- スマホ（〜768px）: ガチャ演出のアニメ情報画面はシングルカラム（タイトル → サムネ → 申請書 → リンクの順）
- スマホ時はアロナを `object-fit: cover` で縦80vh いっぱいに表示
- フォーム下の立ち絵は PC / スマホで最大の高さと見せる割合を切り替え（スマホは小さめにして袖のあたりまで映す）。残り高さが 120px 未満の画面では非表示

---

## 隠しコマンド（DevTools コンソール）

ブラウザの DevTools コンソールで `cmd("/...")` を実行すると、開発者向けの設定切替や状態確認ができます。状態は localStorage に永続化されます。

| コマンド | 説明 |
|---|---|
| `cmd("/help")` | 利用可能コマンド一覧を表示 |
| `cmd("/state")` | 現在の各種設定を一覧表示 |
| `cmd("/season")` | 季節フィルタの表示切替（デフォルト非表示） |
| `cmd("/debug")` | APIリクエスト・レアリティ判定の詳細ログを切替 |
| `cmd("/max")` | 取得件数 UI を Slider ⇔ 数値入力で切替（1〜50件） |
| `cmd("/popularity tune <n>")` | 「人気のみ」の視聴登録閾値をカスタマイズ |
| `cmd("/reset")` | 設定を初期化（蓄積資産の図鑑は保持。`cmd("/reset all")` で図鑑データも削除） |

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
- **Vitest** + **Testing Library**（単体テスト。フックのテストのみ jsdom 環境）
- **sharp**（画像変換スクリプト用、devDependency）
- **pnpm**（パッケージマネージャ）

---

## パフォーマンス最適化

- **画像最適化**: ガチャ用 PNG を `<picture>` 要素経由で AVIF/WebP に切替。演出用の `arona_1.png` / `arona_2.png` (合計 5.6MB) → AVIF 133KB (約 **97%削減**)。`sharp` ベースの変換スクリプト同梱
- **CSS アニメ軽量化**: `card-fly-in` を `left/top` から `transform` のみに変更、`will-change` を要所に付与、★3 カードの `drop-shadow` を 3個→2個に削減
- **画像 preload**: `<head>` で AVIF を `type` 付き preload（非対応ブラウザはスキップ）
- **演出の遅延読み込み**: `GachaSequence` は `next/dynamic`（`ssr: false`）で初期バンドルから切り離す。「ガチャを引く」押下時に Annict API の通信と並行して先読みし、読み込みに失敗した場合は演出を飛ばして結果を直接表示する
- **`prefers-reduced-motion` 対応**: OS 設定者には animation/transition を 0.01ms に短縮、装飾的な無限ループは完全停止

---

## アクセシビリティ

- セマンティック HTML、`aria-label` / `aria-pressed` / `aria-modal` などの ARIA 属性
- キーボード操作（ガチャ演出は `Enter` / `Space` で進行、`Esc` でスキップ）
- `prefers-reduced-motion` 対応
- レアリティを `aria-label` で読み上げ補助
- **キーボードフォーカスリングの統一**: 全フォーム部品（input / checkbox / radio / slider / 送信ボタン）に同一トーンの薄青リングを `:focus-visible` / `:focus-within` で適用
- **カーソル統一**: 送信ボタン・スライダー thumb・結果バッジの ×ボタンなど操作可能要素はすべて `cursor: pointer` に揃え、Base UI の隠し input が UA stylesheet で `cursor:default` を上書きする問題にも対処
- **結果カードのキーボード操作**: 「詳細を開く」操作はカード内のタイトル（実 `button`、`aria-label` に作品名）に集約し、Tab でフォーカスして Enter / Space で詳細ダイアログを開く。カード全体にはマウス用の冗長な onClick だけを付け、内側のボタン起点のクリックは無視する（カード自体を `role="button"` にすると内側の状態ボタンが ARIA 的に無効化されるため）。ダイアログは `role="dialog"` + `aria-modal="true"` でセマンティクスを明示し、Esc で閉じる
- **フォーカストラップ**（`use-focus-trap.ts`）: 詳細ダイアログ・画像プレビュー・ガチャ演出・確認ダイアログの表示中は Tab / Shift+Tab をモーダル内で循環させ、クローズ時は開く前の要素へフォーカスを復帰
- **視聴状態ピルの読み上げ**: アイコンのみの区画にも `aria-label` / `title` を付け、`role="group"`（視聴状態）でまとめる。お気に入りは `aria-pressed` 付きのトグル
- **図鑑のフォーカス管理**: 状態・お気に入りのフィルタ表示中に、状態トグルやお気に入り解除でカードが消えた場合、フォーカスが body に落ちないよう現在のフィルタチップへ退避。無限スクロールの進行は `aria-live` でスクリーンリーダーへ通知し、レアリティは ★ 記号の記号読みを避けて sr-only の数値表現（「レアリティ3」等）で補完
- **リセット確認ダイアログ**: `role="alertdialog"` ＋初期フォーカスをキャンセルボタンに置き、開いた直後の Enter で破壊的操作が実行されない設計

---

## セキュリティ

- **入力バリデーション**: API の全クエリを zod で検証。放送年はデータが存在する 1991〜現在年にサーバー側でクランプし、任意の年範囲指定によるキャッシュキーの組み合わせ爆発（キャッシュミス誘発 → Annict への大量フェッチ）を防止
- **エラーマスキング**: 上流（Annict GraphQL）のエラー詳細はサーバーログのみに記録し、クライアントには汎用メッセージを返す
- **外部 URL の無害化**（`src/lib/safe-url.ts`）: Annict 由来の `officialSiteUrl` / `wikipediaUrl` は http/https スキームのみ許可してから `<a href>` に渡す。図鑑（localStorage）由来の `imageUrl` も読み込み時に同じ無害化を適用
- **localStorage データの検証**: 図鑑データは読み込み時にエントリ単位で型・値域を検証し（レアリティ / 状態の許容値、数値の有限性、季節・メディアの enum）、破損・改ざんエントリは黙って捨てて正常分のみ温存する
- **シェアページのなりすまし対策**: `/share` と `/api/og` はタイトル・レアリティを URL クエリから受け取らず、`id`（数値のみ許可）から Annict の実データをサーバー側で取得して表示する。旧形式 URL の `title` / `rarity` パラメータは無視される
- **セキュリティヘッダ**（`next.config.ts`）: `X-Content-Type-Options: nosniff` / `Referrer-Policy` / `Permissions-Policy` / `X-Frame-Options: DENY` + `CSP frame-ancestors 'none'`（クリックジャッキング対策）を全ルートに付与
- **画像最適化 API の無効化**（`next.config.ts` の `images.unoptimized`）: `next/image` を使っていないのに `/_next/image` が到達可能な状態だったため無効化。過去に SVG / AVIF 処理経由の RCE が報告された攻撃面を丸ごと塞ぐ
- **依存関係の脆弱性対応**: Dependabot の週次 PR に加え、`pnpm audit` で本番に同梱される依存（next / zod 等）の advisory が出たら速やかに更新する（2026-11 に Next.js 16.2 → 16.4 の critical 修正を取り込み）
- **シークレット管理**: `ANNICT_TOKEN` はサーバー専用（Route Handler 内でのみ参照）。`.env*` は gitignore 済み

---

## PWA / SEO

### PWA
- `manifest.json` / 192px・512px アイコン / Apple touch icon を完備
- ホーム画面追加対応、Android はスプラッシュ画面も自動生成
- **Service Worker は廃止**：本アプリは Annict GraphQL に常時依存するオンライン専用で、SW を使うメリット（静的アセットの再キャッシュ）は Next.js の immutable Cache-Control とブラウザキャッシュで十分代替可能。RSC との相性問題や未捕捉エラーなど運用コストが上回ったため撤去
  - 既存ユーザー向けに `public/sw.js` を tombstone 化し、`activate` 時に自身を `unregister()` + 全 caches を削除
  - `src/components/sw-register.tsx` も登録ではなく既存 SW の登録解除を行うクリーンアップコードに置換（二重の保険）

### SEO
- `metadata` API で title template / description / keywords / authors / openGraph / twitter / robots.googleBot / formatDetection を網羅
- **静的 OGP**: `src/app/opengraph-image.png` / `twitter-image.png`（ロゴ + 「Anime Roulette」サブタイトルを上下中央配置）を `scripts/generate-meta-assets.mjs` で生成
- **動的 OGP**: `app/api/og/route.tsx`（`next/og`、Node.js runtime）で「○○が出ました」シェア画像を動的生成。`/share?id=…` から参照。**タイトル・レアリティは URL クエリで受け取らず、id から Annict の実データをサーバー側で取得**する（任意文言のなりすまし画像・ページ生成への対策。id が無効なら既定文言にフォールバック）。レアリティ別の色（★1 青 / ★2 黄 / ★3 ピンク紫）の SVG 星アイコンを描画
- **JSON-LD 構造化データ**: WebApplication / **FAQPage** / **HowTo** schema の 3 種を `<head>` に注入。リッチリザルトテストで FAQ が「有効なアイテム」として検出済み
- `src/app/sitemap.ts` / `robots.ts` で `/sitemap.xml` / `/robots.txt` を自動配信
- 図鑑ページ（`/collection`）は個人のローカルデータのため `robots: noindex` を指定
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
│   ├── api/anime/route.ts        # Annict GraphQL を呼ぶ Route Handler（プールキャッシュ + フィルタ + シャッフル）
│   ├── api/anime/schema.ts       # 入力 zod スキーマ（年は 1991〜現在年にクランプ）
│   ├── api/anime/schema.test.ts  # 入力 zod スキーマの境界値テスト
│   ├── api/anime/[id]/route.ts   # 単一作品の詳細取得 API（モーダル表示用）
│   ├── api/og/route.tsx          # 動的 OGP 画像生成（next/og、Node.js runtime）
│   ├── share/page.tsx            # シェアランディング（generateMetadata で動的 OGP）
│   ├── collection/page.tsx       # 図鑑ページ（robots: noindex、実体は collection-view.tsx）
│   ├── error.tsx                 # Error Boundary（リトライ / トップへ戻る）
│   ├── globals.css               # Tailwind + ブルアカ風テーマ・演出・図鑑 FAB・レスポンシブ用 CSS
│   ├── layout.tsx                # metadata / JSON-LD（WebApplication / FAQ / HowTo） / prefetch / 隠しコマンド登録
│   ├── page.tsx                  # メイン画面 + オフライン検知 + リトライ UI + 図鑑記録・抽選除外
│   ├── manifest.ts               # PWA manifest（自動配信）
│   ├── sitemap.ts                # /sitemap.xml（自動配信）
│   ├── robots.ts                 # /robots.txt（自動配信）
│   ├── icon.png                  # ファビコン
│   ├── apple-icon.png            # iOS ホーム画面アイコン
│   ├── opengraph-image.png       # OGP 画像（静的フォールバック）
│   └── twitter-image.png         # Twitter Card 画像（静的フォールバック）
├── components/
│   ├── search-form.tsx           # 検索フォーム（PC md 以上で2カラム配置）
│   ├── anime-card.tsx            # 結果カード（申請書ストライプ風、クリックで詳細ダイアログ、視聴状態・お気に入り）
│   ├── anime-detail-dialog.tsx   # 結果カード詳細モーダル（Portal + Esc クローズ、外部リンク集約）
│   ├── collection-view.tsx       # 図鑑画面本体（統計 / フィルタ / 無限スクロール / リセット）
│   ├── status-buttons.tsx        # 視聴状態（観た / 後で観る / 興味なし）の 3 分割ピル（結果カード・詳細・図鑑で共用）
│   ├── favorite-button.tsx       # お気に入り（丸枠ハート）トグル。「観た」作品にだけホストが描画
│   ├── confirm-dialog.tsx        # テーマ準拠の確認ダイアログ（alertdialog、初期フォーカス=キャンセル）
│   ├── console-cmd.tsx           # DevTools 隠しコマンド window.cmd の登録（layout でマウント）
│   ├── gacha-sequence.tsx        # ガチャ演出のフルスクリーンオーバーレイ（intro〜reveal〜closing）
│   ├── no-image-icon.tsx         # No image プレースホルダ共通アイコン（結果カード・図鑑で共用）
│   ├── x-logo.tsx                # X（旧 Twitter）公式ロゴ SVG（currentColor 追従）
│   ├── use-focus-trap.ts         # モーダル用フォーカストラップ（Tab 循環 + クローズ時フォーカス復帰）
│   ├── use-periodic-cheer.ts     # 一定間隔ごとに立ち絵の演出フラグを立てる（操作の有無に関係なく繰り返す）
│   ├── sw-register.tsx           # 旧 Service Worker の登録解除 + caches 削除（廃止後のクリーンアップ用）
│   └── ui/                       # shadcn/ui プリミティブ
└── lib/
    ├── annict.ts                 # GraphQL クライアント / クエリ / ページネーション
    ├── annict-rate-limit.ts      # Annict レート制限（429）の Retry-After 解釈・短時間待機再試行・専用エラー
    ├── annict-rate-limit.test.ts # Retry-After の解釈（秒数 / HTTP-date / 不正値）と再試行方針のテスト
    ├── seasons.ts                # 年→seasons 配列の展開 + 未来放送予定の判定（isWorkFutureSeason）+ 今期の判定（getCurrentSeason）
    ├── seasons.test.ts           # seasons 展開・未来判定・今期判定の境界値・順序保持テスト
    ├── rarity.ts                 # レアリティ判定（watchersCount + satisfactionRate）
    ├── rarity.test.ts            # レアリティ判定の単体テスト（100% カバー）
    ├── collection.ts             # 図鑑のデータモデルと純粋関数（記録 / 状態 / 除外 / 統計 / 検証）
    ├── collection.test.ts        # 図鑑純粋関数と loadCollection の破損データ検証テスト
    ├── use-collection.ts         # 図鑑の React state + localStorage 永続化フック（デバウンス保存）
    ├── use-collection.test.ts    # 永続化フックのテスト（jsdom。保存 / flush / 再読込）
    ├── settings.ts               # UI 設定の localStorage キー + 安全な読み書きヘルパ（旧「簡易モード」の演出 OFF への引き継ぎ含む）
    ├── settings.test.ts          # 旧「簡易モード」設定の引き継ぎテスト（jsdom）
    ├── share.ts                  # X (Twitter) シェア URL ビルダー（個別 + 一括、X カウント仕様準拠）
    ├── share.test.ts             # 一括シェアテキスト生成の境界値・X カウント・省略ロジックのテスト
    ├── format.ts                 # 表示フォーマッタ集約（満足度正規化 / 季節・メディアのラベル）
    ├── safe-url.ts               # 外部データ由来 URL の無害化（http/https 以外のスキームを拒否）
    ├── safe-url.test.ts          # URL 無害化の境界値テスト（javascript: / data: / 相対 URL 等）
    ├── site.ts                   # 本番 URL（SITE_URL / SITE_HOST）の一元管理
    ├── gacha-test-fixture.ts     # 開発用ガチャ演出デモ（?gachatest=1）のモック★3作品
    └── utils.ts                  # cn / isInteractiveElementClick ヘルパ

public/
├── logo.png                      # メインロゴ
├── icon-192.png / icon-512.png   # PWA icons
├── sw.js                         # 旧 Service Worker の tombstone（自己 unregister + caches 削除）
└── gacha/                        # アロナ画像 / カード裏面 / ボタンの宝石アイコン（PNG + WebP + AVIF）

scripts/
├── convert-images.mjs            # PNG → AVIF + WebP 一括変換
└── generate-meta-assets.mjs      # OGP / apple-icon / PWA アイコン生成

.github/
├── workflows/
│   ├── ci.yml                    # PR/push ごとに lint → typecheck → test:run
│   └── lighthouse.yml            # PR/push ごとに Lighthouse 計測
└── dependabot.yml                # npm / GitHub Actions の週次自動更新 PR

.husky/pre-commit                 # pnpm exec lint-staged を実行（pre-commit hook）

.claude/
├── settings.json                 # Claude Code 共通設定（安全コマンドの許可リスト + README 同期フック）
└── hooks/
    └── readme-sync-reminder.mjs   # git commit 前に README 同期を促す PreToolUse フック

CLAUDE.md                         # プロジェクト固有の Claude 指示（開発リファレンス + README 同期ワークフロー）
.lighthouserc.json                # Lighthouse 閾値（perf 85% / a11y 90% / etc.）
.editorconfig                     # エディタ統一（utf-8 / LF / 2スペ）
.nvmrc                            # Node 22 (LTS)
.vscode/{settings,extensions}.json  # ワークスペース推奨設定・推奨拡張
```

### Annict API の制約と対処

- **公式ドキュメントは Wikino に移転**（旧 `developers.annict.com` は 2026 年 9 月に閉鎖）: [開発者向けヘルプ](https://wikino.app/s/annict/topics/5) / [API 利用規約](https://annict.com/terms/api)（2026-11-25 施行。作品情報の画面表示とサーバー側キャッシュは可、取得データのまとまった形での公開・再配布は不可）
- **レート制限**（2026-10-25〜）: アクセストークン + 接続元 IP ごとに 600 リクエスト/分（GraphQL は 1 リクエスト = 1 件）。本アプリのプール取得は最大 13 リクエスト/キーなので余裕があるが、超過時の 429 は `src/lib/annict-rate-limit.ts` で扱う（[エラー体験](#エラー体験)）。開発者向けヘルプの推奨に従い、`User-Agent` にアプリ名とサイト URL・リポジトリ URL を入れて送信する

- API には年単独・年範囲のフィルタが存在せず `seasons: [String!]`（例 `"2024-spring"`）のみ。クライアント側で年×季節を展開して送る（`src/lib/seasons.ts`）
- `WorkOrderField` は `WATCHERS_COUNT` / `SEASON` / `CREATED_AT` の3種のみ。「人気アニメ」は `WATCHERS_COUNT DESC` で代用
- **`Work` に放送ステータス系のフィールドが存在しない**（`releasedOn` / `status` / `WorkState` などは無し）。Annict には放送開始前の作品も「予定」として登録されるため、放っておくとガチャに未来作品が混入する。対処として `seasonYear` / `seasonName` から season 開始月（spring=4 / summer=7 / autumn=10 / winter=1）を逆算してクライアント側で除外（`src/lib/seasons.ts` の `isWorkFutureSeason`）。年指定モードでは `expandSeasons` が未来 season をそもそも展開せず、全期間モード（年・季節とも未指定）では `applyFilters` が作品単位で除外する。なお `seasons` を明示指定した場合はユーザー意図を尊重して未来でも展開する
- **ランダム抽出は「上位最大2,600件（200件×13ページのカーソルページネーション）をプール → サーバーでフィルタ → シャッフル → 指定件数を返却」で実現**（`src/app/api/anime/route.ts`、`searchAnimeWorksPaginated`）
  - 200件のみだとプールが人気作偏重になり、ガチャの低レアが出ないため深掘りしている
  - プールは seasons の組み合わせごとに **`unstable_cache`（Vercel Data Cache）でキャッシュ（TTL 24時間）**。以前は module スコープの Map だったが、それだとサーバーレスインスタンスごとに独立しコールドスタートのたびに 13 ページ逐次フェッチ（30秒超）が発生するため、インスタンス横断で永続する Data Cache（ローカルは `.next/cache`）へ移行した。カーソルページネーションは直列のためページ数に比例して取得が遅くなるが、2回目以降のガチャはキャッシュ命中で Annict 取得ゼロ（フィルタ＋シャッフルのみ）で即応答する
  - キャッシュミス時のスタンピード対策として、同一キーへの同時リクエストは同一インスタンス内で in-flight Promise を共有する
- **`Work` には `organizations` / `ratingsCount` フィールドが存在しない**（GraphQL introspection で確認済み）。詳細ダイアログでは取得しない
- **`Staff.roleOther` はスキーマ宣言が non-nullable だが実データで null が返る**ことがあり、GraphQL の error propagation で staff レコード全体が消失する。詳細取得クエリでは `roleOther` を含めず、職位は `roleText` のみで運用

### satisfactionRate の単位

`Float` 型でドキュメントに単位記載なし。0-1 スケール／0-100 スケールどちらでも動作するよう `rate <= 1 ? rate * 100 : rate` で正規化（`src/lib/format.ts` の `normalizeSatisfactionPercent` に一元化し、レアリティ判定・各表示コンポーネントから共用）。

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

### カバー対象（8 ファイル / 計 141 ケース）
- **`src/lib/rarity.test.ts`**: レアリティ判定（`getRarity`）の境界値テスト（16 ケース、100% カバー）
- **`src/lib/seasons.test.ts`**: 年→seasons 展開 (`expandSeasons`) / 未来放送予定の判定 (`isWorkFutureSeason`) / 今期の判定 (`getCurrentSeason`) / `isSeason` の境界・順序保持・エラー系
- **`src/app/api/anime/schema.test.ts`**: API route の zod スキーマ（querySchema）の正常・異常系。デフォルト値、年範囲、count 上下限、enum 検証、`highRated` の boolean 変換まで
- **`src/lib/share.test.ts`**: 一括シェアテキスト (`buildBatchTweetText`) の境界値。X 仕様のカウント（CJK 2 / URL 23 / 上限 280）、超過時の「…他N件」省略、ヘッダー/フッター整形を保証
- **`src/lib/safe-url.test.ts`**: 外部 URL 無害化の境界値（`javascript:` / `data:` / 相対 URL 等の拒否）
- **`src/lib/collection.test.ts`**: 図鑑の純粋関数（記録・状態設定・除外・統計）、お気に入りの不変条件（watched 以外では付かない／外れる、一括解除で外れる、変化なしは同一参照）、`loadCollection` の破損データ検証（不正エントリの黙殺、`imageUrl` 無害化、`totalDraws` フォールバック、`favorite` 欠落・不正値・不変条件違反の正規化）
- **`src/lib/annict-rate-limit.test.ts`**: Annict レート制限対応。`Retry-After` の解釈（整数秒 / HTTP-date / 不正値）、上限内なら待って 1 回だけ再試行、上限超過・ヘッダ無し・再試行失敗時は `AnnictRateLimitError`、429 以外は素通し
- **`src/lib/use-collection.test.ts`**: 図鑑永続化フック（jsdom 環境）。デバウンス保存、pagehide / アンマウント時の即時フラッシュ、外部書き換え検知時の再読込と未保存分破棄、`markStatus` / `markFavorite` の既知判定、保存失敗時の一度きりトースト
- **`src/lib/settings.test.ts`**: 旧「簡易モード」保存値の演出 OFF への引き継ぎ（jsdom 環境）。明示保存済みの演出設定を優先すること、旧キーが削除されること

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

## 開発ガイド

久しぶりに触るときや初めて触る人が迷わないための、日常の開発手順をまとめる。

### ブランチとコミット

- `main` が本番。作業は `feature/<topic>` ブランチで行い、検証が通ったら `main` へマージする（履歴が意味単位に整理済みなら fast-forward、細切れコミットが残っていれば squash で整理してから）
- マージ済みの feature ブランチはローカル・リモートとも削除する（`dependabot/*` は対象外）
- 1 コミット = 1 つの意味のある変更単位。**コード変更と README 更新は別コミット**にする（コミットメッセージ例: 「README を現行実装に合わせて更新：○○を反映」）
- コミットは **Sliip831143** アカウントで行う。`git config user.name` / `user.email` を事前に確認する（詳細は `CLAUDE.md`）
- pre-commit（Husky + lint-staged）でステージ済み TS/JS に `eslint --fix` が走る。自動修正が入った場合は再度 `git add` が必要

### 変更後のチェックリスト

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

この 3 つが green であることを確認してからコミットする（CI でも同じ 3 つが走る）。
あわせて、差分が README の記載（機能 / 仕様値 / アーキテクチャ図）に影響しないかを確認し、ズレがあれば README を更新する。

### ローカルでの E2E 検証

dev サーバより `next start` の方がキャッシュ挙動（`unstable_cache` → `.next/cache`）が本番に近い。

```bash
pnpm build                       # 約 30 秒
npx next start -p 3005           # 要 .env.local の ANNICT_TOKEN

# 抽選 API（works / total / poolSize が返る）
curl "http://localhost:3005/api/anime?count=3"
curl "http://localhost:3005/api/anime?yearFrom=2005&yearTo=2005&count=2"

# 詳細 API（4168 = SHIROBAKO）
curl "http://localhost:3005/api/anime/4168"

# シェアページ / OG 画像（id から実タイトルが入る。title / rarity クエリは無視される）
curl "http://localhost:3005/share?id=4168"
curl -o og.png "http://localhost:3005/api/og?id=4168"
```

- **プールキャッシュ**: 未キャッシュの seasons 組み合わせは Annict へ最大 13 ページ逐次フェッチするため初回は数秒〜数十秒。2 回目以降は Data Cache ヒットで数十 ms。`.next/cache` に永続するため、プロセス再起動後も速ければコールドスタート改善が効いている。未キャッシュ状態を作るには年範囲を変えるか `.next/cache` を削除する
- **上流エラーパス**: `ANNICT_TOKEN=bogus npx next start -p 3006` で 502 ＋汎用メッセージ、`ANNICT_TOKEN= npx next start -p 3007` で 500 ＋設定エラーになる（詳細はマスクされる）。キャッシュ済みキーだと Annict に到達せず成功してしまうので、未キャッシュの年を使う
- **バリデーション**: 年は 1991〜現在年。`yearFrom=1990` や未来年は 400
- **ガチャ演出**: dev サーバで `/?gachatest=1` を開くとモック ★3 作品で演出を即再生できる（本番ビルドでは無効）
- ポート 3000 を他プロジェクトの dev サーバが使っていることがあるため、検証は別ポートで行う

### どこを触るか早見表

| やりたいこと | 主に触るファイル |
|---|---|
| 検索フィルタの追加・変更 | `src/app/api/anime/schema.ts`（zod）→ `src/app/api/anime/route.ts`（`applyFilters`）→ `src/components/search-form.tsx` |
| Annict から取るフィールドの変更 | `src/lib/annict.ts`（クエリ・型）。`roleOther` / `organizations` / `ratingsCount` は取らないこと（[制約](#annict-api-の制約と対処)） |
| レアリティの条件 | `src/lib/rarity.ts` + `rarity.test.ts` + README の表（[レアリティ](#レアリティ)） |
| ガチャ演出 | `src/components/gacha-sequence.tsx` + `src/app/globals.css` |
| 結果カード / 詳細ダイアログ | `src/components/anime-card.tsx` / `anime-detail-dialog.tsx` |
| 図鑑・抽選除外 | `src/lib/collection.ts`（純粋関数）/ `use-collection.ts`（永続化）/ `src/components/collection-view.tsx` |
| シェア文言・OG 画像 | `src/lib/share.ts` / `src/app/share/page.tsx` / `src/app/api/og/route.tsx` |
| 隠しコマンド | `src/components/console-cmd.tsx` |
| メタ情報・JSON-LD | `src/app/layout.tsx` |

### デプロイと依存更新

- Vercel の GitHub 連携により、`main` への push で本番が自動デプロイされる。feature ブランチの push では Preview デプロイが作られる
- Dependabot の PR は CI（lint / typecheck / test）が green なら取り込んでよい。メジャー更新（TypeScript 6 / `@types/node` 25 / GitHub Actions のメジャー等）は、ローカルで `pnpm install` 後に上記チェックリストと `pnpm build` を通してから判断する

---

## Claude Code との協働

本プロジェクトは Anthropic の CLI コーディングエージェント **Claude Code** との二人三脚で開発しています。
「実装とドキュメントを乖離させない」ことを重視し、AI 協働のための仕組みをリポジトリに組み込んでいます。

- **`CLAUDE.md`**: プロジェクト固有の指示書。Claude が毎セッション参照する。
  Git アカウント運用、検証フロー（lint / typecheck / test）、Annict API の既知の落とし穴、
  レアリティ閾値の注意、README 同期ワークフローを集約
- **`.claude/settings.json`**（コミット対象）: Claude Code の権限設定。`pnpm` スクリプトや型チェックなど
  安全なコマンドを許可リスト化して確認プロンプトを削減。ローカル固有の許可は `.claude/settings.local.json`
  （Git 管理外）に分離
- **README 同期フック**（`.claude/hooks/readme-sync-reminder.mjs`）: `git commit` の実行直前に発火する
  PreToolUse フック。「今回の差分が README の記載に影響しないか」を機械的にリマインドし、
  ドキュメントの取りこぼしを防ぐ
- **コミット粒度**: コード変更と README 更新は別コミットに分離（例: 「README を現行実装に合わせて更新」）

---

## ライセンス

MIT
