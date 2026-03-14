/**
 * 仅重新生成反面标准化素材：coin_back_clean.png
 * 要求：与 coin_front 相同外圈直径、中心孔居中、外圈厚度一致、略旧铜色不发白、透明、1024px
 * 运行: node scripts/standardize-coin-back-only.mjs
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const coinsDir = join(root, "public", "coins");

const CANVAS_SIZE = 1024;
const TARGET_DIAMETER_PCT = 0.88; // 与正面一致：铜钱直径占画布比例
const TARGET_DIAMETER = Math.round(CANVAS_SIZE * TARGET_DIAMETER_PCT);
const ALPHA_THRESHOLD = 28;
const BG_GRAY_THRESHOLD = 58;
const BG_FEATHER = 14;

/** 去除黑底 */
function removeBackground(data, width, height, channels) {
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (gray <= BG_GRAY_THRESHOLD - BG_FEATHER) {
      data[i + 3] = 0;
    } else if (gray <= BG_GRAY_THRESHOLD) {
      const t = (gray - (BG_GRAY_THRESHOLD - BG_FEATHER)) / BG_FEATHER;
      data[i + 3] = Math.round((a / 255) * 255 * t);
    }
  }
}

/** 非透明区域 bbox，直径 = max(w,h)，中心用于居中 */
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

/** 反面金属色调：略旧铜色，压白、轻微暖棕，与正面质感统一 */
function copperTone(img) {
  return img
    .linear(1.05, -(0.05 * 128))
    .modulate({ brightness: 0.94, saturation: 1.05 })
    .recomb([
      [1.08, 0.08, 0.02],
      [0.06, 0.94, 0.04],
      [0.02, 0.06, 0.88],
    ]);
}

async function main() {
  const backIn = join(coinsDir, "coin_back.png");
  const backOut = join(coinsDir, "coin_back_clean.png");

  const { data, info } = await sharp(backIn)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  removeBackground(data, width, height, channels);
  const buf = Buffer.from(data);
  const bounds = getContentBounds(buf, width, height, channels);
  if (bounds.w <= 0 || bounds.h <= 0) {
    throw new Error("No content in coin_back.png");
  }

  const scale = TARGET_DIAMETER / bounds.diameter;
  const scaledW = Math.round(bounds.w * scale);
  const scaledH = Math.round(bounds.h * scale);
  const left = Math.round(CANVAS_SIZE / 2 - scaledW / 2);
  const top = Math.round(CANVAS_SIZE / 2 - scaledH / 2);

  const cropped = await sharp(buf, {
    raw: { width, height, channels: 4 },
  })
    .extract({
      left: bounds.minX,
      top: bounds.minY,
      width: bounds.w,
      height: bounds.h,
    })
    .resize(scaledW, scaledH, { fit: "fill" })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left, top }])
    .png()
    .toBuffer();

  const withTone = copperTone(sharp(canvas));
  await withTone.png().toFile(backOut);

  console.log("Written:", backOut);
  console.log("1024px, 外圈直径与正面一致(", TARGET_DIAMETER, "px), 居中, 透明底, 铜色统一.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
