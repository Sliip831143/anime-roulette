import { describe, it, expect } from "vitest";
import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl", () => {
  it("https URL はそのまま返す", () => {
    expect(safeHttpUrl("https://example.com/works/1")).toBe(
      "https://example.com/works/1",
    );
  });

  it("http URL はそのまま返す", () => {
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it("javascript: スキームは null", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("data: スキームは null", () => {
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("大文字混じりの JavaScript: スキームも null", () => {
    expect(safeHttpUrl("JavaScript:alert(1)")).toBeNull();
  });

  it("先頭空白付きの javascript: も null", () => {
    expect(safeHttpUrl("  javascript:alert(1)")).toBeNull();
  });

  it("スキームなし相対 URL は null（外部データとしては不正扱い）", () => {
    expect(safeHttpUrl("/works/1")).toBeNull();
    expect(safeHttpUrl("example.com")).toBeNull();
  });

  it("null / undefined / 空文字は null", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });
});
