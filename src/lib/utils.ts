import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MouseEvent } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * カード全面クリックのハンドラで、内側の button / a 起点のクリックを
 * 無視するための判定（実 button と冗長なマウス用 onClick の二重発火防止）。
 */
export function isInteractiveElementClick(e: MouseEvent): boolean {
  return !!(e.target as HTMLElement).closest("button, a");
}
