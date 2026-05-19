// OGP画像 / favicon / apple-icon / PWA icon を public/logo.png から生成
// 使い方: node scripts/generate-meta-assets.mjs
import { readFileSync, statSync } from "node:fs";
import sharp from "sharp";

const LOGO_PATH = "public/logo.png";
const OGP_OUT = "src/app/opengraph-image.png";
const TWITTER_OUT = "src/app/twitter-image.png";
const ICON_OUT = "src/app/icon.png";
const APPLE_OUT = "src/app/apple-icon.png";
const ICON_192_OUT = "public/icon-192.png";
const ICON_512_OUT = "public/icon-512.png";

const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;

/* ============== OGP / Twitter image (1200x630) ============== */

async function buildOgpImage(outPath) {
  const W = 1200;
  const H = 630;

  // ロゴ画像 (738x192) を 横680px にリサイズ
  const logoBuf = readFileSync(LOGO_PATH);
  const logoResized = await sharp(logoBuf).resize({ width: 680 }).toBuffer();
  const logoMeta = await sharp(logoResized).metadata();

  // ロゴ + サブタイトル「Anime Roulette」(モノスペース・字間広め) をひとまとめに上下中央配置
  const SUBTITLE = "Anime Roulette";
  const SUBTITLE_FONT_SIZE = 28;
  const GAP = 36;
  const totalHeight = logoMeta.height + GAP + SUBTITLE_FONT_SIZE;
  const logoY = Math.round((H - totalHeight) / 2);
  const logoX = Math.round((W - logoMeta.width) / 2);
  const subtitleY = logoY + logoMeta.height + GAP + SUBTITLE_FONT_SIZE;

  // 背景 (薄ブルーグラデ + 装飾の三角) + サブタイトル
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eaf2fb"/>
          <stop offset="100%" stop-color="#c9deef"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <!-- 装飾の三角形 (右下・左下) -->
      <polygon points="${W},${H - 220} ${W},${H} ${W - 220},${H}" fill="#9dc1e0" opacity="0.35"/>
      <polygon points="0,${H - 140} 0,${H} 140,${H}" fill="#9dc1e0" opacity="0.25"/>
      <!-- ロゴ下のサブタイトル：モノスペースで字間広め -->
      <text x="${W / 2}" y="${subtitleY}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${SUBTITLE_FONT_SIZE}" fill="#5a7290" text-anchor="middle" letter-spacing="10" font-weight="500">${SUBTITLE}</text>
    </svg>
  `;

  await sharp(Buffer.from(bgSvg))
    .composite([{ input: logoResized, top: logoY, left: logoX }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/* ============== Square icon (favicon / apple-touch / PWA) ============== */
// OG画像と同じ「青系グラデ背景 + ロゴ」を正方形で書き出す。
// 共有時のサムネとブックマーク/ホーム画面アイコンの意匠を統一する目的。
// 短辺が小さいサイズではサブタイトルが潰れるため、ロゴのみを中央に配置する。

async function buildSquareIcon(size, outPath) {
  const W = size;
  const H = size;

  // ロゴを短辺の82%幅にリサイズして中央配置（iOS角丸・Androidマスクで端が切れても安全）
  const logoBuf = readFileSync(LOGO_PATH);
  const logoTargetWidth = Math.round(W * 0.82);
  const logoResized = await sharp(logoBuf).resize({ width: logoTargetWidth }).toBuffer();
  const logoMeta = await sharp(logoResized).metadata();
  const logoX = Math.round((W - logoMeta.width) / 2);
  const logoY = Math.round((H - logoMeta.height) / 2);

  // 背景：OGPと同色の青系グラデ
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eaf2fb"/>
          <stop offset="100%" stop-color="#c9deef"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
    </svg>
  `;

  await sharp(Buffer.from(bgSvg))
    .composite([{ input: logoResized, top: logoY, left: logoX }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/* ============== main ============== */

await buildOgpImage(OGP_OUT);
console.log(`✓ ${OGP_OUT}  (${fmt(statSync(OGP_OUT).size)})`);

await buildOgpImage(TWITTER_OUT);
console.log(`✓ ${TWITTER_OUT}  (${fmt(statSync(TWITTER_OUT).size)})`);

await buildSquareIcon(512, ICON_OUT);
console.log(`✓ ${ICON_OUT}  (${fmt(statSync(ICON_OUT).size)})`);

await buildSquareIcon(180, APPLE_OUT);
console.log(`✓ ${APPLE_OUT}  (${fmt(statSync(APPLE_OUT).size)})`);

await buildSquareIcon(192, ICON_192_OUT);
console.log(`✓ ${ICON_192_OUT}  (${fmt(statSync(ICON_192_OUT).size)})`);

await buildSquareIcon(512, ICON_512_OUT);
console.log(`✓ ${ICON_512_OUT}  (${fmt(statSync(ICON_512_OUT).size)})`);

console.log("\nDone.");
