import type { ReactNode } from "react";

/** 后台面板独立浅色背景，与主站古风区隔 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-surface min-h-[70vh] rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-inner md:p-6">
      {children}
    </div>
  );
}
