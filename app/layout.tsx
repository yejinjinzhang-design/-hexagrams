import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI 六爻起卦分析",
  description: "基于六爻与大语言模型的在线占卦分析工具"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#f3ecdd] text-[#3b2f2f] antialiased">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-8 md:px-8 md:py-10">
          <header className="mb-8 flex items-center justify-between border-b border-[#e1d4bc] pb-4">
            <div>
              <h1 className="text-lg font-semibold tracking-[0.35em] text-[#3b2f2f] md:text-xl">
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
          <main className="flex-1">{children}</main>
          <footer className="mt-10 border-t border-[#e1d4bc] pt-4 text-center text-[11px] text-[#9b8464] md:text-xs">
            本工具仅作学习与自我对话之用，不构成任何现实决策建议或承诺。
          </footer>
        </div>
      </body>
    </html>
  );
}

