/** プロフィール設定フロー（ニックネーム → 生年月日 → ユーザーID）の進捗インジケーター */
export function SignupProfileProgress({ step, total = 3 }: { step: number; total?: number }) {
  const clamped = Math.max(0, Math.min(step, total));

  return (
    <div
      className="flex items-center justify-center gap-2.5 h-2.5"
      aria-label={`${clamped} / ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const active = i < clamped;
        return (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              active ? 'w-8 h-2.5' : 'w-2.5 h-2.5'
            }`}
            style={{ background: active ? '#FFCD31' : '#EDE9D8' }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
