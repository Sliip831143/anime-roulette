// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnictWork } from "@/lib/annict";
import { ANIM_DISABLED_KEY } from "@/lib/settings";
import Home from "./page";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// 演出本体は別チャンク（next/dynamic）。ここでは「表示されたか」と「閉じる操作」だけを見たいので、
// 描画内容を持たないスタブに差し替える
vi.mock("@/components/gacha-sequence", () => ({
  GachaSequence: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="gacha-sequence">
      <button type="button" onClick={onClose}>
        演出を閉じる
      </button>
    </div>
  ),
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
  image: { recommendedImageUrl: null },
});

const WORKS = [1, 2, 3].map(makeWork);

const drawGacha = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /ガチャを引く/ }));
};

describe("Home: 演出スイッチ", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.gachaBg;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ works: WORKS }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("初期状態は ON で、切り替えると anim-disabled に保存される", async () => {
    render(<Home />);
    const sw = await screen.findByRole("switch", { name: "演出" });
    expect(sw.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem(ANIM_DISABLED_KEY)).toBe("1");

    // ラベルの文字をクリックしても 1 回だけ切り替わる
    fireEvent.click(screen.getByText("演出"));
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem(ANIM_DISABLED_KEY)).toBe("0");
  });

  it("保存値が演出 OFF なら OFF で始まる", async () => {
    localStorage.setItem(ANIM_DISABLED_KEY, "1");
    render(<Home />);
    const sw = await screen.findByRole("switch", { name: "演出" });
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("演出 OFF でガチャを引くと、演出を挟まずに結果を表示する", async () => {
    localStorage.setItem(ANIM_DISABLED_KEY, "1");
    render(<Home />);
    await screen.findByRole("switch", { name: "演出" });

    await drawGacha();

    expect(
      await screen.findByRole("button", { name: "「作品1」の詳細を見る" }),
    ).toBeTruthy();
    expect(screen.queryByTestId("gacha-sequence")).toBeNull();
  });

  it("演出 ON でガチャを引くと演出を表示し、閉じると結果を表示する", async () => {
    render(<Home />);
    await screen.findByRole("switch", { name: "演出" });

    await drawGacha();

    expect(await screen.findByTestId("gacha-sequence")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "「作品1」の詳細を見る" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "演出を閉じる" }));
    expect(
      await screen.findByRole("button", { name: "「作品1」の詳細を見る" }),
    ).toBeTruthy();
    expect(screen.queryByTestId("gacha-sequence")).toBeNull();
  });

  it("結果が出たときにフォーカスが body に落ちていれば「結果」見出しへ移す", async () => {
    localStorage.setItem(ANIM_DISABLED_KEY, "1");
    render(<Home />);
    await screen.findByRole("switch", { name: "演出" });

    await drawGacha();
    await screen.findByRole("button", { name: "「作品1」の詳細を見る" });

    // 取得中にボタンが disabled になってフォーカスが失われた状況を再現
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    // 実装は結果確定時の effect で移すため、改めて結果を出し直して確認する
    await drawGacha();
    // 1 回目の結果カードが残っているため、カードの有無では 2 回目の結果確定を待てない。
    // フォーカスが移るまで待つ
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "結果" }),
      ),
    );
  });
  it("★3 を含む結果なら、演出の表示中からページ背景がピンクになり結果表示後も続く", async () => {
    // watchersCount 22,000 以上は ★3（src/lib/rarity.ts）
    const r3 = { ...makeWork(9), watchersCount: 30_000 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ works: [r3] }),
    } as Response);
    render(<Home />);
    await screen.findByRole("switch", { name: "演出" });

    await drawGacha();

    await screen.findByTestId("gacha-sequence");
    // 背景の切り替えは描画後の effect で行うため、演出が DOM に出た直後はまだ反映されていないことがある
    await waitFor(() =>
      expect(document.documentElement.dataset.gachaBg).toBe("rainbow"),
    );

    fireEvent.click(screen.getByRole("button", { name: "演出を閉じる" }));
    await screen.findByRole("button", { name: "「作品9」の詳細を見る" });
    expect(document.documentElement.dataset.gachaBg).toBe("rainbow");
  });

  it("★3 を含まない結果ならページ背景は青のまま", async () => {
    render(<Home />);
    await screen.findByRole("switch", { name: "演出" });

    await drawGacha();

    await screen.findByTestId("gacha-sequence");
    expect(document.documentElement.dataset.gachaBg).toBeUndefined();
  });
});
