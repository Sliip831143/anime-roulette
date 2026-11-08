// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimeDetailDialog } from "./anime-detail-dialog";

const renderDialog = () =>
  render(
    <AnimeDetailDialog
      annictId={4168}
      initial={{ title: "SHIROBAKO", watchersCount: 100, satisfactionRate: 80 }}
      status="none"
      favorite={false}
      onFavoriteChange={vi.fn()}
      onStatusChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );

describe("AnimeDetailDialog: 詳細取得のエラー表示", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("JSON でないエラー応答（504 など）は例外文ではなく案内文を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 504,
        json: async () => {
          throw new SyntaxError(
            "Unexpected token 'A', \"An error o\"... is not valid JSON",
          );
        },
      })),
    );
    renderDialog();
    expect(await screen.findByText(/サーバが混雑しています/)).toBeTruthy();
    expect(screen.queryByText(/Unexpected token/)).toBeNull();
  });

  it("JSON のエラー応答は error フィールドの文言を出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => ({ error: "詳細情報の取得に失敗しました" }),
      })),
    );
    renderDialog();
    expect(
      await screen.findByText(/詳細情報の取得に失敗しました/),
    ).toBeTruthy();
  });
});
