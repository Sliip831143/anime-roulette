/**
 * 本番 URL の一元管理。
 * 以前は layout.tsx / share.ts / share/page.tsx / api/og に分散してハードコードされており、
 * デプロイ先変更時に修正漏れのリスクがあったためここに集約した。
 * NEXT_PUBLIC_SITE_URL で上書き可能（未設定時は Vercel の本番 URL）。
 */
// `${SITE_URL}/share` のように連結して使うため、環境変数に末尾スラッシュが付いていても二重にならないよう落とす
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anime-roulette-inky.vercel.app"
).replace(/\/+$/, "");

/** OG 画像のフッター等に表示するホスト名（プロトコルなし） */
export const SITE_HOST = new URL(SITE_URL).host;
