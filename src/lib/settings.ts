/**
 * UI 設定の localStorage キーと読み込みヘルパー。
 *
 * トップページ（page.tsx）と隠しコマンド（console-cmd.tsx）で共有する。
 * 書き込みは各画面の永続化 effect と隠しコマンドが行い、
 * 隠しコマンドによる変更は SETTINGS_CHANGED_EVENT で全画面へ通知される。
 */

export const STORAGE_PREFIX = "anime-roulette-";
export const MODE_STORAGE_KEY = `${STORAGE_PREFIX}mode`;
export const SEASON_VISIBLE_KEY = `${STORAGE_PREFIX}season-visible`;
export const DEBUG_MODE_KEY = `${STORAGE_PREFIX}debug`;
export const ANIM_DISABLED_KEY = `${STORAGE_PREFIX}anim-disabled`;
export const EXTENDED_COUNT_KEY = `${STORAGE_PREFIX}extended-count`;
export const POPULAR_THRESHOLD_KEY = `${STORAGE_PREFIX}popular-threshold`;

export const DEFAULT_POPULAR_THRESHOLD = 1000;

/** 隠しコマンドが localStorage を書き換えたことを各画面へ通知するイベント名 */
export const SETTINGS_CHANGED_EVENT = "anime-roulette:settings-changed";

export type Settings = {
  gachaMode: boolean;
  seasonVisible: boolean;
  debugMode: boolean;
  animDisabled: boolean;
  extendedCount: boolean;
  popularThreshold: number;
};

/**
 * localStorage の安全な読み書き。
 * Cookie 全ブロック等の環境では window.localStorage への**プロパティアクセス自体**が
 * SecurityError を投げるため、getItem/setItem を try/catch でガードする。
 * 失敗しても「設定が保存・復元されない」だけでアプリ本体は動作させる。
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 保存できなくても致命ではない
  }
}

/** localStorage から設定を読み込む（キーなし・不正値・読取不可は既定値）。クライアント専用。 */
export function readSettings(): Settings {
  const storedPopular = safeGetItem(POPULAR_THRESHOLD_KEY);
  const popular = storedPopular === null ? NaN : Number(storedPopular);
  return {
    gachaMode: safeGetItem(MODE_STORAGE_KEY) !== "simple",
    seasonVisible: safeGetItem(SEASON_VISIBLE_KEY) === "1",
    debugMode: safeGetItem(DEBUG_MODE_KEY) === "1",
    animDisabled: safeGetItem(ANIM_DISABLED_KEY) === "1",
    extendedCount: safeGetItem(EXTENDED_COUNT_KEY) === "1",
    popularThreshold:
      Number.isInteger(popular) && popular >= 0
        ? popular
        : DEFAULT_POPULAR_THRESHOLD,
  };
}
