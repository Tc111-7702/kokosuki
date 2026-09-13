'use client';

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

const OTP_LEN = 6;
const cellClass =
  'w-10 h-11 md:w-14 md:h-16 rounded-xl text-[18px] md:text-[24px] font-black text-center outline-none disabled:opacity-50';
const cellStyle = { border: '1.5px solid #EDE9D8', color: '#111', background: 'white' } as const;

export function OtpDigitInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LEN }, (_, i) => value[i] ?? '');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const focusAt = (index: number) => {
    refs.current[Math.max(0, Math.min(index, OTP_LEN - 1))]?.focus();
  };

  const applyDigits = (next: string, focusIndex?: number) => {
    const normalized = next.replace(/\D/g, '').slice(0, OTP_LEN);
    onChange(normalized);
    if (focusIndex !== undefined) focusAt(focusIndex);
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) {
      applyDigits(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    applyDigits(value.slice(0, index) + digit + value.slice(index + 1), index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        applyDigits(value.slice(0, index) + value.slice(index + 1), index);
      } else if (index > 0) {
        applyDigits(value.slice(0, index - 1) + value.slice(index), index - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(index - 1);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (!pasted) return;
    applyDigits(pasted, Math.min(pasted.length, OTP_LEN - 1));
  };

  return (
    <div className="flex gap-1.5 md:gap-2.5 justify-start md:justify-center w-full" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { refs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`認証コード ${index + 1}桁目`}
          className={cellClass}
          style={cellStyle}
        />
      ))}
    </div>
  );
}
