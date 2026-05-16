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
          className="w-full resize-none ink-input text-[11px] placeholder:text-[#B09A82] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={
          disabled || maxUserTurnsReached || !value.trim()
        }
        className="ink-button-primary h-9 shrink-0 px-4 py-0 text-[11px] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {submitLabel}
      </button>
    </div>
  );
}
