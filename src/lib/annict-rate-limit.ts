import { ClientError } from "graphql-request";

/**
 * Annict API のレート制限（HTTP 429）への対処。
 *
 * Annict は 2026-10-25 からアクセストークン + 接続元 IP の組ごとに 1 分あたり 600 リクエストの
 * 上限を設け、超過時は 429 と `Retry-After`（再試行までの秒数）を返す。
 * 本アプリの通常利用で上限に達することはまずないが、キャッシュミスが重なった場合などに
 * 「待てば済む」エラーをそのまま 502 として扱わないよう、短時間なら待って 1 回だけ再試行し、
 * それでも駄目なときは専用エラーで呼び出し側に 429 と待ち時間を伝える。
 */

/** Annict のレート制限に掛かり、再試行しても解消しなかったときのエラー */
export class AnnictRateLimitError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds == null
        ? "Annict API rate limit exceeded"
        : `Annict API rate limit exceeded (retry after ${retryAfterSeconds}s)`,
    );
    this.name = "AnnictRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isRateLimitedError(error: unknown): error is ClientError {
  return error instanceof ClientError && error.response.status === 429;
}

/**
 * `Retry-After` ヘッダを秒数に正規化する。
 * 整数秒と HTTP-date の両形式を受け付け、それ以外は null。
 */
export function parseRetryAfterSeconds(
  value: string | null,
  now: number = Date.now(),
): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  // "-3" や "1.5" は Date.parse が年として解釈してしまうため、数値らしき文字列は秒数として不正扱いにする
  if (/^[+-]?[\d.]+$/.test(trimmed)) return null;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

export type RateLimitRetryOptions = {
  /** この時間（ミリ秒）以内に再試行できる場合だけ待つ。超えるときは即座にエラーにする */
  maxWaitMs: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * `fn` を実行し、429 なら `Retry-After` の分だけ待って 1 回だけ再試行する。
 * 待ち時間が `maxWaitMs` を超える、`Retry-After` が無い、再試行も 429 の場合は
 * AnnictRateLimitError を投げる。429 以外のエラーはそのまま伝播する。
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  { maxWaitMs, sleep = defaultSleep }: RateLimitRetryOptions,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isRateLimitedError(error)) throw error;
    const retryAfter = parseRetryAfterSeconds(
      error.response.headers.get("retry-after"),
    );
    if (retryAfter == null || retryAfter * 1000 > maxWaitMs) {
      throw new AnnictRateLimitError(retryAfter);
    }
    if (retryAfter > 0) await sleep(retryAfter * 1000);
  }

  try {
    return await fn();
  } catch (error) {
    if (!isRateLimitedError(error)) throw error;
    throw new AnnictRateLimitError(
      parseRetryAfterSeconds(error.response.headers.get("retry-after")),
    );
  }
}
