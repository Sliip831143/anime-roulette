import type { CSSProperties } from "react";

// 立ち絵の登場演出で、まだ現れていない部分に重ねる「青い四角の群れ」の画像（SVG の data URI）を作る。
// 立ち絵と同じ縦横比（760:981）の座標系に大きさの違う正方形を敷き詰め、hero.css 側で
// 立ち絵のシルエットと表示境界の帯で切り抜いて使う。乱数は固定シードなので毎回同じ配置になる。

const VIEW_W = 76;
const VIEW_H = 98;
// 色ごとの個数。ページ背景が淡い水色なので、埋もれない濃さの青だけを使う
const TONES = [
  { fill: "#7dd3fc", opacity: 0.95, count: 80 },
  { fill: "#38bdf8", opacity: 0.9, count: 150 },
  { fill: "#2563eb", opacity: 0.8, count: 130 },
] as const;

function createRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSquaresImage(seed: number): string {
  const random = createRandom(seed);
  const paths = TONES.map(({ fill, opacity, count }) => {
    let d = "";
    for (let i = 0; i < count; i++) {
      // 小さい四角を多めに、大きい四角をたまに混ぜる（0.8〜3.6。立ち絵の幅の約 1〜5%）
      const size = (0.8 + random() ** 2 * 2.8).toFixed(1);
      const x = (random() * VIEW_W).toFixed(1);
      const y = (random() * VIEW_H).toFixed(1);
      d += `M${x} ${y}h${size}v${size}h-${size}z`;
    }
    return `<path fill="${fill}" fill-opacity="${opacity}" d="${d}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none">${paths}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// 配置の違う 2 枚を交互に明滅させて、四角がちらつくように見せる
export const MASCOT_WARP_STYLE = {
  "--mascot-warp-a": buildSquaresImage(831),
  "--mascot-warp-b": buildSquaresImage(143),
} as CSSProperties;
