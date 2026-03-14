## AI 六爻起卦分析（Next.js 15）

一个基于 **Next.js 15 + TypeScript + Tailwind CSS** 的 Web 项目，用两个骰子模拟六爻起卦，并调用可扩展的 LLM Provider 架构（当前接入 DeepSeek）进行卦象分析。

### 一、功能概览

- **首页**：填写 `出生年份 / 性别 / 想问的问题`
- **起卦页**：
  - 用两个骰子的动画模拟摇卦
  - 点击「开始」骰子滚动，点击「停止」记录一次点数和
  - 共 6 次摇卦，自下而上形成六爻
  - 自动计算：本卦 / 动爻 / 变卦 / 二进制卦码
- **结果页**：
  - 展示用户输入信息
  - 六爻图形、本卦、变卦、动爻、卦码
  - AI 分析结果分区展示：
    - 总体判断 / 问题重点分析 / 事业 / 感情 / 财运 / 时间趋势 / 建议 / 免责声明

### 二、技术栈

- **前端**：Next.js 15（App Router）+ React 18 + TypeScript + Tailwind CSS
- **后端**：Next.js Route Handlers（`app/api/analyze/route.ts`）
- **LLM 调用架构**：
  - `lib/llm/types.ts`：抽象 Provider / 模型引用 / 统一分析接口类型
  - `lib/llm/providers/deepseek.ts`：DeepSeek Provider 实现
  - `lib/llm/router.ts`：后续可以做模型路由与复杂度判断（当前基于问题长度切 `deepseek-chat` / `deepseek-reasoner`）
  - `lib/llm/index.ts`：对外暴露 `analyzeDivination` 统一入口

### 三、安装与运行

```bash
pnpm install   # 或 npm install / yarn

# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

> 如未安装 pnpm，可替换为 `npm` 或 `yarn`。

### 四、环境变量配置（DeepSeek）

1. 在项目根目录创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

2. 编辑 `.env.local`：

```bash
DEEPSEEK_API_KEY=你的_deepseek_api_key
```

> API Key 只会在服务端使用，不会暴露到前端。

### 五、核心目录结构与说明

- `app/page.tsx`：首页表单（出生年份 / 性别 / 问题），校验通过后跳转 `/divination`
- `app/divination/page.tsx`：起卦流程，使用 `components/Dice` 完成 6 次摇卦，并在前端预览六爻结构
- `app/result/page.tsx`：结果页，根据 `sessionId` 从后端拉取完整卦象与 AI 分析结果
- `app/api/analyze/route.ts`：
  - `POST`：接收用户信息与 6 次骰子和，调用六爻逻辑 + LLM 分析，写入存储，返回 `sessionId`
  - `GET`：根据 `sessionId` 返回之前存储的占卦会话

- `components/Dice.tsx`：两个骰子的摇动动画组件（开始/停止）
- `components/HexagramView.tsx`：六爻图形展示组件，本卦/变卦/动爻/卦码
- `components/AnalysisCard.tsx`：结果分区卡片组件
- `components/LoadingState.tsx`：统一 Loading 展示

- `lib/divination.ts`：纯函数实现六爻核心逻辑：
  - 骰子点数和 → 老阴/少阳/少阴/老阳
  - 阴阳、动静、变爻后的阴阳
  - 计算本卦 / 变卦 / 动爻列表 / 二进制编码
- `lib/gua-data.ts`：卦名字典与元数据接口，目前只填了少数卦，后续可直接补全 64 卦
- `lib/prompts.ts`：
  - `baseSystemPrompt`：System Prompt，约束模型只基于结构化卦象数据，不扩展其它排盘；要求风格克制、专业、避免绝对化；强制 JSON 输出，并在 disclaimer 提醒「仅供参考」
  - `buildDivinationUserPrompt`：把用户信息 + 卦象结果打包为 JSON 文本传给模型
  - 预留 `FewShotExample`、`DivinationPromptConfig`，后续可插入 few-shot 样例

- `lib/llm/types.ts`：定义
  - `LLMProviderName` / `LLMModelRef`
  - `AnalyzeDivinationInput` / `AnalyzeDivinationResult`
  - `LLMProvider` 接口（统一 `analyzeDivination` 方法）
- `lib/llm/providers/deepseek.ts`：
  - 从 `process.env.DEEPSEEK_API_KEY` 读取密钥
  - `baseURL = https://api.deepseek.com`
  - 默认模型 `deepseek-chat`，可切换为 `deepseek-reasoner`
  - 使用 `response_format: { type: "json_object" }`
  - 对 JSON 解析做容错：优先 `JSON.parse`，失败则从返回内容中截取第一段 `{...}` 再尝试解析
  - 如果仍失败，则返回一个「温和说明型」的 fallback 结构化结果
- `lib/llm/router.ts`：
  - 对外暴露 `routeAnalyzeDivination`
  - 当前路由逻辑：如果问题长度明显更长（>120 字符）则用 `deepseek-reasoner`，否则用 `deepseek-chat`
  - 后续可在此扩展：多 provider、模型路由、分级推理等

- `lib/storage/types.ts` / `lib/storage/mock.ts`：
  - 定义 `StoredDivinationSession`，字段包括：
    - `userInput` / `divination` / `provider` / `model` / `promptVersion`
    - `aiResult`（结构化 JSON）/ `rawText`（原始模型返回）
    - `createdAt`
    - 预留字段：`userRating` / `userFeedback` / `editedAnswer` / `finalSelectedAnswer`
  - `mock` 实现使用内存 `Map` 模拟存储，后续可以替换为数据库（如 Postgres / Prisma / PlanetScale 等），接口保持不变

- `types/divination.ts`：六爻相关类型定义
- `types/analysis.ts`：AI 分析结果 JSON 结构定义

### 六、如何扩展新的 LLM Provider

1. 在 `lib/llm/types.ts` 中：
   - 扩展 `LLMProviderName` 联合类型，例如加入 `"openai"` / `"anthropic"` / `"local"`
2. 新增 Provider 文件，例如：
   - `lib/llm/providers/openai.ts`
   - 实现 `LLMProvider` 接口的 `analyzeDivination` 方法，内部复用相同的 `buildDivinationUserPrompt`
3. 在 `lib/llm/router.ts` 中：
   - 根据问题复杂度、用户配置或路由策略，选择对应的 Provider + Model
4. 在 `app/api/analyze/route.ts` 中无需修改，仍然只调用统一的 `analyzeDivination` 即可。

### 七、如何做 Prompt Tuning / Few-shot / Routing / Distillation

- **Prompt Tuning / Few-shot**：
  - 在 `lib/prompts.ts` 中维护不同版本的 `promptVersion`
  - 使用 `DivinationPromptConfig` 注入 few-shot 样例（`FewShotExample[]`）
  - 在调用 `buildDivinationUserPrompt` 时传入对应配置
- **模型路由（Routing）**：
  - 在 `lib/llm/router.ts` 中：
    - 根据问题长度、问题类型（感情/事业/财务等）或历史表现，切不同 provider + 模型
    - 可以实现多阶段分析：先用小模型做粗分析，再用大模型 refine 关键部分
- **蒸馏 / 微调**：
  - 通过 `lib/storage/mock.ts`（未来可替换数据库）记录：
    - 原始问法 / 卦象结构 / 模型输出 / 用户反馈 / 编辑后的最终答案
  - 这些数据可导出用于：
    - 自建 RAG / 经验库
    - 微调小模型进行风格对齐或知识蒸馏

### 八、UI 风格

- 整体为 **深色系东方科技感**：
  - 暗色背景 + 金色点缀（`ink-dark` / `ink-accent` 等 Tailwind 自定义颜色）
  - 简洁卡片布局，移动端优先，使用 `max-w-3xl` 居中
- 卦象展示：
  - 使用横线（阳爻实线 / 阴爻断线）自下而上展示六爻
  - 动爻用「动」字标注，并区分本卦/变卦

### 九、后续可扩展方向

- 接入真实数据库替代 `lib/storage/mock.ts`
- 在 `lib/gua-data.ts` 中补全 64 卦的卦名与简要说明
- 提供历史记录列表页、用户评分与反馈入口
- 增加多语言支持（当前为中文优先）
- 增加更多占卦方式（时间起卦、数字起卦等），但逻辑仍复用 `lib/divination.ts` 的纯函数结构
