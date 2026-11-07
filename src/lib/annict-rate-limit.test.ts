import { describe, it, expect, vi } from "vitest";
import { ClientError } from "graphql-request";
import {
  AnnictRateLimitError,
  isRateLimitedError,
  parseRetryAfterSeconds,
  withRateLimitRetry,
} from "./annict-rate-limit";

function rateLimited(retryAfter?: string): ClientError {
  const headers = new Headers();
  if (retryAfter != null) headers.set("Retry-After", retryAfter);
  return new ClientError(
    {
      status: 429,
      headers,
      body: '{"errors":[{"type":"rate_limit_exceeded"}]}',
      data: undefined,
      errors: undefined,
    },
    { query: "query { viewer { id } }" },
  );
}

describe("parseRetryAfterSeconds", () => {
  it("秒数表記は整数秒として返す", () => {
    expect(parseRetryAfterSeconds("37")).toBe(37);
    expect(parseRetryAfterSeconds(" 5 ")).toBe(5);
    expect(parseRetryAfterSeconds("0")).toBe(0);
  });

  it("HTTP-date 表記は現在時刻からの残り秒数（切り上げ）にする", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(
      parseRetryAfterSeconds("Sat, 07 Nov 2026 12:00:30 GMT", now),
    ).toBe(30);
    expect(parseRetryAfterSeconds("Sat, 07 Nov 2026 12:00:00 GMT", now)).toBe(
      0,
    );
  });

  it("過去の HTTP-date は 0 に丸める", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(
      parseRetryAfterSeconds("Sat, 07 Nov 2026 11:59:00 GMT", now),
    ).toBe(0);
  });

  it("未指定・不正な値は null", () => {
    expect(parseRetryAfterSeconds(null)).toBeNull();
    expect(parseRetryAfterSeconds("")).toBeNull();
    expect(parseRetryAfterSeconds("soon")).toBeNull();
    expect(parseRetryAfterSeconds("-3")).toBeNull();
    expect(parseRetryAfterSeconds("1.5")).toBeNull();
  });
});

describe("isRateLimitedError", () => {
  it("graphql-request の ClientError で status 429 のときだけ true", () => {
    expect(isRateLimitedError(rateLimited("1"))).toBe(true);
    const other = new ClientError(
      { status: 502, headers: new Headers(), body: "", data: undefined },
      { query: "" },
    );
    expect(isRateLimitedError(other)).toBe(false);
    expect(isRateLimitedError(new Error("boom"))).toBe(false);
    expect(isRateLimitedError(null)).toBe(false);
  });
});

describe("withRateLimitRetry", () => {
  it("成功時はそのまま結果を返し、待機しない", async () => {
    const sleep = vi.fn(async () => {});
    const result = await withRateLimitRetry(async () => "ok", {
      maxWaitMs: 10_000,
      sleep,
    });
    expect(result).toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("429 で Retry-After が上限内なら待ってから 1 回だけ再試行する", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(rateLimited("3"))
      .mockResolvedValueOnce("ok");
    const result = await withRateLimitRetry(fn, { maxWaitMs: 10_000, sleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3_000);
  });

  it("再試行も 429 なら AnnictRateLimitError を投げる（無限に待たない）", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(rateLimited("1"))
      .mockRejectedValueOnce(rateLimited("45"));
    await expect(
      withRateLimitRetry(fn, { maxWaitMs: 10_000, sleep }),
    ).rejects.toMatchObject({
      name: "AnnictRateLimitError",
      retryAfterSeconds: 45,
    });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("Retry-After が上限を超えるときは待たずに AnnictRateLimitError を投げる", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(rateLimited("30"));
    await expect(
      withRateLimitRetry(fn, { maxWaitMs: 10_000, sleep }),
    ).rejects.toBeInstanceOf(AnnictRateLimitError);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("Retry-After が無い 429 は待たずに AnnictRateLimitError（retryAfterSeconds は null）", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(rateLimited());
    await expect(
      withRateLimitRetry(fn, { maxWaitMs: 10_000, sleep }),
    ).rejects.toMatchObject({ retryAfterSeconds: null });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("Retry-After: 0 はすぐに再試行する", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(rateLimited("0"))
      .mockResolvedValueOnce("ok");
    await expect(
      withRateLimitRetry(fn, { maxWaitMs: 10_000, sleep }),
    ).resolves.toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("429 以外のエラーは加工せずそのまま投げる", async () => {
    const boom = new Error("boom");
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(boom);
    await expect(
      withRateLimitRetry(fn, { maxWaitMs: 10_000, sleep: async () => {} }),
    ).rejects.toBe(boom);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
