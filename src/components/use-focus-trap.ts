"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * モーダルダイアログ用のフォーカストラップ。
 *
 * - active になったらコンテナ内の最初のフォーカス可能要素へフォーカスを移す
 * - Tab / Shift+Tab をコンテナ内で循環させ、背後のページへ抜けないようにする
 * - 非活性化（クローズ）時に、開く前にフォーカスされていた要素へ復帰する
 *
 * role="dialog" + aria-modal="true" の自前ダイアログ（詳細ダイアログ・
 * 画像プレビュー・ガチャ演出）が対象。ネストする場合は親側の active を
 * 切って同時に 2 つのトラップが動かないようにする。
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean = true,
): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const getFocusables = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0);

    (getFocusables()[0] ?? container).focus();

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = current instanceof HTMLElement && container.contains(current);
      if (e.shiftKey) {
        if (!inside || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown, true);
    return () => {
      document.removeEventListener("keydown", handleKeydown, true);
      previouslyFocused?.focus();
    };
  }, [ref, active]);
}
