import { Suspense } from "react";
import { LoadingState } from "@/components/LoadingState";
import ResultPageClient from "./ResultPageClient";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <LoadingState message="正在载入本次卦象与 AI 分析结果..." />
      }
    >
      <ResultPageClient />
    </Suspense>
  );
}
