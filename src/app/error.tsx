"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h2 className="text-xl font-semibold">予期しないエラーが発生しました</h2>
      <p className="max-w-md text-sm text-muted-foreground break-all">
        {error.message || "申し訳ありません。問題が発生しました。"}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">エラーID: {error.digest}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          もう一度試す
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          トップへ戻る
        </Button>
      </div>
    </div>
  );
}
