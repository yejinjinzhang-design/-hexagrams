# 铜钱视觉高度不一致 - 排查报告

## 1. 外层容器检查

| 项目 | 状态 | 说明 |
|------|------|------|
| width | ✅ 相同 | `coinCircleStyle` 与 wrapper 均为 `sizePx` (108) |
| height | ✅ 相同 | 同上 |
| border-radius | ✅ 50% | `coinCircleStyle.borderRadius: "50%"` |
| overflow | ✅ hidden | `coinCircleStyle.overflow: "hidden"` |

三枚 Coin 使用同一 `coinCircleStyle`，容器尺寸一致。

## 2. 图片样式检查

| 项目 | 当前 | 问题 |
|------|------|------|
| object-fit | ✅ cover | 一致 |
| object-position | ✅ center (object-center) | 一致 |
| width/height | fill → 100% | 一致 |
| transform scale | ❌ **未使用** | 正反面未统一 scale，导致裁剪区域不一致 |
| margin / translateY | ✅ 无 | - |

**结论**：未使用统一 `transform: scale()` 放大裁剪，正面与背面因图片内边距不同，在 object-cover 下呈现的“铜钱圆”大小不一致。

## 3. 图片本身尺寸（抠图后资源）

```
coin_front_cut.png  naturalWidth: 572  naturalHeight: 637  aspect: 0.898
coin_back_cut.png   naturalWidth: 541  naturalHeight: 695  aspect: 0.778
```

**结论**：两张图比例不同（0.898 vs 0.778），且抠图后内部“有效铜钱”与四边的留白比例也不同。仅靠 square container + object-cover 会得到不同裁剪结果，需用**统一 scale** 放大后居中裁剪，使可见圆区一致。

## 4. transform scale

- 当前：无 scale，正反面裁剪区域不统一。
- 处理：为所有 coin 图片统一使用同一 `scale(1.35)`（或从 config 读取），保证裁剪区域一致。

## 5. flex 排版

| 项目 | 状态 |
|------|------|
| display: flex | ✅ `flex flex-row` |
| align-items: center | ✅ `items-center` |
| justify-content: center | ✅ `justify-center` |
| gap | ✅ `gap-8` (32px)，可改为 16px 若需更紧凑 |

## 6. 根因与方案

- **根因**：正面/背面图片比例与内部留白不同，且未使用统一 scale，导致 object-cover 后“铜钱圆”视觉大小不一致（例如中间一枚裁得更紧、显得更大）。
- **方案**：不改布局，用 **object-cover + center + 统一 scale** 统一裁剪区域；所有 coin 图片共用同一 class 或同一 style（含 scale），避免后续再出现不一致。

---

## 已实施的修改

- **config.ts**：新增 `coinImageScale: 1.35`，所有铜钱图片使用同一缩放。
- **Coin.tsx**：新增共用 `coinImageStyle`（objectFit、objectPosition、transform scale、transformOrigin: center），正面与背面 Image 均使用该 style，保证三枚铜钱视觉高度一致。若需微调裁剪松紧，只需改 `config.coinImageScale`。
