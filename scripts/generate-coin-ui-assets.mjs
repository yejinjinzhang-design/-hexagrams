/**
 * 从 raw 铜钱图生成 UI 素材：coin_front.png / coin_back.png
 * 要求：1024x1024、透明底、外圈直径一致、严格居中、去白/黑边、铜色统一、适度锐化
 * 输入：public/coins/coin_front_raw.png、coin_back_raw.png（若不存在则用当前 coin_front.png/coin_back.png）
 * 输出：覆盖 public/coins/coin_front.png、coin_back.png
 * 运行: node scripts/generate-coin-ui-assets.mjs
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const coinsDir = join(root, "public", "coins");

const CANVAS_SIZE = 1024;
const TARGET_DIAMETER_PCT = 0.88;
const TARGET_DIAMETER = Math.round(CANVAS_SIZE * TARGET_DIAMETER_PCT);
const ALPHA_THRESHOLD = 20;

/** 去背景：白底或近白 → 透明；黑/深色 → 透明；羽化边缘 */
function removeBackground(data, width, height, channels) {
  const WHITE_HI = 252;
  const WHITE_LO = 248;
  const BLACK_HI = 55;
  const FEATHER = 18;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (gray >= WHITE_LO) {
      const t = gray >= WHITE_HI ? 0 : (WHITE_HI - gray) / (WHITE_HI - WHITE_LO);
      data[i + 3] = Math.round(255 * (1 - t));
    } else if (gray <= BLACK_HI) {
      const t = gray <= BLACK_HI - FEATHER ? 0 : (gray - (BLACK_HI - FEATHER)) / FEATHER;
      data[i + 3] = Math.round(255 * t);
    }
  }
}

function getContentBounds(data, width, height, channels) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const diameter = Math.max(w, h);
  return { minX, minY, w, h, diameter };
}

/** 古铜色统一、适度锐化、不改变文字 */
function copperToneAndQuality(img) {
  return img
    .linear(1.04, -(0.04 * 128))
    .modulate({ brightness: 1.02, saturation: 0.98 })
    .sharpen({ sigma: 0.6, m1: 1, m2: 0.5 });
}

async function processOne(inputPath, targetDiameter, pipeline) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  removeBackground(data, width, height, channels);
  const buf = Buffer.from(data);
  const bounds = getContentBounds(buf, width, height, channels);
  if (bounds.w <= 0 || bounds.h <= 0) throw new Error(`No content: ${inputPath}`);

  const scale = targetDiameter / bounds.diameter;
  const scaledW = Math.round(bounds.w * scale);
  const scaledH = Math.round(bounds.h * scale);
  const left = Math.round((CANVAS_SIZE - scaledW) / 2);
  const top = Math.round((CANVAS_SIZE - scaledH) / 2);

  const cropped = await sharp(buf, {
    raw: { width, height, channels: 4 },
  })
    .extract({ left: bounds.minX, top: bounds.minY, width: bounds.w, height: bounds.h })
    .resize(scaledW, scaledH, { fit: "fill" })
    .png()
    .toBuffer();

  const base = sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: cropped, left, top }]);

  return pipeline(base).png().toBuffer();
}

async function main() {
  const frontRaw = join(coinsDir, "coin_front_raw.png");
  const backRaw = join(coinsDir, "coin_back_raw.png");
  const frontOut = join(coinsDir, "coin_front.png");
  const backOut = join(coinsDir, "coin_back.png");

  const frontIn = existsSync(frontRaw) ? frontRaw : join(coinsDir, "coin_front.png");
  const backIn = existsSync(backRaw) ? backRaw : join(coinsDir, "coin_back.png");

  if (!existsSync(frontIn)) {
    console.error("缺少正面图，请将 coin_front_raw.png 或 coin_front.png 放入 public/coins/");
    process.exit(1);
  }
  if (!existsSync(backIn)) {
    console.error("缺少背面图，请将 coin_back_raw.png 或 coin_back.png 放入 public/coins/");
    process.exit(1);
  }

  const pipeline = (img) => copperToneAndQuality(img);

  console.log("Processing front...");
  const frontPng = await processOne(frontIn, TARGET_DIAMETER, pipeline);
  await sharp(frontPng).toFile(frontOut);
  console.log("Written:", frontOut);

  console.log("Processing back...");
  const backPng = await processOne(backIn, TARGET_DIAMETER, pipeline);
  await sharp(backPng).toFile(backOut);
  console.log("Written:", backOut);

  console.log("Done. 1024x1024, 透明, 外圈直径一致(", TARGET_DIAMETER, "px), 居中.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
