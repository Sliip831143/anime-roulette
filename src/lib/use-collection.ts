"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  COLLECTION_STORAGE_KEY,
  emptyCollection,
  loadCollection,
  saveCollection,
  setStatus,
  setFavorite,
  type CollectionData,
  type CollectionStatus,
} from "@/lib/collection";
import { SETTINGS_CHANGED_EVENT } from "@/lib/settings";

/** トグル連打時に全量シリアライズを間引くための保存遅延（ms） */
const SAVE_DEBOUNCE_MS = 300;

/**
 * 図鑑データの React state と localStorage 永続化を束ねるフック。
 * トップページ（page.tsx）と図鑑ページ（collection-view.tsx）で共用する。
 *
 * - マウント時に読み込む。読み込んだだけの state は書き戻さない
 *   （バージョン不一致等でフォールバックした際に元データを破壊しないため）
 * - ユーザー操作による変更はデバウンス保存し、アンマウント・pagehide で即時フラッシュ
 * - 隠しコマンド（SETTINGS_CHANGED_EVENT）と他タブ（storage イベント）の
 *   書き換えを検知したら localStorage から再読込する（未保存分は外部の値を正として破棄）
 * - 既知の制約: 保存は常に全量書き込みのため、複数タブでほぼ同時に編集すると
 *   後勝ち（Last-Write-Wins）になり先に保存した側の変更は失われる。
 *   個人のローカル図鑑という用途上、エントリ単位のマージまではしない
 */
export function useCollection() {
  const [collection, setCollection] = useState<CollectionData>(emptyCollection);
  const [loaded, setLoaded] = useState(false);
  // イベントハンドラ等、レンダーに紐付かない場所から最新の図鑑を参照するための ref
  const collectionRef = useRef(collection);
  // 「localStorage から読み込んだままの state」の同一性判定用
  const loadedRef = useRef<CollectionData | null>(null);
  const pendingRef = useRef<CollectionData | null>(null);
  const timerRef = useRef<number | null>(null);
  // 保存失敗トーストの重複抑止（容量超過は連続で起きるため初回のみ通知）
  const saveFailWarnedRef = useRef(false);

  useEffect(() => {
    collectionRef.current = collection;
  }, [collection]);

  const flushSave = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current != null) {
      const ok = saveCollection(pendingRef.current);
      pendingRef.current = null;
      if (!ok && !saveFailWarnedRef.current) {
        saveFailWarnedRef.current = true;
        toast.error(
          "図鑑を保存できませんでした。ブラウザのストレージ容量を確認してください",
        );
      }
    }
  }, []);

  const reload = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    const data = loadCollection();
    loadedRef.current = data;
    setCollection(data);
  }, []);

  useEffect(() => {
    // localStorage はクライアント限定のため、マウント後に読み込む
    /* eslint-disable react-hooks/set-state-in-effect */
    reload();
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [reload]);

  // ユーザー操作による変更のみデバウンス保存する
  useEffect(() => {
    if (!loaded || collection === loadedRef.current) return;
    pendingRef.current = collection;
    if (timerRef.current != null) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }, [collection, loaded, flushSave]);

  // ページ離脱・アンマウント（ページ間遷移）時に未保存分をフラッシュ
  useEffect(() => {
    window.addEventListener("pagehide", flushSave);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  // 隠しコマンド（同一タブ）・他タブの書き換えを state へ反映する
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // key === null は clear() 相当
      if (e.key === null || e.key === COLLECTION_STORAGE_KEY) reload();
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, reload);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, reload);
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);

  /**
   * 視聴状態（観た / 後で観る / 興味なし）を設定し、図鑑に記録済みの作品だったかを返す。
   * 未記録の作品（/reset all 直後の表示済みカード等）は setStatus が no-op に
   * なるため、呼び出し側は戻り値 false のとき成功トーストを出さない。
   */
  const markStatus = useCallback(
    (annictId: number, next: CollectionStatus): boolean => {
      const known = collectionRef.current.entries[String(annictId)] != null;
      setCollection((prev) => setStatus(prev, annictId, next));
      return known;
    },
    [],
  );

  /** お気に入りを設定する。markStatus と同じく記録済みかを返す（watched 以外は setFavorite 側で no-op）。 */
  const markFavorite = useCallback((annictId: number, on: boolean): boolean => {
    const known = collectionRef.current.entries[String(annictId)] != null;
    setCollection((prev) => setFavorite(prev, annictId, on));
    return known;
  }, []);

  return {
    collection,
    setCollection,
    loaded,
    collectionRef,
    markStatus,
    markFavorite,
  };
}
