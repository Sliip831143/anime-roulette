// public/gacha/*.png を AVIF + WebP に変換する一括スクリプト
// 使い方: node scripts/convert-images.mjs
import { readdirSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const TARGET_DIR = "public/gacha";

const AVIF_OPTS = { quality: 60, effort: 6 };
const WEBP_OPTS = { quality: 82, effort: 6 };

const files = readdirSync(TARGET_DIR).filter((f) => f.endsWith(".png"));

if (files.length === 0) {
  console.log(`No .png files found in ${TARGET_DIR}`);
  process.exit(0);
}

console.log(`Converting ${files.length} files in ${TARGET_DIR}/\n`);

const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const file of files) {
  const inputPath = join(TARGET_DIR, file);
  const { name } = parse(file);
  const avifPath = join(TARGET_DIR, `${name}.avif`);
  const webpPath = join(TARGET_DIR, `${name}.webp`);

  const pngSize = statSync(inputPath).size;

  await sharp(inputPath).avif(AVIF_OPTS).toFile(avifPath);
  await sharp(inputPath).webp(WEBP_OPTS).toFile(webpPath);

  const avifSize = statSync(avifPath).size;
  const webpSize = statSync(webpPath).size;

  const avifRatio = ((avifSize / pngSize) * 100).toFixed(1);
  const webpRatio = ((webpSize / pngSize) * 100).toFixed(1);

  console.log(`${file}`);
  console.log(`  PNG : ${fmt(pngSize).padStart(10)}  (100%)`);
  console.log(`  AVIF: ${fmt(avifSize).padStart(10)}  (${avifRatio}%)`);
  console.log(`  WebP: ${fmt(webpSize).padStart(10)}  (${webpRatio}%)`);
  console.log();
}

console.log("Done.");
