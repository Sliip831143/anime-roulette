import type { AnnictWork } from "@/lib/annict";
import { getRarity, type Rarity } from "@/lib/rarity";
import { safeHttpUrl } from "@/lib/safe-url";

/**
 * ローカル図鑑（コレクション）のデータモデルと純粋関数。
 *
 * ガチャ結果に表示された作品を localStorage に自動記録し、
 * 視聴状態「観た / 後で観る / 興味なし」のいずれかを付けた作品を以後の抽選から除外する。
 * 「お気に入り」は「観た」作品にだけ重ねられる印（favorite ⇒ watched を不変条件とする）。
 * 視聴状態はサーバーに一切送らない（ログイン不要・ローカル完結の思想）。
 * 設計書: anime-roulette-md/2026-07-04-collection-exclusion/ 配下を参照。
 */

export const COLLECTION_STORAGE_KEY = "anime-roulette-collection-v1";

export type CollectionStatus = "none" | "watched" | "later" | "not_interested";

export type CollectionEntry = {
  annictId: number;
  title: string;
  imageUrl: string | null;
  // 初回入手時のスナップショット（レアリティ再現・詳細ダイアログの初期表示に使用）
  rarity: Rarity;
  watchersCount: number;
  satisfactionRate: number | null;
  seasonYear: number | null;
  seasonName: AnnictWork["seasonName"];
  media: AnnictWork["media"];
  firstDrawnAt: number;
  lastDrawnAt: number;
  drawCount: number;
  status: CollectionStatus;
  /** 「観た」作品にだけ付くお気に入り印。status が watched 以外のとき常に false */
  favorite: boolean;
};

export type CollectionData = {
  version: 1;
  /** 通算抽選回数（結果に表示された件数の累計）＝「通算N連」 */
  totalDraws: number;
  entries: Record<string, CollectionEntry>;
};

export function emptyCollection(): CollectionData {
  return { version: 1, totalDraws: 0, entries: {} };
}

const VALID_RARITIES: ReadonlySet<string> = new Set(["r1", "r2", "r3"]);
const VALID_STATUSES: ReadonlySet<string> = new Set([
  "none",
  "watched",
  "later",
  "not_interested",
]);
const VALID_SEASON_NAMES: ReadonlySet<string> = new Set([
  "WINTER",
  "SPRING",
  "SUMMER",
  "AUTUMN",
]);
const VALID_MEDIA: ReadonlySet<string> = new Set([
  "TV",
  "OVA",
  "MOVIE",
  "WEB",
  "OTHER",
]);

/** typeof === "number" だけでは NaN / Infinity が通るため有限数まで要求する */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * localStorage 由来のエントリを 1 件ずつ検証する。
 * 破損した 1 件で図鑑ページ・抽選除外の全体が落ちないよう、
 * 不正なエントリは読み込み時に黙って捨てる（正常な残りは温存）。
 * favorite は後から追加した項目のため欠落・不正を許し、loadCollection 側で正規化する。
 */
function isValidEntry(
  value: unknown,
): value is Omit<CollectionEntry, "favorite"> & { favorite?: unknown } {
  if (typeof value !== "object" || value == null) return false;
  const e = value as Record<string, unknown>;
  return (
    isFiniteNumber(e.annictId) &&
    typeof e.title === "string" &&
    (e.imageUrl === null || typeof e.imageUrl === "string") &&
    VALID_RARITIES.has(e.rarity as string) &&
    isFiniteNumber(e.watchersCount) &&
    (e.satisfactionRate === null || isFiniteNumber(e.satisfactionRate)) &&
    (e.seasonYear === null || isFiniteNumber(e.seasonYear)) &&
    (e.seasonName === null || VALID_SEASON_NAMES.has(e.seasonName as string)) &&
    (e.media === null || VALID_MEDIA.has(e.media as string)) &&
    isFiniteNumber(e.firstDrawnAt) &&
    isFiniteNumber(e.lastDrawnAt) &&
    isFiniteNumber(e.drawCount) &&
    VALID_STATUSES.has(e.status as string)
  );
}

/** SSR・壊れた JSON・バージョン不一致はすべて初期値にフォールバック */
export function loadCollection(): CollectionData {
  if (typeof window === "undefined") return emptyCollection();
  try {
    const raw = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return emptyCollection();
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed == null ||
      (parsed as { version?: unknown }).version !== 1 ||
      typeof (parsed as { entries?: unknown }).entries !== "object" ||
      (parsed as { entries?: unknown }).entries == null
    ) {
      return emptyCollection();
    }
    const data = parsed as CollectionData;
    const entries: Record<string, CollectionEntry> = {};
    for (const value of Object.values(data.entries)) {
      if (!isValidEntry(value)) continue;
      // 改ざんで javascript: 等が <img src> に流れないよう http(s) 以外は null へ落とす
      // （リンク系 URL の safeHttpUrl と同じ防御を imageUrl にも揃える）
      entries[String(value.annictId)] = {
        ...value,
        imageUrl: safeHttpUrl(value.imageUrl),
        // 旧データ（favorite 無し）や不変条件違反（watched 以外で true）は false に寄せる
        favorite: value.status === "watched" && value.favorite === true,
      };
    }
    const totalDraws =
      typeof data.totalDraws === "number" &&
      Number.isFinite(data.totalDraws) &&
      data.totalDraws >= 0
        ? data.totalDraws
        : 0;
    return { version: 1, totalDraws, entries };
  } catch {
    return emptyCollection();
  }
}

/**
 * 図鑑を localStorage へ保存し、成否を返す。
 * 容量超過等でもアプリ本体は動作させるが、黙殺すると「観た」を付けたのに
 * 次回消えているという説明不能な体験になるため、失敗は呼び出し側で通知する。
 */
export function saveCollection(data: CollectionData): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn("[collection] 図鑑の保存に失敗しました", e);
    return false;
  }
}

/**
 * 抽選結果に表示された作品を記録する。
 * 新規はスナップショット付きで登録、既出は drawCount / lastDrawnAt のみ更新
 * （タイトルやレアリティ等のスナップショットは初回入手時のまま変更しない）。
 */
export function recordDraws(
  data: CollectionData,
  works: AnnictWork[],
  now: number = Date.now(),
): CollectionData {
  if (works.length === 0) return data;
  const entries = { ...data.entries };
  for (const w of works) {
    const key = String(w.annictId);
    const existing = entries[key];
    if (existing) {
      entries[key] = {
        ...existing,
        drawCount: existing.drawCount + 1,
        lastDrawnAt: now,
      };
    } else {
      entries[key] = {
        annictId: w.annictId,
        title: w.title,
        imageUrl: w.image?.recommendedImageUrl ?? null,
        rarity: getRarity(w.watchersCount, w.satisfactionRate),
        watchersCount: w.watchersCount,
        satisfactionRate: w.satisfactionRate,
        seasonYear: w.seasonYear,
        seasonName: w.seasonName,
        media: w.media,
        firstDrawnAt: now,
        lastDrawnAt: now,
        drawCount: 1,
        status: "none",
        favorite: false,
      };
    }
  }
  return { ...data, entries, totalDraws: data.totalDraws + works.length };
}

/**
 * 状態を設定する（"none" で解除）。未知の ID・変化なしは同一参照を返す。
 * watched 以外へ変えるとお気に入りも外す（favorite ⇒ watched の不変条件）。
 */
export function setStatus(
  data: CollectionData,
  annictId: number,
  status: CollectionStatus,
): CollectionData {
  const key = String(annictId);
  const entry = data.entries[key];
  if (!entry || entry.status === status) return data;
  const favorite = status === "watched" ? entry.favorite : false;
  return {
    ...data,
    entries: { ...data.entries, [key]: { ...entry, status, favorite } },
  };
}

/** お気に入りを設定する。watched 以外・未知の ID・変化なしは同一参照を返す。 */
export function setFavorite(
  data: CollectionData,
  annictId: number,
  on: boolean,
): CollectionData {
  const key = String(annictId);
  const entry = data.entries[key];
  if (!entry || entry.status !== "watched" || entry.favorite === on)
    return data;
  return {
    ...data,
    entries: { ...data.entries, [key]: { ...entry, favorite: on } },
  };
}

/**
 * 指定 status の全エントリを "none" に戻す（「観た」一括リセット用）。
 * エントリ本体（drawCount 等）は消えないが、観たを外す以上お気に入りも一緒に外れる。
 */
export function clearStatus(
  data: CollectionData,
  status: CollectionStatus,
): CollectionData {
  const entries: Record<string, CollectionEntry> = {};
  for (const [key, entry] of Object.entries(data.entries)) {
    entries[key] =
      entry.status === status
        ? { ...entry, status: "none", favorite: false }
        : entry;
  }
  return { ...data, entries };
}

/** 抽選から除外すべき annictId の集合（watched / later / not_interested） */
export function excludedIdsOf(data: CollectionData): Set<number> {
  const ids = new Set<number>();
  for (const entry of Object.values(data.entries)) {
    if (entry.status !== "none") ids.add(entry.annictId);
  }
  return ids;
}

/**
 * 多め取得した抽選結果から除外作品を飛ばして先頭 count 件を選ぶ。
 * excludedCount は「除外によって候補から外れた件数」（不足時の案内表示用）。
 */
export function pickAfterExclusion(
  works: AnnictWork[],
  excluded: Set<number>,
  count: number,
): { picked: AnnictWork[]; excludedCount: number } {
  const filtered = works.filter((w) => !excluded.has(w.annictId));
  return {
    picked: filtered.slice(0, count),
    excludedCount: works.length - filtered.length,
  };
}

export function statsOf(data: CollectionData): {
  unique: number;
  byRarity: Record<Rarity, number>;
  watched: number;
  later: number;
  notInterested: number;
  favorite: number;
  totalDraws: number;
} {
  const byRarity: Record<Rarity, number> = { r1: 0, r2: 0, r3: 0 };
  let watched = 0;
  let later = 0;
  let notInterested = 0;
  let favorite = 0;
  const entries = Object.values(data.entries);
  for (const entry of entries) {
    byRarity[entry.rarity]++;
    if (entry.status === "watched") watched++;
    if (entry.status === "later") later++;
    if (entry.status === "not_interested") notInterested++;
    if (entry.favorite) favorite++;
  }
  return {
    unique: entries.length,
    byRarity,
    watched,
    later,
    notInterested,
    favorite,
    totalDraws: data.totalDraws,
  };
}
