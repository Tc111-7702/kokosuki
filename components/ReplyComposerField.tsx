'use client';

import { useLayoutEffect } from 'react';
import { SendHorizontal } from 'lucide-react';

const MAX_HEIGHT_PX = 128;

function syncTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = '0px';
  const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
}

export function ReplyComposerField({
  text,
  textareaRef,
  onChange,
  onSelect,
  onKeyDown,
  renderMentionText,
  onSubmit,
  submitting = false,
  placeholder = '返信する…',
  variant = 'detail',
}: {
  text: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  renderMentionText: (t: string) => React.ReactNode;
  onSubmit: () => void;
  submitting?: boolean;
  placeholder?: string;
  variant?: 'detail' | 'inline';
}) {
  useLayoutEffect(() => {
    if (textareaRef.current) syncTextareaHeight(textareaRef.current);
  }, [text, textareaRef]);

  const rounded = variant === 'inline' ? 'rounded-xl' : 'rounded-2xl';
  const padX = variant === 'inline' ? 'pl-2.5' : 'pl-3';

  const canSend = !!text.trim() && !submitting;

  return (
    <div
      className={`flex items-end gap-0.5 ${rounded} border border-gray-200 bg-white py-0.5 pr-0.5`}
    >
      <div className="relative flex-1 min-w-0">
        <div
          aria-hidden
          className={`absolute inset-0 ${padX} pr-1 py-0.5 text-xs whitespace-pre-wrap break-words pointer-events-none text-gray-800 overflow-hidden`}
          style={{ lineHeight: '1.45', fontFamily: 'inherit' }}
        >
          {renderMentionText(text)}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={onChange}
          onSelect={onSelect}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className={`relative w-full resize-none bg-transparent ${padX} pr-1 py-0.5 text-xs placeholder-gray-400 focus:outline-none`}
          style={{ lineHeight: '1.45', color: 'transparent', caretColor: '#374151' }}
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSend}
        className={`flex-shrink-0 flex items-center justify-center w-6 h-6 mb-0.5 rounded-full transition-colors ${canSend ? 'text-[#F2B800]' : 'text-gray-300'}`}
        aria-label="返信を送信"
      >
        {submitting
          ? <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          : <SendHorizontal size={variant === 'inline' ? 15 : 16} strokeWidth={2.5} />
        }
      </button>
    </div>
  );
}
