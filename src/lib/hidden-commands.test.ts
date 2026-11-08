import { describe, expect, it } from "vitest";
import { HIDDEN_COMMANDS, buildConsoleBanner } from "./hidden-commands";

describe("buildConsoleBanner", () => {
  it("%c の数とスタイル引数の数が一致する", () => {
    const [message, ...styles] = buildConsoleBanner();
    const placeholders = message.match(/%c/g)?.length ?? 0;
    expect(placeholders).toBe(styles.length);
  });

  it("全コマンドの短い書式と説明が案内に含まれる", () => {
    const [message] = buildConsoleBanner();
    for (const c of HIDDEN_COMMANDS) {
      expect(message).toContain(c.banner.usage);
      expect(message).toContain(c.banner.desc);
    }
  });

  it("書式は /help の書式の先頭部分と一致する（別コマンドの案内にならない）", () => {
    for (const c of HIDDEN_COMMANDS) {
      // 'cmd("/season")' → '/season' を /help 側の usage から探す
      const name = c.banner.usage.replace(/^cmd\("/, "").replace(/"\)$/, "");
      expect(c.usage).toContain(name.split(" ")[0]);
    }
  });
});
