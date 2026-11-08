// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  ANIM_DISABLED_KEY,
  DEFAULT_POPULAR_THRESHOLD,
  POPULAR_THRESHOLD_KEY,
  LEGACY_MODE_STORAGE_KEY,
  readSettings,
} from "./settings";

describe("readSettings: 旧「簡易モード」からの引き継ぎ", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("簡易モードを選んでいた場合は演出 OFF として引き継ぎ、旧キーを消す", () => {
    localStorage.setItem(LEGACY_MODE_STORAGE_KEY, "simple");
    expect(readSettings().animDisabled).toBe(true);
    expect(localStorage.getItem(ANIM_DISABLED_KEY)).toBe("1");
    expect(localStorage.getItem(LEGACY_MODE_STORAGE_KEY)).toBeNull();
  });

  it("演出設定が既にある場合は簡易モードの値で上書きしない", () => {
    localStorage.setItem(LEGACY_MODE_STORAGE_KEY, "simple");
    localStorage.setItem(ANIM_DISABLED_KEY, "0");
    expect(readSettings().animDisabled).toBe(false);
    expect(localStorage.getItem(LEGACY_MODE_STORAGE_KEY)).toBeNull();
  });

  it("ガチャモードを選んでいた場合は演出 ON のまま旧キーだけ消す", () => {
    localStorage.setItem(LEGACY_MODE_STORAGE_KEY, "gacha");
    expect(readSettings().animDisabled).toBe(false);
    expect(localStorage.getItem(ANIM_DISABLED_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_MODE_STORAGE_KEY)).toBeNull();
  });

  it("旧キーがなければ何もしない", () => {
    expect(readSettings().animDisabled).toBe(false);
    expect(localStorage.getItem(ANIM_DISABLED_KEY)).toBeNull();
  });
});

describe("readSettings: 「人気のみ」の閾値", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存値が 0 なら既定値に戻す（初期のバグで 0 が保存された環境の救済）", () => {
    localStorage.setItem(POPULAR_THRESHOLD_KEY, "0");
    expect(readSettings().popularThreshold).toBe(DEFAULT_POPULAR_THRESHOLD);
  });

  it("1 以上の整数はそのまま使う", () => {
    localStorage.setItem(POPULAR_THRESHOLD_KEY, "1");
    expect(readSettings().popularThreshold).toBe(1);
    localStorage.setItem(POPULAR_THRESHOLD_KEY, "2500");
    expect(readSettings().popularThreshold).toBe(2500);
  });

  it("不正な値（負数・小数・文字列）は既定値", () => {
    for (const v of ["-1", "1.5", "abc", ""]) {
      localStorage.setItem(POPULAR_THRESHOLD_KEY, v);
      expect(readSettings().popularThreshold).toBe(DEFAULT_POPULAR_THRESHOLD);
    }
  });
});
