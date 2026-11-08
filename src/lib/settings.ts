/**
 * UI 設定の localStorage キーと読み込みヘルパー。
 *
 * トップページ（page.tsx）と隠しコマンド（console-cmd.tsx）で共有する。
 * 書き込みは各画面の永続化 effect と隠しコマンドが行い、
 * 隠しコマンドによる変更は SETTINGS_CHANGED_EVENT で全画面へ通知される。
 */

export const STORAGE_PREFIX = "anime-roulette-";
/** 廃止した「簡易モード」の保存キー。readSettings が演出設定へ引き継いだうえで削除する */
export const LEGACY_MODE_STORAGE_KEY = `${STORAGE_PREFIX}mode`;
export const SEASON_VISIBLE_KEY = `${STORAGE_PREFIX}season-visible`;
export const DEBUG_MODE_KEY = `${STORAGE_PREFIX}debug`;
export const ANIM_DISABLED_KEY = `${STORAGE_PREFIX}anim-disabled`;
export const EXTENDED_COUNT_KEY = `${STORAGE_PREFIX}extended-count`;
export const POPULAR_THRESHOLD_KEY = `${STORAGE_PREFIX}popular-threshold`;

export const DEFAULT_POPULAR_THRESHOLD = 1000;

/** 隠しコマンドが localStorage を書き換えたことを各画面へ通知するイベント名 */
export const SETTINGS_CHANGED_EVENT = "anime-roulette:settings-changed";

export type Settings = {
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

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 消せなくても致命ではない
  }
}

/**
 * 廃止した「簡易モード」（演出なしの別テーマ）を演出 OFF へ引き継ぐ。
 * 簡易モードを選んでいた人が、突然ガチャ演出が始まる体験にならないようにするための一度きりの移行で、
 * 演出設定を明示的に保存済みならそちらを優先する。旧キーは消して二度と参照しない。
 */
function migrateLegacyMode(): void {
  const legacy = safeGetItem(LEGACY_MODE_STORAGE_KEY);
  if (legacy === null) return;
  if (legacy === "simple" && safeGetItem(ANIM_DISABLED_KEY) === null) {
    safeSetItem(ANIM_DISABLED_KEY, "1");
  }
  safeRemoveItem(LEGACY_MODE_STORAGE_KEY);
}

/** localStorage から設定を読み込む（キーなし・不正値・読取不可は既定値）。クライアント専用。 */
export function readSettings(): Settings {
  migrateLegacyMode();
  const storedPopular = safeGetItem(POPULAR_THRESHOLD_KEY);
  const popular = storedPopular === null ? NaN : Number(storedPopular);
  return {
    seasonVisible: safeGetItem(SEASON_VISIBLE_KEY) === "1",
    debugMode: safeGetItem(DEBUG_MODE_KEY) === "1",
    animDisabled: safeGetItem(ANIM_DISABLED_KEY) === "1",
    extendedCount: safeGetItem(EXTENDED_COUNT_KEY) === "1",
    // 0 以下は既定値に戻す。初期のコードが未設定時に Number(null) === 0 を正当な値として保存していたため、
    // その時期に開いた環境には 0 が残っており「人気のみ」が「すべて」と同じ条件になっていた
    popularThreshold:
      Number.isInteger(popular) && popular >= 1
        ? popular
        : DEFAULT_POPULAR_THRESHOLD,
  };
}
