"use client";

import { useEffect } from "react";

/**
 * 旧 Service Worker の登録解除を行うコンポーネント。
 *
 * 過去に v1〜v3 の SW が登録されていたが、本アプリはオンライン専用で SW を使うメリットが薄く、
 * RSC との相性や未捕捉エラーなど運用コストが上回ったため廃止。既存ユーザーのブラウザに残る
 * SW を unregister し、関連 caches を削除する。
 *
 * `public/sw.js` も tombstone 化してあるため二重に保険が掛かっている。既存ユーザーが
 * 一通り掃けたタイミングで本コンポーネントと sw.js / layout.tsx の参照を併せて削除して構わない。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
    }

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);

  return null;
}
