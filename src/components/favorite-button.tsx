"use client";

import { Heart } from "lucide-react";

type Props = {
  favorite: boolean;
  onChange: (on: boolean) => void;
  /** 配置用（カード右上に重ねる absolute 指定など）。見た目はここでは決めない */
  className?: string;
};

/**
 * 「観た」作品にだけ付くお気に入り印。丸枠の中にハートを置き、ON で塗りつぶす。
 * 表示するかどうか（status === "watched" のときだけ）はホスト側が判断する。
 */
export function FavoriteButton({ favorite, onChange, className = "" }: Props) {
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label="お気に入り"
      title="お気に入り"
      onClick={() => onChange(!favorite)}
      className={`inline-flex size-[26px] cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
        favorite
          ? "border-[oklch(0.85_0.08_350)] text-[oklch(0.6_0.2_350)]"
          : "border-border text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      <Heart
        className={`size-3.5 ${favorite ? "fill-current" : ""}`}
        aria-hidden
      />
    </button>
  );
}
