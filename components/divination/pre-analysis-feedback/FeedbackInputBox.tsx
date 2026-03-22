"use client";

type FeedbackInputBoxProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  maxUserTurnsReached?: boolean;
};

export function FeedbackInputBox({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "若有出入，可在此补充前情",
  submitLabel = "补述前情",
  maxUserTurnsReached,
}: FeedbackInputBoxProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end">
      <div className="flex-1">
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || maxUserTurnsReached}
          placeholder={placeholder}
          className="w-full resize-none rounded-[10px] border border-[#D7C6AA] bg-[#FBF5EB] px-3 py-2 text-[11px] text-[#3A2F26] placeholder:text-[#B09A82] focus:border-[#C6A46C] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={
          disabled || maxUserTurnsReached || !value.trim()
        }
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[#C6A46C] px-4 text-[11px] font-medium text-[#fff9ee] shadow-[0_4px_12px_rgba(198,164,108,0.25)] transition-colors hover:bg-[#B38B43] disabled:cursor-not-allowed disabled:bg-[#D5C3A4]"
      >
        {submitLabel}
      </button>
    </div>
  );
}
