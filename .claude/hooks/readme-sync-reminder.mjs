#!/usr/bin/env node
// PreToolUse(Bash) フック：git commit の実行前に README 同期チェックを促す。
//
// settings.json 側の `if: "Bash(git *)"` で git 系コマンドのときだけ起動し、
// ここで実コマンドに "git commit" が含まれる場合のみ、リマインドを
// additionalContext として Claude に渡す。コミットはブロックしない（非ブロッキング）。

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let command = "";
try {
  command = JSON.parse(raw)?.tool_input?.command ?? "";
} catch {
  // 入力が JSON でなければ何もしない
  process.exit(0);
}

if (!command.includes("git commit")) process.exit(0);

const reminder =
  "【README 同期チェック】コミット前に、CLAUDE.md の" +
  "「コミット時のワークフロー：README の同期」に従うこと。" +
  "今回の差分が README.md の記載（主な機能 / ガチャ演出 / レアリティ / 結果表示 / " +
  "エラー体験 / 隠しコマンド / 技術スタック / アーキテクチャ図 など）に影響するかを確認し、" +
  "影響する場合は README を実装に合わせて更新する。" +
  "README を更新したら、コード変更とは別コミットに分けること。";

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: reminder,
    },
  }),
);
process.exit(0);
