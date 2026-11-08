import { describe, it, expect } from "vitest";
import {
  expandSeasons,
  getCurrentSeason,
  isSeason,
  isSeasonFilterEnabled,
  isWorkFutureSeason,
  SEASONS,
} from "./seasons";

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

  describe("未来 season の除外（seasons 未指定時）", () => {
    // 2026-05-25 時点：春(4月開始)は放送中、夏(7月開始)以降は未来
    const now = new Date(2026, 4, 25); // 月は 0-indexed

    it("当年・seasons 未指定なら、未来 season を除外する", () => {
      expect(expandSeasons({ yearFrom: 2026, yearTo: 2026, now })).toEqual([
        "2026-spring",
        "2026-winter",
      ]);
    });

    it("season 開始月 1 日ちょうどは含まれる（境界条件）", () => {
      // 2026-04-01 00:00 時点で spring(4月開始) は「開始済み」扱い
      const start = new Date(2026, 3, 1);
      expect(expandSeasons({ yearFrom: 2026, now: start })).toEqual([
        "2026-spring",
        "2026-winter",
      ]);
    });

    it("年範囲が未来年まで及ぶ場合、未来年の全 season が落ちる", () => {
      expect(expandSeasons({ yearFrom: 2025, yearTo: 2027, now })).toEqual([
        "2025-spring",
        "2025-summer",
        "2025-autumn",
        "2025-winter",
        "2026-spring",
        "2026-winter",
      ]);
    });

    it("過去年だけなら除外は発生しない", () => {
      expect(expandSeasons({ yearFrom: 2023, now })).toHaveLength(4);
    });

    it("seasons を明示指定した場合はユーザー意図を尊重して未来でも展開する", () => {
      // 「2026 年夏アニメから選ぶ」と明示されたら未来でも返す
      expect(
        expandSeasons({
          yearFrom: 2026,
          yearTo: 2026,
          seasons: ["summer", "autumn"],
          now,
        }),
      ).toEqual(["2026-summer", "2026-autumn"]);
    });
  });
});

describe("isWorkFutureSeason", () => {
  const now = new Date(2026, 4, 25); // 2026-05-25

  it("未来 season（2026-summer）は true", () => {
    expect(
      isWorkFutureSeason({ seasonYear: 2026, seasonName: "SUMMER" }, now),
    ).toBe(true);
  });

  it("現在進行中（2026-spring, 4月開始）は false", () => {
    expect(
      isWorkFutureSeason({ seasonYear: 2026, seasonName: "SPRING" }, now),
    ).toBe(false);
  });

  it("過去年（2025-autumn）は false", () => {
    expect(
      isWorkFutureSeason({ seasonYear: 2025, seasonName: "AUTUMN" }, now),
    ).toBe(false);
  });

  it("season 開始月 1 日ちょうどは false（境界条件）", () => {
    // 2026-07-01 00:00 時点で summer は「開始済み」扱い
    const start = new Date(2026, 6, 1);
    expect(
      isWorkFutureSeason({ seasonYear: 2026, seasonName: "SUMMER" }, start),
    ).toBe(false);
  });

  it("seasonYear が null なら判定不能で false（除外しない）", () => {
    expect(
      isWorkFutureSeason({ seasonYear: null, seasonName: "SUMMER" }, now),
    ).toBe(false);
  });

  it("seasonName が null なら判定不能で false（除外しない）", () => {
    expect(
      isWorkFutureSeason({ seasonYear: 2027, seasonName: null }, now),
    ).toBe(false);
  });

  it("未来年（2027-winter, 1月開始）も true", () => {
    expect(
      isWorkFutureSeason({ seasonYear: 2027, seasonName: "WINTER" }, now),
    ).toBe(true);
  });
});

describe("isSeasonFilterEnabled", () => {
  const currentYear = 2026;
  const base = {
    yearFrom: null,
    yearTo: null,
    pickedYear: null,
    currentYear,
  };

  it("年も抽選もなければ無効", () => {
    expect(isSeasonFilterEnabled(base)).toBe(false);
  });

  it("開始年を手入力していれば有効", () => {
    expect(isSeasonFilterEnabled({ ...base, yearFrom: 2020 })).toBe(true);
  });

  it("終了年を手入力していれば有効", () => {
    expect(isSeasonFilterEnabled({ ...base, yearTo: 2020 })).toBe(true);
  });

  it("開始年・終了年の両方を手入力していれば有効", () => {
    expect(
      isSeasonFilterEnabled({ ...base, yearFrom: 2018, yearTo: 2020 }),
    ).toBe(true);
  });

  it("本年を手入力した場合はユーザー意図として有効", () => {
    expect(isSeasonFilterEnabled({ ...base, yearFrom: currentYear })).toBe(
      true,
    );
  });

  it("ランダムで本年以外が選ばれていれば有効", () => {
    expect(isSeasonFilterEnabled({ ...base, pickedYear: 2020 })).toBe(true);
  });

  it("ランダムで本年が選ばれた場合は無効（未放送の季節を含みうるため）", () => {
    expect(isSeasonFilterEnabled({ ...base, pickedYear: currentYear })).toBe(
      false,
    );
  });

  it("手入力があってもランダムで本年が選ばれていれば無効（実際に検索する年に揃える）", () => {
    expect(
      isSeasonFilterEnabled({
        ...base,
        yearFrom: 2018,
        yearTo: 2020,
        pickedYear: currentYear,
      }),
    ).toBe(false);
  });

  it("手入力とランダム本年以外が併存する場合は有効", () => {
    expect(
      isSeasonFilterEnabled({
        ...base,
        yearFrom: 2018,
        pickedYear: 2010,
      }),
    ).toBe(true);
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

describe("getCurrentSeason", () => {
  it.each([
    [1, "winter"],
    [3, "winter"],
    [4, "spring"],
    [6, "spring"],
    [7, "summer"],
    [9, "summer"],
    [10, "autumn"],
    [12, "autumn"],
  ] as const)("%i 月は %s", (month, season) => {
    expect(getCurrentSeason(new Date(2026, month - 1, 15))).toEqual({
      year: 2026,
      season,
    });
  });

  it("クールの初日と末日は同じ季節になる", () => {
    expect(getCurrentSeason(new Date(2026, 9, 1, 0, 0)).season).toBe("autumn");
    expect(getCurrentSeason(new Date(2026, 11, 31, 23, 59)).season).toBe(
      "autumn",
    );
    expect(getCurrentSeason(new Date(2027, 0, 1, 0, 0))).toEqual({
      year: 2027,
      season: "winter",
    });
  });
});
