import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { AnnictWork } from "./annict";
import {
  COLLECTION_STORAGE_KEY,
  emptyCollection,
  loadCollection,
  recordDraws,
  setStatus,
  setFavorite,
  clearStatus,
  excludedIdsOf,
  pickAfterExclusion,
  statsOf,
  type CollectionEntry,
} from "./collection";

const makeWork = (overrides: Partial<AnnictWork> = {}): AnnictWork => ({
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
  image: { recommendedImageUrl: "https://example.com/1.jpg" },
  ...overrides,
});

describe("recordDraws", () => {
  it("新規作品をスナップショット付きで登録し totalDraws を加算する", () => {
    const now = 1_000;
    const data = recordDraws(emptyCollection(), [makeWork()], now);
    const entry = data.entries["1"];
    expect(entry).toMatchObject({
      annictId: 1,
      title: "作品1",
      imageUrl: "https://example.com/1.jpg",
      rarity: "r1",
      watchersCount: 100,
      satisfactionRate: 80,
      firstDrawnAt: now,
      lastDrawnAt: now,
      drawCount: 1,
      status: "none",
    });
    expect(data.totalDraws).toBe(1);
  });

  it("★3 相当の作品は rarity スナップショットが r3 になる", () => {
    const data = recordDraws(
      emptyCollection(),
      [makeWork({ annictId: 2, watchersCount: 30_000 })],
      1_000,
    );
    expect(data.entries["2"].rarity).toBe("r3");
  });

  it("かぶり時は drawCount と lastDrawnAt のみ更新しスナップショットは不変", () => {
    const first = recordDraws(emptyCollection(), [makeWork()], 1_000);
    const second = recordDraws(
      first,
      [makeWork({ watchersCount: 30_000, title: "改名後" })],
      2_000,
    );
    const entry = second.entries["1"];
    expect(entry.drawCount).toBe(2);
    expect(entry.lastDrawnAt).toBe(2_000);
    expect(entry.firstDrawnAt).toBe(1_000);
    expect(entry.title).toBe("作品1"); // スナップショット不変
    expect(entry.rarity).toBe("r1"); // スナップショット不変
    expect(second.totalDraws).toBe(2);
  });

  it("status は再出現で変化しない", () => {
    let data = recordDraws(emptyCollection(), [makeWork()], 1_000);
    data = setStatus(data, 1, "watched");
    data = recordDraws(data, [makeWork()], 2_000);
    expect(data.entries["1"].status).toBe("watched");
  });

  it("空配列なら何も変わらない", () => {
    const data = emptyCollection();
    expect(recordDraws(data, [], 1_000)).toBe(data);
  });
});

describe("setStatus", () => {
  it("状態を設定・解除できる", () => {
    let data = recordDraws(emptyCollection(), [makeWork()], 1_000);
    data = setStatus(data, 1, "not_interested");
    expect(data.entries["1"].status).toBe("not_interested");
    data = setStatus(data, 1, "none");
    expect(data.entries["1"].status).toBe("none");
  });

  it("未知の annictId は無視する", () => {
    const data = emptyCollection();
    expect(setStatus(data, 999, "watched")).toBe(data);
  });
});

describe("clearStatus", () => {
  it("指定 status のみ一括で none に戻し、他とエントリ本体は不変", () => {
    let data = recordDraws(
      emptyCollection(),
      [makeWork(), makeWork({ annictId: 2 }), makeWork({ annictId: 3 })],
      1_000,
    );
    data = setStatus(data, 1, "watched");
    data = setStatus(data, 2, "watched");
    data = setStatus(data, 3, "not_interested");
    const cleared = clearStatus(data, "watched");
    expect(cleared.entries["1"].status).toBe("none");
    expect(cleared.entries["2"].status).toBe("none");
    expect(cleared.entries["3"].status).toBe("not_interested");
    expect(cleared.entries["1"].drawCount).toBe(1);
    expect(cleared.totalDraws).toBe(data.totalDraws);
  });
});

describe("excludedIdsOf", () => {
  it("watched / not_interested の ID 集合を返す", () => {
    let data = recordDraws(
      emptyCollection(),
      [makeWork(), makeWork({ annictId: 2 }), makeWork({ annictId: 3 })],
      1_000,
    );
    data = setStatus(data, 1, "watched");
    data = setStatus(data, 3, "not_interested");
    expect(excludedIdsOf(data)).toEqual(new Set([1, 3]));
  });
});

describe("pickAfterExclusion", () => {
  const works = [1, 2, 3, 4, 5].map((id) => makeWork({ annictId: id }));

  it("除外なしなら先頭 count 件", () => {
    const { picked, excludedCount } = pickAfterExclusion(works, new Set(), 3);
    expect(picked.map((w) => w.annictId)).toEqual([1, 2, 3]);
    expect(excludedCount).toBe(0);
  });

  it("除外分を飛ばして count 件を確保する", () => {
    const { picked, excludedCount } = pickAfterExclusion(
      works,
      new Set([1, 3]),
      3,
    );
    expect(picked.map((w) => w.annictId)).toEqual([2, 4, 5]);
    expect(excludedCount).toBe(2);
  });

  it("除外で足りない場合はあるだけ返す", () => {
    const { picked, excludedCount } = pickAfterExclusion(
      works,
      new Set([1, 2, 3, 4]),
      3,
    );
    expect(picked.map((w) => w.annictId)).toEqual([5]);
    expect(excludedCount).toBe(4);
  });
});

describe("statsOf", () => {
  it("ユニーク数・レアリティ内訳・状態数・通算を集計する", () => {
    let data = recordDraws(
      emptyCollection(),
      [
        makeWork(),
        makeWork({ annictId: 2, watchersCount: 30_000 }), // r3
        makeWork({ annictId: 3, watchersCount: 6_000 }), // r2
      ],
      1_000,
    );
    data = recordDraws(data, [makeWork()], 2_000); // かぶり
    data = setStatus(data, 1, "watched");
    data = setStatus(data, 3, "not_interested");
    expect(statsOf(data)).toEqual({
      unique: 3,
      byRarity: { r1: 1, r2: 1, r3: 1 },
      watched: 1,
      later: 0,
      notInterested: 1,
      favorite: 0,
      totalDraws: 4,
    });
  });
});

describe("later / favorite", () => {
  const drawn = () => recordDraws(emptyCollection(), [makeWork()], 1_000);

  it("recordDraws の新規エントリは favorite: false", () => {
    expect(drawn().entries["1"].favorite).toBe(false);
  });

  it("setFavorite は watched のエントリにだけ付く", () => {
    const base = drawn();
    expect(setFavorite(base, 1, true).entries["1"].favorite).toBe(false);
    const watched = setStatus(base, 1, "watched");
    expect(setFavorite(watched, 1, true).entries["1"].favorite).toBe(true);
    expect(setFavorite(watched, 999, true)).toBe(watched);
  });

  it("値が変わらない setStatus / setFavorite は同一参照を返す", () => {
    const watched = setStatus(drawn(), 1, "watched");
    expect(setStatus(watched, 1, "watched")).toBe(watched);
    expect(setFavorite(watched, 1, false)).toBe(watched);
  });

  it("watched 以外へ切り替えると favorite が外れる", () => {
    const fav = setFavorite(setStatus(drawn(), 1, "watched"), 1, true);
    expect(setStatus(fav, 1, "later").entries["1"].favorite).toBe(false);
    expect(setStatus(fav, 1, "none").entries["1"].favorite).toBe(false);
  });

  it("clearStatus(watched) で favorite も外れ、later / not_interested は残る", () => {
    let data = recordDraws(
      emptyCollection(),
      [makeWork({ annictId: 1 }), makeWork({ annictId: 2 }), makeWork({ annictId: 3 })],
      1_000,
    );
    data = setFavorite(setStatus(data, 1, "watched"), 1, true);
    data = setStatus(data, 2, "later");
    data = setStatus(data, 3, "not_interested");
    const cleared = clearStatus(data, "watched");
    expect(cleared.entries["1"]).toMatchObject({ status: "none", favorite: false });
    expect(cleared.entries["2"].status).toBe("later");
    expect(cleared.entries["3"].status).toBe("not_interested");
  });

  it("excludedIdsOf は later も含む", () => {
    const data = setStatus(drawn(), 1, "later");
    expect(excludedIdsOf(data)).toEqual(new Set([1]));
  });

  it("statsOf は later / favorite を数える", () => {
    let data = recordDraws(
      emptyCollection(),
      [makeWork({ annictId: 1 }), makeWork({ annictId: 2 })],
      1_000,
    );
    data = setFavorite(setStatus(data, 1, "watched"), 1, true);
    data = setStatus(data, 2, "later");
    expect(statsOf(data)).toMatchObject({
      watched: 1,
      later: 1,
      favorite: 1,
      notInterested: 0,
    });
  });
});

describe("loadCollection", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    // loadCollection は window / localStorage のグローバル参照のみ使うため最小限をスタブする
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const validEntry: CollectionEntry = {
    annictId: 1,
    title: "作品1",
    imageUrl: null,
    rarity: "r1",
    watchersCount: 100,
    satisfactionRate: 80,
    seasonYear: 2024,
    seasonName: "SPRING",
    media: "TV",
    firstDrawnAt: 1_000,
    lastDrawnAt: 1_000,
    drawCount: 1,
    status: "none",
    favorite: false,
  };

  const store = (entry: unknown) =>
    localStorage.setItem(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({ version: 1, totalDraws: 1, entries: { "1": entry } }),
    );

  it("favorite が無い旧データは false として読み込む", () => {
    const legacy: Record<string, unknown> = { ...validEntry };
    delete legacy.favorite;
    store(legacy);
    expect(loadCollection().entries["1"].favorite).toBe(false);
  });

  it("favorite が boolean でないエントリは false に正規化して温存する", () => {
    store({ ...validEntry, favorite: "yes" });
    expect(loadCollection().entries["1"].favorite).toBe(false);
  });

  it("watched 以外で favorite: true のエントリは favorite を false に正規化する", () => {
    store({ ...validEntry, status: "later", favorite: true });
    expect(loadCollection().entries["1"]).toMatchObject({
      status: "later",
      favorite: false,
    });
  });

  it("status: later は有効なエントリとして読み込む", () => {
    store({ ...validEntry, status: "later" });
    expect(loadCollection().entries["1"].status).toBe("later");
  });

  it("キーなしは初期値を返す", () => {
    expect(loadCollection()).toEqual(emptyCollection());
  });

  it("壊れた JSON は初期値にフォールバックする", () => {
    storage.set(COLLECTION_STORAGE_KEY, "{oops");
    expect(loadCollection()).toEqual(emptyCollection());
  });

  it("version 不一致は初期値にフォールバックする", () => {
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({ version: 2, totalDraws: 5, entries: {} }),
    );
    expect(loadCollection()).toEqual(emptyCollection());
  });

  it("正常なデータはそのまま読み込める", () => {
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        totalDraws: 3,
        entries: { "1": validEntry },
      }),
    );
    expect(loadCollection()).toEqual({
      version: 1,
      totalDraws: 3,
      entries: { "1": validEntry },
    });
  });

  it("不正なエントリだけを捨て、正常なエントリは温存する", () => {
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        totalDraws: 4,
        entries: {
          "1": validEntry,
          "2": null, // 破損
          "3": { ...validEntry, annictId: 3, rarity: "r9" }, // rarity 不正
          "4": { ...validEntry, annictId: 4, status: "bogus" }, // status 不正
          "5": { ...validEntry, annictId: 5, title: { evil: true } }, // title 不正
        },
      }),
    );
    const data = loadCollection();
    expect(Object.keys(data.entries)).toEqual(["1"]);
    expect(data.totalDraws).toBe(4);
  });

  it("数値フィールドが有限数でない（1e999 → Infinity）エントリは捨てる", () => {
    // JSON に NaN は書けないが 1e999 は Infinity にパースされるため到達しうる
    const entryJson = JSON.stringify({ ...validEntry, annictId: 6 }).replace(
      '"watchersCount":100',
      '"watchersCount":1e999',
    );
    storage.set(
      COLLECTION_STORAGE_KEY,
      `{"version":1,"totalDraws":2,"entries":{"1":${JSON.stringify(validEntry)},"6":${entryJson}}}`,
    );
    expect(Object.keys(loadCollection().entries)).toEqual(["1"]);
  });

  it("seasonName / media が不正なエントリは捨てる", () => {
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        totalDraws: 3,
        entries: {
          "1": validEntry,
          "7": { ...validEntry, annictId: 7, seasonName: "SPRINGX" },
          "8": { ...validEntry, annictId: 8, media: { evil: true } },
        },
      }),
    );
    expect(Object.keys(loadCollection().entries)).toEqual(["1"]);
  });

  it("http(s) 以外の imageUrl は null に無害化する（エントリ自体は温存）", () => {
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        totalDraws: 2,
        entries: {
          "9": { ...validEntry, annictId: 9, imageUrl: "javascript:alert(1)" },
          "10": {
            ...validEntry,
            annictId: 10,
            imageUrl: "https://example.com/ok.jpg",
          },
        },
      }),
    );
    const data = loadCollection();
    expect(data.entries["9"].imageUrl).toBeNull();
    expect(data.entries["9"].annictId).toBe(9);
    expect(data.entries["10"].imageUrl).toBe("https://example.com/ok.jpg");
  });

  it("totalDraws が不正（負数・非数値）なら 0 にフォールバックする", () => {
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({ version: 1, totalDraws: -5, entries: {} }),
    );
    expect(loadCollection().totalDraws).toBe(0);
    storage.set(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({ version: 1, totalDraws: "many", entries: {} }),
    );
    expect(loadCollection().totalDraws).toBe(0);
  });
});
