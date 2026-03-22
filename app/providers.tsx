"use client";

import { Suspense, type ReactNode } from "react";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </Suspense>
  );
}
