/**
 * 铜钱素材标准化：先处理素材，再上页面
 * 输出 coin_front_clean.png / coin_back_clean.png
 * - 透明背景、正方形画布、外圈直径一致、主体完全居中、金属色调统一
 * 运行: node scripts/standardize-coin-assets.mjs
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const coinsDir = join(root, "public", "coins");

const CANVAS_SIZE = 800;
const TARGET_DIAMETER_PCT = 0.88; // 铜钱直径占画布比例，留一点边
const ALPHA_THRESHOLD = 24; // 低于此 alpha 视为透明
const BG_GRAY_THRESHOLD = 58;
const BG_FEATHER = 14;

/** 去除黑底 */
async function removeBackground(data, width, height, channels) {
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

/** 计算非透明区域的 bbox 与直径（max(w,h)） */
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
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { minX, minY, w, h, diameter, centerX, centerY };
}

/** 统一金属色调：轻微提亮、对比 */
function normalizeTone(img) {
  return img.linear(1.06, -(0.06 * 128)).modulate({ brightness: 1.02 });
}

/** 单张图：去底 → 取 bbox → 缩放到统一直径并居中到正方画布 */
async function processOne(inputPath, targetDiameter, tonePipeline) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  removeBackground(data, width, height, channels);

  const buf = Buffer.from(data);
  const bounds = getContentBounds(buf, width, height, channels);
  if (bounds.w <= 0 || bounds.h <= 0) {
    throw new Error(`No content in ${inputPath}`);
  }

  const scale = targetDiameter / bounds.diameter;
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

  const base = sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: cropped, left, top }]);

  const withTone = tonePipeline(base);
  return withTone.png().toBuffer();
}

async function main() {
  const frontIn = join(coinsDir, "coin_front.png");
  const backIn = join(coinsDir, "coin_back.png");

  const targetDiameter = Math.round(CANVAS_SIZE * TARGET_DIAMETER_PCT);

  const tonePipeline = (img) => normalizeTone(img);

  console.log("Processing front...");
  const frontPng = await processOne(frontIn, targetDiameter, tonePipeline);
  await sharp(frontPng).toFile(join(coinsDir, "coin_front_clean.png"));
  console.log("Written: coin_front_clean.png");

  console.log("Processing back...");
  const backPng = await processOne(backIn, targetDiameter, tonePipeline);
  await sharp(backPng).toFile(join(coinsDir, "coin_back_clean.png"));
  console.log("Written: coin_back_clean.png");

  console.log("Done. 两张图已统一：正方画布、外圈直径一致、居中、透明底、色调统一。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
