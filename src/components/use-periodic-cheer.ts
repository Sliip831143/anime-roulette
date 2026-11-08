"use client";

import { useEffect, useState } from "react";

/**
 * enabled の間、intervalMs 待つごとに cheerMs の間だけ true を返す（操作の有無に関係なく繰り返す）。
 * 次の待ちは演出が終わった時点から数える。
 * OS で「動きを減らす」設定をしている環境では常に false。
 */
export function usePeriodicCheer(
  enabled: boolean,
  intervalMs: number,
  cheerMs: number,
): boolean {
  const [cheering, setCheering] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;

    const scheduleCheer = () => {
      timer = setTimeout(() => {
        setCheering(true);
        timer = setTimeout(() => {
          setCheering(false);
          scheduleCheer();
        }, cheerMs);
      }, intervalMs);
    };

    scheduleCheer();
    return () => {
      clearTimeout(timer);
      setCheering(false);
    };
  }, [enabled, intervalMs, cheerMs]);

  return cheering;
}
