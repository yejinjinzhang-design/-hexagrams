/**
 * 把铜钱照片的黑底抠掉，输出透明 PNG，正反面一致处理
 * 运行: node scripts/remove-coin-background.mjs
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const coinsDir = join(root, "public", "coins");

/** 低于此灰度视为背景，设为透明（提高以去掉背面黑边） */
const BACKGROUND_THRESHOLD = 68;
/** 边缘羽化：接近阈值的像素按比例降低 alpha，过渡更自然 */
const FEATHER = 16;

async function removeBackground(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (gray <= BACKGROUND_THRESHOLD - FEATHER) {
      data[i + 3] = 0;
    } else if (gray <= BACKGROUND_THRESHOLD) {
      const t = (gray - (BACKGROUND_THRESHOLD - FEATHER)) / FEATHER;
      data[i + 3] = Math.round(255 * t);
    }
    // else keep original alpha
  }

  await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toFile(outputPath);
  console.log("Written:", outputPath);
}

async function main() {
  const frontIn = join(coinsDir, "coin_front.png");
  const backIn = join(coinsDir, "coin_back.png");
  const frontOut = join(coinsDir, "coin_front_cut.png");
  const backOut = join(coinsDir, "coin_back_cut.png");

  await removeBackground(frontIn, frontOut);
  await removeBackground(backIn, backOut);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
