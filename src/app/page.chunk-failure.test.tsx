// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnictWork } from "@/lib/annict";
import Home from "./page";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// 演出チャンクの読み込み失敗（オフライン、デプロイ直後で古いページが参照するチャンクが消えている等）を再現する。
// vi.mock は 1 ファイルに 1 つしか効かないため、成功ケース（page.test.tsx）とファイルを分けている
vi.mock("@/components/gacha-sequence", () => {
  throw new Error("ChunkLoadError (simulated)");
});

const work: AnnictWork = {
  annictId: 1,
  title: "作品1",
  seasonYear: 2024,
  seasonName: "SPRING",
  media: "TV",
  watchersCount: 100,
  reviewsCount: 0,
  satisfactionRate: 80,
  officialSiteUrl: null,
  twitterHashtag: null,
  image: { recommendedImageUrl: null },
};

describe("Home: 演出チャンクの読み込み失敗", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ works: [work] }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("演出 ON でも演出を飛ばして結果を直接表示する", async () => {
    render(<Home />);
    const sw = await screen.findByRole("switch", { name: "演出" });
    expect(sw.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /ガチャを引く/ }));

    expect(
      await screen.findByRole("button", { name: "「作品1」の詳細を見る" }),
    ).toBeTruthy();
  });
});
