import { Suspense } from "react";
import DivinationPageClient from "./DivinationPageClient";

export default function DivinationPage() {
  return (
    <Suspense
      fallback={
        <div className="ink-panel mx-auto flex max-w-lg items-center justify-center p-12 text-sm text-[#5c4a38]">
          加载中…
        </div>
      }
    >
      <DivinationPageClient />
    </Suspense>
  );
}
