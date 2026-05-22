# anime-roulette プロジェクト固有の指示

## 開発リファレンス

実装時に毎回参照する前提知識をここに集約する。README の散文（「Annict API の制約と対処」）と重複するが、
README は利用者向けドキュメント、本セクションは Claude が確実に拾うための作業メモという役割分担。

### Git アカウント / コミット

- このリポジトリ（`Sliip831143/anime-roulette`）への Git 操作は必ず **Sliip831143**（プライベートアカウント）で行う。
  社用アカウント `ds-okubo` は使用しない。詳細はグローバル `~/.claude/CLAUDE.md` を参照。
- 操作前に `git config user.name` / `git config user.email` を確認する。
- **commit / push はユーザーが明示的に依頼したときのみ実行する。** 実装が終わっても自動でコミットしない。

### 検証フロー

コードを変更したら、コミット前に必ず次をすべて green にする。

```
pnpm lint
pnpm typecheck
pnpm test:run
```

### Annict GraphQL API の落とし穴

- **年・年範囲フィルタは存在しない。** `seasons: [String!]`（例 `"2024-spring"`）のみ。
  年×季節をクライアント側で展開する（`src/lib/seasons.ts`）。
- `WorkOrderField` は `WATCHERS_COUNT` / `SEASON` / `CREATED_AT` の 3 種のみ。「人気」は `WATCHERS_COUNT DESC` で代用。
- **`Work` に `organizations` / `ratingsCount` フィールドは存在しない。** 詳細取得クエリに含めない。
- **`Staff.roleOther` はスキーマ上 non-nullable だが実データで null が返る。** GraphQL の error propagation で
  staff レコードごと消失するため、詳細クエリには `roleOther` を含めず職位は `roleText` のみで運用する。
- `satisfactionRate` は単位記載のない `Float`。`rate <= 1 ? rate * 100 : rate` で 0-100 スケールに正規化する
  （`src/lib/rarity.ts` / `src/components/anime-card.tsx`）。

### レアリティ閾値

- `src/lib/rarity.ts` の ★1 / ★2 / ★3 閾値は、抽選プール件数とのバランスを取りながら試行錯誤で調整した値。
  **安易に変更しない。** 変更する場合は `rarity.test.ts` の境界値と、出現率の意図を必ず確認すること。

## コミット時のワークフロー：README の同期

このプロジェクトでコミットを作成する際は、**コミット前に必ず**次を実施する。

1. 今回の変更（差分）が `README.md` の記載内容に影響するかを解析する。確認対象の主なセクション：
   - 主な機能 / ガチャ演出フロー / レアリティ / 結果表示 / エラー体験 / レスポンシブ
   - 隠しコマンド（DevTools コンソール）
   - 技術スタック / パフォーマンス最適化 / アクセシビリティ / PWA・SEO
   - アーキテクチャ図（ディレクトリ構成・各ファイルの役割）
2. 記載と実装にズレが生じる場合は `README.md` を実装に合わせて更新する。
   - 新機能の追加 → 該当セクションに追記
   - 既存挙動・仕様値の変更 → 古い記述を修正
   - ファイルの追加・削除・役割変更 → アーキテクチャ図を更新
3. README に変更が生じた場合は、コード変更とは別コミットに分ける（コミットメッセージ例：「README を現行実装に合わせて更新」）。
4. 今回の差分が README の記載に影響しなければ、README は変更しない（無理に書き換えない）。

目的は「実装とドキュメントを乖離させないこと」。README 全体を毎回書き直す必要はなく、**今回の差分が触れた範囲**が正しく文書化されているかだけを確認する。
