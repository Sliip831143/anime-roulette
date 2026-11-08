"use client";

import { useEffect, useState } from "react";

const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

/**
 * 操作が idleMs 続かなかったら cheerMs の間だけ true を返し、操作がなければ同じ間隔で繰り返す。
 * 操作があるたびに待ち時間を数え直す（表示中の演出は途中で打ち切らない）。
 * OS で「動きを減らす」設定をしている環境では常に false。
 */
export function useIdleCheer(
  enabled: boolean,
  idleMs: number,
  cheerMs: number,
): boolean {
  const [cheering, setCheering] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let cheerTimer: ReturnType<typeof setTimeout> | undefined;
    let isCheering = false;

    const scheduleIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(startCheer, idleMs);
    };

    const startCheer = () => {
      isCheering = true;
      setCheering(true);
      cheerTimer = setTimeout(() => {
        isCheering = false;
        setCheering(false);
        scheduleIdle();
      }, cheerMs);
    };

    const handleActivity = () => {
      if (!isCheering) scheduleIdle();
    };

    scheduleIdle();
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, handleActivity, { passive: true });
    }
    return () => {
      clearTimeout(idleTimer);
      clearTimeout(cheerTimer);
      for (const type of ACTIVITY_EVENTS) {
        window.removeEventListener(type, handleActivity);
      }
      setCheering(false);
    };
  }, [enabled, idleMs, cheerMs]);

  return cheering;
}
