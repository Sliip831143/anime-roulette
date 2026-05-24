// アニメルーレット Service Worker
// - 静的アセットのプリキャッシュ
// - HTML ナビゲーションはネットワーク優先（最新デプロイの JS バンドルを確実に参照させる）
// - その他の同一オリジン GET（ハッシュ付き /_next/static など）はキャッシュファースト
// - /api/* と /_next/data/* は常にネットワーク優先（毎回フレッシュ）
// - 外部リクエスト（Annict CDN等）はパススルー

const CACHE_VERSION = "v3";
const CACHE_NAME = `anime-roulette-${CACHE_VERSION}`;

const PRECACHE_URLS = [
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

  // /api/* と /_next/data/* は常にネットワーク優先（毎回新規）
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/data/")) return;

  // Next.js の HMR/dev サーバ系も介入しない
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // App Router の RSC プリフェッチ／RSC payload リクエストは SW を通さない。
  // 同一 URL でも HTML と RSC ペイロード（multipart）が返り得るため、cache-first だと
  // RSC リクエストに対して HTML を返してしまい、multipart 境界が画面に露出したり
  // React #418（hydration mismatch）が発生する。
  if (event.request.headers.get("rsc") === "1") return;
  if (event.request.headers.has("next-router-state-tree")) return;
  if (event.request.headers.has("next-router-prefetch")) return;
  if (event.request.headers.has("next-router-segment-prefetch")) return;

  // HTML ナビゲーションはネットワーク優先：常に最新 HTML を取得し、
  // 失敗時のみキャッシュ／オフラインフォールバックする。
  // これをしないと旧 HTML が cache-first で固定化され、古いハッシュの JS が
  // 読み込まれ続けて新機能が反映されない。
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached ?? caches.match("/")),
        ),
    );
    return;
  }

  // それ以外の同一オリジン GET（ハッシュ付き /_next/static, 画像など）は cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
