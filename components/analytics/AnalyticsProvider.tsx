"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getAnalyticsSessionId, getAnalyticsVisitorId, trackEvent } from "@/lib/analytics/client";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSig = useRef<string>("");

  useEffect(() => {
    void getAnalyticsVisitorId();
    void getAnalyticsSessionId();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString() ?? "";
    const sig = `${pathname}?${qs}`;
    if (lastSig.current === sig) return;
    lastSig.current = sig;
    trackEvent("page_view", {
      metadata: {
        path: pathname,
        search: qs || undefined,
        full_path: sig.slice(0, 500),
      },
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
