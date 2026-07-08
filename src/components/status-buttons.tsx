"use client";

import { Check, Ban } from "lucide-react";
import type { CollectionStatus } from "@/lib/collection";

type Props = {
  status: CollectionStatus;
  onChange: (next: CollectionStatus) => void;
};

/**
 * 「観た / 興味なし」のトグルボタン対。
 * 結果カード・詳細ダイアログ・図鑑ページで共用する。
 * 埋め込み先のカードは「カード div の onClick ＋ isInteractiveElementClick 判定で
 * 内側の button/a 起点を無視」する構成のため、ここでイベント伝播を止める必要はない
 * （止めると Esc 等の親ハンドラを阻害する）。
 */
export function StatusButtons({ status, onChange }: Props) {
  const toggle = (target: Exclude<CollectionStatus, "none">) =>
    onChange(status === target ? "none" : target);

  const base =
    "inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    // shrink-0: 狭い行ではボタンをつぶさず、同居するテキスト側に折り返させる
    <span className="inline-flex shrink-0 flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={status === "watched"}
        onClick={() => toggle("watched")}
        className={`${base} ${
          status === "watched"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Check className="size-3" aria-hidden />
        観た
      </button>
      <button
        type="button"
        aria-pressed={status === "not_interested"}
        onClick={() => toggle("not_interested")}
        className={`${base} ${
          status === "not_interested"
            ? "border-destructive/60 bg-destructive/10 text-[oklch(0.5_0.22_27)]"
            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Ban className="size-3" aria-hidden />
        興味なし
      </button>
    </span>
  );
}
