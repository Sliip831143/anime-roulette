import { describe, it, expect } from "vitest";
import { expandSeasons, isSeason, SEASONS } from "./seasons";

describe("expandSeasons", () => {
  it("年が両方未指定なら空配列を返す", () => {
    expect(expandSeasons({})).toEqual([]);
    expect(expandSeasons({ seasons: ["spring"] })).toEqual([]);
  });

  it("yearFrom のみ指定なら、その年の全季節を返す", () => {
    expect(expandSeasons({ yearFrom: 2023 })).toEqual([
      "2023-spring",
      "2023-summer",
      "2023-autumn",
      "2023-winter",
    ]);
  });

  it("yearTo のみ指定なら、その年の全季節を返す（yearFrom と同等扱い）", () => {
    expect(expandSeasons({ yearTo: 2023 })).toEqual([
      "2023-spring",
      "2023-summer",
      "2023-autumn",
      "2023-winter",
    ]);
  });

  it("yearFrom と yearTo が同じなら、その1年分を返す", () => {
    expect(expandSeasons({ yearFrom: 2022, yearTo: 2022 })).toHaveLength(4);
  });

  it("複数年の範囲は各年×全季節を返す", () => {
    const result = expandSeasons({ yearFrom: 2020, yearTo: 2022 });
    expect(result).toHaveLength(3 * 4);
    expect(result[0]).toBe("2020-spring");
    expect(result[result.length - 1]).toBe("2022-winter");
  });

  it("seasons を指定すると、その季節のみに絞られる", () => {
    expect(
      expandSeasons({ yearFrom: 2023, yearTo: 2023, seasons: ["summer"] }),
    ).toEqual(["2023-summer"]);
  });

  it("seasons の順序がそのまま反映される（並び順保持）", () => {
    expect(
      expandSeasons({
        yearFrom: 2023,
        yearTo: 2023,
        seasons: ["winter", "spring"],
      }),
    ).toEqual(["2023-winter", "2023-spring"]);
  });

  it("seasons が空配列なら全季節として扱われる", () => {
    expect(expandSeasons({ yearFrom: 2023, seasons: [] })).toHaveLength(4);
  });

  it("yearFrom > yearTo はエラーを投げる", () => {
    expect(() => expandSeasons({ yearFrom: 2025, yearTo: 2020 })).toThrow(
      "yearFrom must be less than or equal to yearTo",
    );
  });

  it("複数年×複数季節の組み合わせも正しく展開する", () => {
    const result = expandSeasons({
      yearFrom: 2020,
      yearTo: 2021,
      seasons: ["spring", "autumn"],
    });
    expect(result).toEqual([
      "2020-spring",
      "2020-autumn",
      "2021-spring",
      "2021-autumn",
    ]);
  });
});

describe("isSeason", () => {
  it("有効な季節文字列を true として認識する", () => {
    for (const season of SEASONS) {
      expect(isSeason(season)).toBe(true);
    }
  });

  it("大文字や別表記は false", () => {
    expect(isSeason("Spring")).toBe(false);
    expect(isSeason("SPRING")).toBe(false);
    expect(isSeason("haru")).toBe(false);
  });

  it("空文字や無関係な文字列は false", () => {
    expect(isSeason("")).toBe(false);
    expect(isSeason("autumn-2023")).toBe(false);
  });
});
