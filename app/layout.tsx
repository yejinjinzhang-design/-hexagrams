import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "AI 六爻起卦分析",
  description: "基于六爻与大语言模型的在线占卦分析工具"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="ritual-root min-h-screen text-[#3e3127] antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-6 md:px-5 md:py-8">
          <header className="mb-8 flex items-center justify-between border-b border-[#e1d4bc] pb-4">
            <div>
              <h1 className="font-ritual-title text-lg font-semibold tracking-[0.35em] text-[#3e3127] md:text-xl">
                六爻观势
              </h1>
              <p className="mt-2 text-xs text-[#8a755a] md:text-sm">
                以象观变 以理为参
              </p>
            </div>
            <div className="hidden text-xs text-[#b3946a] sm:block md:text-sm">
              <span className="inline-flex items-center justify-center rounded-full border border-[#d4c0a0] bg-[#f7f1e4] px-3 py-1.5 font-medium tracking-[0.08em] text-[#604b33]">
                Yasmin的AI易理实验室
              </span>
            </div>
          </header>
          {/* 氛围层：极低透明度的角落装饰（不影响阅读） */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10"
          >
            <div
              className="absolute left-0 top-0 h-[140px] w-[140px]"
              style={{
                background:
                  "radial-gradient(circle at 20% 20%, rgba(176,138,87,0.14), transparent 60%)",
              }}
            />
            <div
              className="absolute right-0 top-0 h-[140px] w-[140px]"
              style={{
                background:
                  "radial-gradient(circle at 80% 20%, rgba(94,111,104,0.12), transparent 60%)",
              }}
            />
            <div
              className="absolute left-0 bottom-0 h-[140px] w-[140px]"
              style={{
                background:
                  "radial-gradient(circle at 20% 80%, rgba(142,90,79,0.09), transparent 60%)",
              }}
            />
            <div
              className="absolute right-0 bottom-0 h-[140px] w-[140px]"
              style={{
                background:
                  "radial-gradient(circle at 80% 80%, rgba(176,138,87,0.10), transparent 60%)",
              }}
            />
          </div>
          <main className="flex-1">
            <Providers>{children}</Providers>
          </main>
          <footer className="mt-10 border-t border-[#e1d4bc] pt-4 text-center text-[11px] text-[#9b8464] md:text-xs">
            本工具仅作学习与自我对话之用，不构成任何现实决策建议或承诺
          </footer>
        </div>
      </body>
    </html>
  );
}

