# 匿名埋点与 `/admin` 数据面板

## 1. 标识口径

| 字段 | 存储 | 说明 |
|------|------|------|
| `visitor_id` | `localStorage.analytics_visitor_id` | 首次访问生成 UUID，同浏览器长期复用 |
| `session_id` | `sessionStorage.analytics_session_id` | 每个浏览器标签页会话一份，关标签后重建 |

## 2. 事件一览

| event_name | 触发时机 |
|------------|----------|
| `page_view` | 路由变化（pathname + search 变化） |
| `question_submitted` | 首页表单带问题跳转起卦页 |
| `divination_started` | 进入起卦页（每标签一次） |
| `divination_method_selected` | 起卦方式 Tab 变更（含首次默认铜钱） |
| `line_completed` | 六爻进度 +1（含时间/数字/手动一次填满多爻） |
| `divination_completed` | 提交 `/api/analyze` 成功并得到 `sessionId` |
| `pre_validation_viewed` | 前事验证接口返回、结束 loading |
| `pre_feedback_submitted` | 点击「补述前情」提交一条用户补述 |
| `analysis_viewed` | 后续分析请求结束 loading |
| `followup_chat_used` | 卦后追问发送成功 |
| `reset_divination` | 起卦页点击清空/重掷 |

每条事件均含：`visitor_id`、`session_id`、`event_name`、`event_time`（ISO）、`page`（pathname）、`metadata`（JSON）。

## 3. 存储（事件表）

落地为 **`data/analytics-events.jsonl`**：每行一条 JSON，字段同 `AnalyticsEventRecord`（`metadata` 为字符串化 JSON）。

> **部署注意**：Vercel 等无持久磁盘环境需改为数据库或对象存储，否则重启丢数据。

## 4. 前端 API

- `trackEvent(name, { metadata })`：`lib/analytics/client.ts`，优先 `sendBeacon`，降级 `fetch(..., { keepalive: true })`。
- `POST /api/analytics/track`：写入日志（公开，需合法 `event_name`）。

## 5. 后台查询 API（需鉴权）

环境变量 **`ADMIN_ANALYTICS_KEY`**。请求携带 **`x-admin-key: <密钥>`** 或 **`?key=`**（仅建议内网/本人使用）。

- `GET /api/admin/analytics/overview` — 今日概览（上海日历日）
- `GET /api/admin/analytics/trends?days=7|30` — 趋势序列
- `GET /api/admin/analytics/funnel?period=today|last7|last30` — 漏斗 + 平均起卦/会话时长
- `GET /api/admin/analytics/methods?days=7|30` — 起卦方式（`divination_method_selected` 的 `metadata.method`）

## 6. 面板入口

浏览器打开 **`/admin`**，输入与 `.env.local` 中一致的 `ADMIN_ANALYTICS_KEY`，密钥可保存在 `sessionStorage` 以便刷新。

## 7. 起卦方式标签

与产品一致：`coin` / `lunarDate`（农历时间卦）/ `number` / `manual`；预留 `solarDate` 便于日后扩展，当前一般为 0。
