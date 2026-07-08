"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/components/use-focus-trap";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  /** 補足説明。複数行・注記は <p> を並べて渡す */
  description: ReactNode;
  confirmLabel: string;
  /** true で実行ボタンを destructive 色に（取り消せない操作向け） */
  destructive?: boolean;
  /** 実行。ダイアログを閉じる（state クリア）のは呼び出し側の責務 */
  onConfirm: () => void;
  /** キャンセル・Esc・背面クリック */
  onClose: () => void;
};

/**
 * テーマに合わせた確認ダイアログ。window.confirm の置き換え用。
 * 実装は AnimeDetailDialog と同じパターン（Portal + useFocusTrap +
 * Esc / 背面クリックで閉じる + body スクロールロック）に揃える。
 * 誤爆防止のため、初期フォーカスは DOM 順先頭のキャンセルボタンに当たる
 * （useFocusTrap は「コンテナ内最初のフォーカス可能要素」へフォーカスする）。
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);

  // Esc キーで閉じる + body スクロールロック
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // SSR ガード（document が無い環境ではレンダーしない）
  if (typeof document === "undefined") return null;

  // 親のスタッキングコンテキストの影響を避けるため body 直下へ Portal
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm space-y-3 rounded-[6px] bg-card p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <div
          id="confirm-dialog-description"
          className="space-y-1 text-sm text-muted-foreground"
        >
          {description}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
