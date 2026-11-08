// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchForm } from "./search-form";

// 放送年の入力も type="number" なので、件数入力は上限（max=50）で見分ける
const countInput = () =>
  screen
    .getAllByRole("spinbutton")
    .find((el) => el.getAttribute("max") === "50") as HTMLInputElement;

describe("SearchForm: 件数の数値入力（/max 拡張時）", () => {
  it("Backspace で空にしてから打ち直せる", () => {
    render(<SearchForm loading={false} onSubmit={vi.fn()} extendedCount />);
    const input = countInput();
    expect(input.value).toBe("5");

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(screen.getByText("取得件数: 5件")).toBeTruthy();

    fireEvent.change(input, { target: { value: "9" } });
    expect(input.value).toBe("9");
    expect(screen.getByText("取得件数: 9件")).toBeTruthy();
  });

  it("範囲外の途中入力は保持しつつ件数には反映せず、フォーカスが外れたら確定値に戻す", () => {
    render(<SearchForm loading={false} onSubmit={vi.fn()} extendedCount />);
    const input = countInput();

    fireEvent.change(input, { target: { value: "59" } });
    expect(input.value).toBe("59");
    expect(screen.getByText("取得件数: 5件")).toBeTruthy();

    fireEvent.blur(input);
    expect(input.value).toBe("5");
  });
});
