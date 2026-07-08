import type { SVGProps } from "react";

/**
 * No image プレースホルダ共通のピクトグラム（額縁＋山）。
 * 結果カード（簡易/ガチャ）と図鑑カードで共用する。
 * 色・サイズは currentColor / className で埋め込み先に追従させる。
 */
export function NoImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="8" y="12" width="48" height="40" rx="3" />
      <circle cx="22" cy="26" r="4" />
      <path d="M8 44 L24 30 L36 40 L48 28 L56 36" />
    </svg>
  );
}
