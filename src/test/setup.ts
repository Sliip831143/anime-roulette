/**
 * Vitest の共通セットアップ。
 *
 * jsdom にはレイアウト系の API が無いため、画面コンポーネントを描画するテストで
 * 落ちないよう何もしないスタブを入れる（`// @vitest-environment jsdom` のファイルだけが対象。
 * node 環境のテストでは window が無いので何もしない）。
 */

if (typeof window !== "undefined") {
  const noop = () => {};

  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: noop,
        removeEventListener: noop,
        addListener: noop,
        removeListener: noop,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }

  window.scrollTo = noop as typeof window.scrollTo;
  Element.prototype.scrollIntoView = noop;

  class ObserverStub {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
    takeRecords = () => [];
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver =
      ObserverStub as unknown as typeof IntersectionObserver;
  }
}
