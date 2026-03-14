import { Suspense } from "react";
import DivinationPageClient from "./DivinationPageClient";

export default function DivinationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex max-w-lg mx-auto items-center justify-center rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/90 p-12 text-sm text-[#5c4a38]">
          加载中…
        </div>
      }
    >
      <DivinationPageClient />
    </Suspense>
  );
}
