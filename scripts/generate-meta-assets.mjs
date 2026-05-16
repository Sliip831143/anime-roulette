// OGP画像 / apple-icon / PWA icon を public/logo.png + src/app/icon.png から生成
// 使い方: node scripts/generate-meta-assets.mjs
import { readFileSync, statSync } from "node:fs";
import sharp from "sharp";

const LOGO_PATH = "public/logo.png";
const ICON_PATH = "src/app/icon.png";
const OGP_OUT = "src/app/opengraph-image.png";
const TWITTER_OUT = "src/app/twitter-image.png";
const APPLE_OUT = "src/app/apple-icon.png";
const ICON_192_OUT = "public/icon-192.png";
const ICON_512_OUT = "public/icon-512.png";

const SITE_TITLE = "アニメルーレット";
const SITE_TAGLINE = "Annictで観るアニメを抽選するルーレット";

const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;

/* ============== OGP / Twitter image (1200x630) ============== */

async function buildOgpImage(outPath) {
  const W = 1200;
  const H = 630;

  // 背景 (薄ブルーグラデ + 装飾の三角)
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eaf2fb"/>
          <stop offset="100%" stop-color="#c9deef"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <!-- 装飾の三角形 (右下) -->
      <polygon points="${W},${H - 220} ${W},${H} ${W - 220},${H}" fill="#9dc1e0" opacity="0.35"/>
      <polygon points="0,${H - 140} 0,${H} 140,${H}" fill="#9dc1e0" opacity="0.25"/>
      <!-- 中央右下にサブタイトル -->
      <text x="${W / 2}" y="${H - 90}" font-family="Hiragino Sans, Yu Gothic, Meiryo, sans-serif" font-size="34" fill="#36527a" text-anchor="middle" font-weight="600">${SITE_TAGLINE}</text>
      <text x="${W / 2}" y="${H - 50}" font-family="ui-monospace, Menlo, monospace" font-size="16" fill="#5a7290" text-anchor="middle" letter-spacing="6">M I L L E N N I U M</text>
    </svg>
  `;

  // ロゴ画像 (738x192) を 横600px 程度にリサイズして中央上寄りに配置
  const logoBuf = readFileSync(LOGO_PATH);
  const logoResized = await sharp(logoBuf).resize({ width: 680 }).toBuffer();
  const logoMeta = await sharp(logoResized).metadata();

  const logoX = Math.round((W - logoMeta.width) / 2);
  const logoY = Math.round((H - logoMeta.height) / 2 - 50); // 中央より少し上

  await sharp(Buffer.from(bgSvg))
    .composite([{ input: logoResized, top: logoY, left: logoX }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/* ============== Apple touch icon (180x180) ============== */

async function buildAppleIcon(outPath) {
  // icon.png (872x872) を 180x180 にリサイズ
  await sharp(ICON_PATH)
    .resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/* ============== PWA icons (192x192, 512x512) ============== */

async function buildPwaIcon(size, outPath) {
  await sharp(ICON_PATH)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/* ============== main ============== */

await buildOgpImage(OGP_OUT);
console.log(`✓ ${OGP_OUT}  (${fmt(statSync(OGP_OUT).size)})`);

await buildOgpImage(TWITTER_OUT);
console.log(`✓ ${TWITTER_OUT}  (${fmt(statSync(TWITTER_OUT).size)})`);

await buildAppleIcon(APPLE_OUT);
console.log(`✓ ${APPLE_OUT}  (${fmt(statSync(APPLE_OUT).size)})`);

await buildPwaIcon(192, ICON_192_OUT);
console.log(`✓ ${ICON_192_OUT}  (${fmt(statSync(ICON_192_OUT).size)})`);

await buildPwaIcon(512, ICON_512_OUT);
console.log(`✓ ${ICON_512_OUT}  (${fmt(statSync(ICON_512_OUT).size)})`);

console.log("\nDone.");
