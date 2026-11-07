// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { AnnictWork } from "./annict";
import {
  COLLECTION_STORAGE_KEY,
  emptyCollection,
  recordDraws,
  type CollectionData,
} from "./collection";
import { SETTINGS_CHANGED_EVENT } from "./settings";
import { useCollection } from "./use-collection";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

const makeWork = (annictId: number): AnnictWork => ({
  annictId,
  title: `作品${annictId}`,
  seasonYear: 2024,
  seasonName: "SPRING",
  media: "TV",
  watchersCount: 100,
  reviewsCount: 0,
  satisfactionRate: 80,
  officialSiteUrl: null,
  twitterHashtag: null,
  image: { recommendedImageUrl: "https://example.com/1.jpg" },
});

/** localStorage に実際に永続化された図鑑（未保存なら null） */
const stored = (): CollectionData | null => {
  const raw = localStorage.getItem(COLLECTION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as CollectionData) : null;
};

describe("useCollection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("マウント時に読み込むが、読み込んだだけでは書き戻さない", () => {
    const data = recordDraws(emptyCollection(), [makeWork(1)], 1_000);
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(data));
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { result } = renderHook(() => useCollection());
    expect(result.current.loaded).toBe(true);
    expect(result.current.collection.entries["1"]).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it("ユーザー変更はデバウンス（300ms）後に保存される", () => {
    const { result } = renderHook(() => useCollection());
    act(() => {
      result.current.setCollection((prev) =>
        recordDraws(prev, [makeWork(1)], 1_000),
      );
    });
    expect(stored()).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(stored()?.entries["1"]).toBeTruthy();
  });

  it("pagehide で未保存分を即時フラッシュする", () => {
    const { result } = renderHook(() => useCollection());
    act(() => {
      result.current.setCollection((prev) =>
        recordDraws(prev, [makeWork(1)], 1_000),
      );
    });
    expect(stored()).toBeNull();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(stored()?.entries["1"]).toBeTruthy();
  });

  it("アンマウント（ページ遷移）で未保存分をフラッシュする", () => {
    const { result, unmount } = renderHook(() => useCollection());
    act(() => {
      result.current.setCollection((prev) =>
        recordDraws(prev, [makeWork(1)], 1_000),
      );
    });
    expect(stored()).toBeNull();

    unmount();
    expect(stored()?.entries["1"]).toBeTruthy();
  });

  it("SETTINGS_CHANGED_EVENT で再読込し、未保存分は破棄する", () => {
    const { result } = renderHook(() => useCollection());
    // 未保存の変更（pending）を作る
    act(() => {
      result.current.setCollection((prev) =>
        recordDraws(prev, [makeWork(1)], 1_000),
      );
    });
    // 隠しコマンド相当の外部書き換え
    const external = recordDraws(emptyCollection(), [makeWork(2)], 2_000);
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(external));

    act(() => {
      window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
    });
    expect(result.current.collection.entries["2"]).toBeTruthy();
    expect(result.current.collection.entries["1"]).toBeUndefined();

    // 破棄した pending が後から保存されないこと
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(stored()?.entries["1"]).toBeUndefined();
  });

  it("他タブの storage イベント（対象キー）で再読込する", () => {
    const { result } = renderHook(() => useCollection());
    const external = recordDraws(emptyCollection(), [makeWork(3)], 1_000);
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(external));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: COLLECTION_STORAGE_KEY }),
      );
    });
    expect(result.current.collection.entries["3"]).toBeTruthy();
  });

  it("markStatus は記録済みなら true・状態更新、未記録なら no-op で false", () => {
    const data = recordDraws(emptyCollection(), [makeWork(1)], 1_000);
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(data));
    const { result } = renderHook(() => useCollection());

    let known: boolean | undefined;
    act(() => {
      known = result.current.markStatus(1, "watched");
    });
    expect(known).toBe(true);
    expect(result.current.collection.entries["1"].status).toBe("watched");

    act(() => {
      known = result.current.markStatus(999, "watched");
    });
    expect(known).toBe(false);
    expect(result.current.collection.entries["999"]).toBeUndefined();
  });

  it("markFavorite は watched のエントリにだけ付き、未記録なら no-op で false", () => {
    const data = recordDraws(emptyCollection(), [makeWork(1)], 1_000);
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(data));
    const { result } = renderHook(() => useCollection());

    act(() => {
      result.current.markStatus(1, "watched");
    });
    let known: boolean | undefined;
    act(() => {
      known = result.current.markFavorite(1, true);
    });
    expect(known).toBe(true);
    expect(result.current.collection.entries["1"].favorite).toBe(true);

    act(() => {
      known = result.current.markFavorite(999, true);
    });
    expect(known).toBe(false);
  });

  it("保存に失敗したら警告ログと一度だけのエラートーストを出す", () => {
    const { result } = renderHook(() => useCollection());
    act(() => {
      result.current.setCollection((prev) =>
        recordDraws(prev, [makeWork(1)], 1_000),
      );
    });
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);

    // 2 回目以降の失敗ではトーストを重ねない
    act(() => {
      result.current.setCollection((prev) =>
        recordDraws(prev, [makeWork(2)], 2_000),
      );
      vi.advanceTimersByTime(300);
    });
    expect(toast.error).toHaveBeenCalledTimes(1);

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
