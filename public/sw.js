// アニメルーレット Service Worker
// - 静的アセットのプリキャッシュ
// - 同一オリジン GET のキャッシュファースト
// - /api/* は常にネットワーク優先（Annict検索結果は毎回フレッシュ）
// - 外部リクエスト（Annict CDN等）はパススルー

const CACHE_VERSION = "v1";
const CACHE_NAME = `anime-roulette-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png",
  "/gacha/arona_1.avif",
  "/gacha/arona_2.avif",
  "/gacha/card_1.avif",
  "/gacha/card_2.avif",
  "/gacha/card_3.avif",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 外部オリジン（Annict CDN, Google Fonts等）はSW介入しない
  if (url.origin !== self.location.origin) return;

  // /api/* は常にネットワーク優先（検索結果は毎回新規）
  if (url.pathname.startsWith("/api/")) return;

  // Next.js の HMR/dev サーバ系も介入しない
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // オフライン時、ナビゲーション要求なら "/" にフォールバック
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    }),
  );
});
