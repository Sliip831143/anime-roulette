// @vitest-environment jsdom
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnnictWork } from "@/lib/annict";
import { GachaSequence } from "./gacha-sequence";

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

describe("GachaSequence: キー操作", () => {
  it("SKIP ボタンにフォーカスがあるときの Enter / Space は既定動作（クリック）を妨げない", () => {
    render(<GachaSequence works={[work]} onClose={vi.fn()} />);
    const skip = screen.getByRole("button", { name: "演出をスキップ" });
    for (const key of ["Enter", " "]) {
      const ev = createEvent.keyDown(skip, { key });
      fireEvent(skip, ev);
      expect(ev.defaultPrevented).toBe(false);
    }
  });

  it("ステージ上の Enter は演出の進行に使う（既定動作を止める）", () => {
    render(<GachaSequence works={[work]} onClose={vi.fn()} />);
    const stage = screen.getByRole("dialog", { name: "ガチャ演出" });
    const ev = createEvent.keyDown(stage, { key: "Enter" });
    fireEvent(stage, ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("Escape はどこにフォーカスがあっても演出を終了フェーズへ進める", () => {
    render(<GachaSequence works={[work]} onClose={vi.fn()} />);
    const skip = screen.getByRole("button", { name: "演出をスキップ" });
    fireEvent.keyDown(skip, { key: "Escape" });
    expect(
      screen.getByRole("dialog", { name: "ガチャ演出" }).className,
    ).toContain("is-closing");
  });

  it("IME 変換中のキー入力は無視する", () => {
    render(<GachaSequence works={[work]} onClose={vi.fn()} />);
    const stage = screen.getByRole("dialog", { name: "ガチャ演出" });
    fireEvent.keyDown(stage, { key: "Escape", isComposing: true });
    expect(stage.className).not.toContain("is-closing");
  });
});
