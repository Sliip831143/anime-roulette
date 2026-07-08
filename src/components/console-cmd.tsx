"use client";

import { useEffect } from "react";
import { COLLECTION_STORAGE_KEY } from "@/lib/collection";
import {
  ANIM_DISABLED_KEY,
  DEBUG_MODE_KEY,
  DEFAULT_POPULAR_THRESHOLD,
  EXTENDED_COUNT_KEY,
  POPULAR_THRESHOLD_KEY,
  SEASON_VISIBLE_KEY,
  SETTINGS_CHANGED_EVENT,
  STORAGE_PREFIX,
  readSettings,
} from "@/lib/settings";

type CmdDef = { usage: string; desc: string };
const CMD_DEFS: CmdDef[] = [
  { usage: 'cmd("/help")', desc: "利用可能コマンド一覧を表示" },
  { usage: 'cmd("/state")', desc: "現在の各種設定を一覧表示" },
  {
    usage: 'cmd("/season"|"/season on"|"/season off")',
    desc: "季節フィルタの表示切替（デフォルト非表示）",
  },
  {
    usage: 'cmd("/debug"|"/debug on"|"/debug off")',
    desc: "APIリクエスト・レアリティ判定の詳細ログを切替",
  },
  {
    usage: 'cmd("/anim"|"/anim on"|"/anim off")',
    desc: "ガチャ演出のON/OFF切替（OFFで即結果表示）",
  },
  {
    usage: 'cmd("/max"|"/max on"|"/max off")',
    desc: "取得件数UIを切替（Slider 1〜10 ⇔ 数値入力 1〜50、ONで演出も自動OFF）",
  },
  {
    usage: 'cmd("/popularity tune <n>"|"/popularity reset")',
    desc: `「人気のみ」の視聴登録閾値をカスタマイズ（デフォルト${DEFAULT_POPULAR_THRESHOLD}）`,
  },
  {
    usage: 'cmd("/reset"|"/reset all")',
    desc: "localStorageの設定を初期化（all 指定で図鑑データも削除）",
  },
];

declare global {
  interface Window {
    cmd?: (input: string) => void;
  }
}

/**
 * DevTools コンソール用の隠しコマンド window.cmd を登録する。
 *
 * layout でマウントされ全ページ（トップ・図鑑・シェア）で使える。
 * 設定の実体は localStorage で、書き換え後に SETTINGS_CHANGED_EVENT を
 * 発火してマウント中の画面（page.tsx / collection-view.tsx）へ反映を促す。
 */
export function ConsoleCmd() {
  useEffect(() => {
    const notify = () =>
      window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));

    const readFlag = (key: string) => localStorage.getItem(key) === "1";
    const writeFlag = (key: string, on: boolean) =>
      localStorage.setItem(key, on ? "1" : "0");

    const log = (label: string, on: boolean) =>
      console.log(
        `%c[cmd] ${label}: %c${on ? "ON" : "OFF"}`,
        "color:#7aa;font-weight:600",
        on ? "color:#3a7;font-weight:700" : "color:#a55;font-weight:700",
      );

    const applyToggle = (
      arg: string | undefined,
      label: string,
      key: string,
    ) => {
      const next =
        arg === "on" ? true : arg === "off" ? false : !readFlag(key);
      writeFlag(key, next);
      log(label, next);
      notify();
    };

    const handler = (input: string) => {
      const parts = String(input ?? "").trim().split(/\s+/);
      const head = parts[0];
      const arg = parts[1]?.toLowerCase();

      if (head === "/help") {
        console.group(
          "%c[cmd] /help — 利用可能コマンド",
          "color:#7aa;font-weight:700",
        );
        CMD_DEFS.forEach((c) => {
          console.log(
            `  %c${c.usage}%c  ${c.desc}`,
            "color:#3a7;font-weight:600",
            "color:inherit",
          );
        });
        console.groupEnd();
        return;
      }

      if (head === "/state") {
        const s = readSettings();
        const onOff = (b: boolean) => (b ? "ON" : "OFF");
        const items: { label: string; value: string }[] = [
          { label: "mode", value: s.gachaMode ? "gacha" : "simple" },
          { label: "season filter", value: onOff(s.seasonVisible) },
          { label: "debug log", value: onOff(s.debugMode) },
          {
            label: "gacha anim",
            value: s.animDisabled ? "OFF (skip)" : "ON",
          },
          {
            label: "count UI",
            value: s.extendedCount
              ? "extended (number input, 1〜50)"
              : "default (slider, 1〜10)",
          },
          {
            label: "popular threshold",
            value: `${s.popularThreshold.toLocaleString()} (default ${DEFAULT_POPULAR_THRESHOLD.toLocaleString()})`,
          },
        ];
        console.group(
          "%c[cmd] /state — 現在の設定",
          "color:#7aa;font-weight:700",
        );
        items.forEach((it) => {
          console.log(
            `  %c${it.label.padEnd(20)}%c${it.value}`,
            "color:#7aa;font-weight:600",
            "color:inherit",
          );
        });
        console.groupEnd();
        return;
      }

      if (head === "/season") {
        applyToggle(arg, "season", SEASON_VISIBLE_KEY);
        return;
      }

      if (head === "/debug") {
        applyToggle(arg, "debug", DEBUG_MODE_KEY);
        return;
      }

      if (head === "/anim") {
        // /anim on = 演出ON(animDisabled=false)、/anim off = 演出OFF(animDisabled=true)
        const enabled =
          arg === "on"
            ? true
            : arg === "off"
              ? false
              : readFlag(ANIM_DISABLED_KEY);
        writeFlag(ANIM_DISABLED_KEY, !enabled);
        log("anim", enabled);
        notify();
        return;
      }

      if (head === "/max") {
        const on =
          arg === "on"
            ? true
            : arg === "off"
              ? false
              : !readFlag(EXTENDED_COUNT_KEY);
        writeFlag(EXTENDED_COUNT_KEY, on);
        console.log(
          `%c[cmd] max (extended count UI): %c${on ? "ON" : "OFF"}`,
          "color:#7aa;font-weight:600",
          on ? "color:#3a7;font-weight:700" : "color:#a55;font-weight:700",
        );
        if (on) {
          writeFlag(ANIM_DISABLED_KEY, true);
          console.log(
            `%c[cmd] anim: %cauto-OFF (件数拡張中はガチャ演出を自動停止)`,
            "color:#7aa;font-weight:600",
            "color:#a55;font-weight:700",
          );
        }
        notify();
        return;
      }

      if (head === "/popularity") {
        const sub = parts[1]?.toLowerCase();
        if (sub === undefined) {
          console.log(
            `%c[cmd] popularity threshold (current): %c${readSettings().popularThreshold}`,
            "color:#7aa;font-weight:600",
            "color:#3a7;font-weight:700",
          );
          return;
        }
        if (sub === "reset") {
          localStorage.setItem(
            POPULAR_THRESHOLD_KEY,
            String(DEFAULT_POPULAR_THRESHOLD),
          );
          console.log(
            `%c[cmd] popularity threshold: %creset to ${DEFAULT_POPULAR_THRESHOLD}`,
            "color:#7aa;font-weight:600",
            "color:#3a7;font-weight:700",
          );
          notify();
          return;
        }
        if (sub === "tune") {
          const n = Number(parts[2]);
          if (!Number.isInteger(n) || n < 0) {
            console.log(
              `%c[cmd] /popularity tune <n>: 0以上の整数を指定してください`,
              "color:#a55;font-weight:600",
            );
            return;
          }
          localStorage.setItem(POPULAR_THRESHOLD_KEY, String(n));
          console.log(
            `%c[cmd] popularity threshold: %c${n}`,
            "color:#7aa;font-weight:600",
            "color:#3a7;font-weight:700",
          );
          notify();
          return;
        }
        console.log(
          `%c[cmd] /popularity: 使い方は cmd("/popularity tune <n>") / cmd("/popularity reset")`,
          "color:#a55;font-weight:600",
        );
        return;
      }

      if (head === "/reset") {
        const all = arg === "all";
        const removed: string[] = [];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
          // 図鑑は蓄積資産のため、既定の /reset では消さない（/reset all のみ）
          if (!all && key === COLLECTION_STORAGE_KEY) continue;
          localStorage.removeItem(key);
          removed.push(key);
        }
        // モードは既定（ガチャ）に戻る。表示中ページの背景等へも即反映する
        document.documentElement.dataset.mode = "gacha";
        console.group(
          `%c[cmd] /reset — localStorage を初期化しました${all ? "（図鑑含む）" : "（図鑑は保持）"}`,
          "color:#7aa;font-weight:700",
        );
        if (removed.length === 0) {
          console.log("  (削除されたキーはありません)");
        } else {
          removed.forEach((k) => console.log(`  removed: ${k}`));
        }
        if (!all) {
          console.log(
            "%c  図鑑も含めて初期化する場合は cmd(\"/reset all\")",
            "color:#999;font-style:italic",
          );
        }
        console.log(
          "%c  反映が不完全な場合はページをリロードしてください",
          "color:#999;font-style:italic",
        );
        console.groupEnd();
        notify();
        return;
      }

      console.log(
        `%c[cmd] unknown command: %c${input}\n%cTry: cmd("/help")`,
        "color:#a55;font-weight:600",
        "color:inherit",
        "color:#999;font-style:italic",
      );
    };

    window.cmd = handler;
    return () => {
      if (window.cmd === handler) delete window.cmd;
    };
  }, []);

  return null;
}
