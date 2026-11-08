/**
 * DevTools コンソール用の隠しコマンド一覧。
 *
 * `/help` の出力（console-cmd.tsx）とページ読み込み時のコンソール案内（layout.tsx）の
 * 両方がここを参照する。以前は別々に書かれていて、コマンドの追加・削除のたびに
 * 片方を直し忘れたり、案内側の `%c` とスタイル引数の数がずれたりしていた。
 */

import { DEFAULT_POPULAR_THRESHOLD } from "@/lib/settings";

export type HiddenCommand = {
  /** `/help` に表示する書式（引数のバリエーション込み） */
  usage: string;
  /** `/help` に表示する説明 */
  desc: string;
  /** ページ読み込み時の案内に表示する短い書式と説明 */
  banner: { usage: string; desc: string };
};

export const HIDDEN_COMMANDS: HiddenCommand[] = [
  {
    usage: 'cmd("/help")',
    desc: "利用可能コマンド一覧を表示",
    banner: { usage: 'cmd("/help")', desc: "利用可能コマンド一覧を表示" },
  },
  {
    usage: 'cmd("/state")',
    desc: "現在の各種設定を一覧表示",
    banner: { usage: 'cmd("/state")', desc: "現在の各種設定を一覧表示" },
  },
  {
    usage: 'cmd("/season"|"/season on"|"/season off")',
    desc: "季節フィルタの表示切替（デフォルト非表示）",
    banner: { usage: 'cmd("/season")', desc: "季節フィルタの表示切替" },
  },
  {
    usage: 'cmd("/debug"|"/debug on"|"/debug off")',
    desc: "APIリクエスト・レアリティ判定の詳細ログを切替",
    banner: {
      usage: 'cmd("/debug")',
      desc: "APIリクエスト・レアリティ判定のログ",
    },
  },
  {
    usage: 'cmd("/max"|"/max on"|"/max off")',
    desc: "取得件数UIを切替（Slider 1〜10 ⇔ 数値入力 1〜50）",
    banner: {
      usage: 'cmd("/max")',
      desc: "取得件数UIをSlider⇔数値入力で切替",
    },
  },
  {
    usage: 'cmd("/popularity tune <n>"|"/popularity reset")',
    desc: `「人気のみ」の視聴登録閾値をカスタマイズ（デフォルト${DEFAULT_POPULAR_THRESHOLD}）`,
    banner: {
      usage: 'cmd("/popularity tune")',
      desc: "「人気のみ」閾値をカスタマイズ",
    },
  },
  {
    usage: 'cmd("/reset"|"/reset all")',
    desc: "localStorageの設定を初期化（all 指定で図鑑データも削除）",
    banner: {
      usage: 'cmd("/reset")',
      desc: "設定を初期化（/reset all で図鑑も削除）",
    },
  },
];

const BANNER_HEADER = [
  "",
  "    ██████  ███████",
  "        ███  ███  ███",
  "       ███  ███  ███",
  "      ███  ███  ███",
  "     ███  ███  ███",
  "",
  "      M I L L E N N I U M",
  "",
  "%c📦 Project   %cアニメルーレット -Anime Roulette-",
  "%c🔗 Source    %chttps://github.com/Sliip831143/anime-roulette",
  "",
  "%c🎲 Hidden commands available",
].join("\n");

const BANNER_HEADER_STYLES = [
  "color:#7aa;font-weight:600",
  "color:inherit",
  "color:#7aa;font-weight:600",
  "color:#48a;font-weight:600;text-decoration:underline",
  "color:#7aa;font-weight:700;font-size:13px",
];

/** 案内の書式列の幅。最長の `cmd("/popularity tune")` が収まる長さ */
const BANNER_USAGE_WIDTH = 24;

/**
 * ページ読み込み時にコンソールへ出す案内を `console.log` の引数列として組み立てる。
 * 先頭がメッセージ本文、以降が `%c` に対応するスタイル文字列。
 */
export function buildConsoleBanner(): string[] {
  const lines = HIDDEN_COMMANDS.map(
    (c) => `%c  ${c.banner.usage.padEnd(BANNER_USAGE_WIDTH)}%c${c.banner.desc}`,
  );
  const message = `${BANNER_HEADER}\n${lines.join("\n")}\n`;
  const styles = [
    ...BANNER_HEADER_STYLES,
    ...HIDDEN_COMMANDS.flatMap(() => [
      "color:#3a7;font-weight:600",
      "color:inherit",
    ]),
  ];
  return [message, ...styles];
}
