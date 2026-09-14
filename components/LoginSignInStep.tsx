'use client';

interface Props {
  onBack: () => void;
}

export function LoginSignInStep({ onBack }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[14px] font-bold text-[#888888] active:opacity-70"
      >
        ← 戻る
      </button>
    </div>
  );
}
