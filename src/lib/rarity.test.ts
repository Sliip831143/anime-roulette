import { describe, it, expect } from "vitest";
import { getRarity } from "./rarity";

describe("getRarity", () => {
  describe("★3 虹", () => {
    it("watchersCount=25000 ちょうどで r3（境界値）", () => {
      expect(getRarity(25000, null)).toBe("r3");
    });

    it("watchersCount=25001 でも r3", () => {
      expect(getRarity(25001, null)).toBe("r3");
    });

    it("watchersCount=12000 + satisfaction=85 で r3（ハイブリッド条件）", () => {
      expect(getRarity(12000, 85)).toBe("r3");
    });

    it("watchersCount=12000 + satisfaction=84.9 では r3 にならない", () => {
      expect(getRarity(12000, 84.9)).toBe("r2");
    });

    it("watchersCount=11999 + satisfaction=85 では r3 にならない", () => {
      expect(getRarity(11999, 85)).toBe("r2");
    });

    it("satisfactionRate が 0-1 スケールでも正規化される（0.85 → 85%扱い）", () => {
      expect(getRarity(12000, 0.85)).toBe("r3");
    });

    it("satisfactionRate=1.0（0-1スケールの100%）でも r3", () => {
      expect(getRarity(12000, 1.0)).toBe("r3");
    });
  });

  describe("★2 金", () => {
    it("watchersCount=10000 ちょうどで r2（境界値）", () => {
      expect(getRarity(10000, null)).toBe("r2");
    });

    it("watchersCount=10000 + satisfaction=100 でも r2（虹の条件を満たさない）", () => {
      expect(getRarity(10000, 100)).toBe("r2");
    });

    it("watchersCount=24999 + satisfaction=null では r2", () => {
      expect(getRarity(24999, null)).toBe("r2");
    });
  });

  describe("★1 青", () => {
    it("watchersCount=9999 で r1（境界値）", () => {
      expect(getRarity(9999, null)).toBe("r1");
    });

    it("watchersCount=0 で r1", () => {
      expect(getRarity(0, null)).toBe("r1");
    });

    it("満足度高くても watchersCount 不足なら r1", () => {
      expect(getRarity(100, 100)).toBe("r1");
    });
  });

  describe("satisfactionRate null 対応", () => {
    it("null でも watchersCount=30000 なら r3", () => {
      expect(getRarity(30000, null)).toBe("r3");
    });

    it("null でも watchersCount=15000 なら r2", () => {
      expect(getRarity(15000, null)).toBe("r2");
    });

    it("null で watchersCount=5000 なら r1", () => {
      expect(getRarity(5000, null)).toBe("r1");
    });
  });
});
