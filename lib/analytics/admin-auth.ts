import { NextResponse } from "next/server";

/** 请求头 x-admin-key 或查询参数 key 与 ADMIN_ANALYTICS_KEY 一致则通过 */
export function requireAdminAnalyticsKey(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_ANALYTICS_KEY?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "未配置 ADMIN_ANALYTICS_KEY，请在 .env.local 中设置后访问后台接口。",
      },
      { status: 503 }
    );
  }
  const headerKey = request.headers.get("x-admin-key")?.trim();
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key")?.trim();
  if (headerKey === expected || queryKey === expected) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
