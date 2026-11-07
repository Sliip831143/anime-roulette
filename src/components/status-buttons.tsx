"use client";

import { Check, Clock, Ban, type LucideIcon } from "lucide-react";
import type { CollectionStatus } from "@/lib/collection";

type Props = {
  status: CollectionStatus;
  onChange: (next: CollectionStatus) => void;
};

type Segment = {
  value: Exclude<CollectionStatus, "none">;
  label: string;
  Icon: LucideIcon;
  selectedClass: string;
};

// 選択中の塗り色。観た＝緑 / 後で観る＝青 / 興味なし＝赤系で、いずれも「淡い背景に濃い文字」で統一し
// 文字とのコントラスト 4.5:1 以上を確保する
const SEGMENTS: Segment[] = [
  {
    value: "watched",
    label: "観た",
    Icon: Check,
    selectedClass: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.4_0.12_150)]",
  },
  {
    value: "later",
    label: "後で観る",
    Icon: Clock,
    selectedClass: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.4_0.12_250)]",
  },
  {
    value: "not_interested",
    label: "興味なし",
    Icon: Ban,
    selectedClass: "bg-destructive/10 text-[oklch(0.5_0.22_27)]",
  },
];

/**
 * 視聴状態「観た / 後で観る / 興味なし」の 3 区画を連結した 1 本のピル。
 * 結果カード・詳細ダイアログ・図鑑ページで共用する。
 * 状態が 3 つに増えてもカード幅を広げないため、未選択の区画はアイコンのみ、
 * 選択中の区画だけラベルを出す（アイコンのみの区画は aria-label / title で意味を補う）。
 * 埋め込み先のカードは「カード div の onClick ＋ isInteractiveElementClick 判定で
 * 内側の button/a 起点を無視」する構成のため、ここでイベント伝播を止める必要はない
 * （止めると Esc 等の親ハンドラを阻害する）。
 */
export function StatusButtons({ status, onChange }: Props) {
  return (
    // shrink-0: 狭い行ではピルをつぶさず、同居するテキスト側に折り返させる
    <span
      role="group"
      aria-label="視聴状態"
      className="inline-flex h-6 shrink-0 overflow-hidden rounded-full border border-border bg-background text-[11px] font-medium"
    >
      {SEGMENTS.map(({ value, label, Icon, selectedClass }, i) => {
        const selected = status === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={label}
            title={label}
            onClick={() => onChange(selected ? "none" : value)}
            className={`inline-flex cursor-pointer items-center gap-1 whitespace-nowrap px-[7px] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 ${
              i > 0 ? "border-l border-border" : ""
            } ${
              selected
                ? selectedClass
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3" aria-hidden />
            {selected && <span>{label}</span>}
          </button>
        );
      })}
    </span>
  );
}
