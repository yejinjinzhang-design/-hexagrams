# Vercel 上用 Redis 稳定保存占卦会话

## 为什么需要

Serverless 默认 **内存 + 本机磁盘** 无法在多个函数实例之间共享；追问、前验、后续分析都要用同一个 `sessionId` 读会话，所以会 **偶发 session not found**。

用 **Upstash Redis**（HTTP 协议，无需 TCP，适合 Vercel）可把整份 `StoredDivinationSession` JSON 存进去，全地域实例读同一份数据。

## 怎么做（约 5 分钟）

### 1. 创建免费 Redis

1. 打开 [Upstash Console](https://console.upstash.com/)，注册/登录。
2. **Create database** → 选离用户近的 region（如 `ap-southeast-1`）。
3. 建好后进入该库，在 **REST API** 区域复制：
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

### 2. 填到 Vercel

1. Vercel 项目 → **Settings → Environment Variables**。
2. 新增两条（建议勾选 **Production**、**Preview**）：
   - `UPSTASH_REDIS_REST_URL` = 上面 URL  
   - `UPSTASH_REDIS_REST_TOKEN` = 上面 Token  
3. **Save** 后，在 **Deployments** 里对最新部署点 **Redeploy**（或随便 push 一次）。

### 3. 本地（可选）

在 `.env.local` 里同样写这两条，重启 `npm run dev` 后本地也会走 Redis（便于与线上一致调试）。  
不配则本地仍用 **`data/sessions/*.json`**。

## 行为说明

| 环境变量 | 会话存储 |
|----------|----------|
| 两个 Upstash 变量都已配置 | **仅 Redis**（内存作进程内缓存），TTL **7 天** |
| 未配置 | **内存 + 本地文件**（非 Vercel）或 **内存 + /tmp**（Vercel，不可靠） |

## 费用与安全

- Upstash 免费档一般够个人/小流量产品试用。
- Token 等同数据库密码，**不要**提交到 Git，只放在 Vercel / `.env.local`。

## PlanetScale / Supabase 可以吗？

可以，但要建表、写 SQL/ORM，比 **键值存整条 JSON** 重。当前项目已按 **Redis 字符串** 接好；若你坚持用 Postgres，可再建表 `sessions(id text primary key, payload jsonb, updated_at timestamptz)` 并仿照 `redis-session.ts` 做一层 `postgres-session.ts` 切换。
