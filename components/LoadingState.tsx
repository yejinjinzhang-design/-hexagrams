import type { ReactNode } from "react";

interface LoadingStateProps {
  message?: string;
  children?: ReactNode;
}

export function LoadingState({ message, children }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ink-accent/30 bg-ink-muted/60 p-4 text-sm text-gray-200 shadow-soft-glow">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-accent border-t-transparent" />
        <span>{message ?? "正在与卦象对话，请稍候……"}</span>
      </div>
      {children ? <div className="text-xs text-gray-400">{children}</div> : null}
    </div>
  );
}

