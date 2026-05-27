// 旧 Service Worker のクリーンアップ用 tombstone。
// 過去に v1〜v3 の SW を登録したユーザーがアップデートチェックでこのファイルを再取得した際、
// 自身を unregister し、関連 caches を削除する。
// 既存ユーザーの SW が一通り掃けたタイミング（数ヶ月後）でファイルごと削除して構わない。

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
    })(),
  );
});
