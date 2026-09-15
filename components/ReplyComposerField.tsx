'use client';

import { useRef, useLayoutEffect, useCallback } from 'react';
import { SendHorizontal } from 'lucide-react';

const MAX_HEIGHT_PX = 128;

const WRAP_STYLE = {
  lineHeight: 1.45,
  fontFamily: 'inherit',
  whiteSpace: 'pre-wrap' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-all' as const,
  boxSizing: 'border-box' as const,
};

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
  plainText = false,
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
  /** true: 単一行textarea（英語折り返し対応）。メンション装飾なし向け */
  plainText?: boolean;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const plainWrapRef = useRef<HTMLDivElement>(null);
  const plainMirrorRef = useRef<HTMLDivElement>(null);

  const syncPlainLayout = useCallback(() => {
    const wrap = plainWrapRef.current;
    const mirror = plainMirrorRef.current;
    const textarea = textareaRef.current;
    if (!wrap || !mirror || !textarea) return;

    const contentHeight = mirror.offsetHeight;
    const capped = Math.min(contentHeight, MAX_HEIGHT_PX);
    wrap.style.height = `${capped}px`;
    textarea.style.overflowY = contentHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, [textareaRef]);

  const syncMirrorLayout = useCallback(() => {
    const mirror = mirrorRef.current;
    const textarea = textareaRef.current;
    const wrap = wrapRef.current;
    const visible = visibleRef.current;
    if (!mirror || !textarea || !wrap) return;

    const w = wrap.clientWidth;
    if (w > 0) {
      mirror.style.width = `${w}px`;
      if (visible) visible.style.width = `${w}px`;
    }

    const contentHeight = mirror.scrollHeight;
    const capped = Math.min(contentHeight, MAX_HEIGHT_PX);
    wrap.style.height = `${capped}px`;
    textarea.style.overflowY = contentHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
    if (visible) visible.style.overflowY = contentHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, [textareaRef]);

  useLayoutEffect(() => {
    if (plainText) {
      syncPlainLayout();
      const wrap = plainWrapRef.current;
      if (!wrap) return;
      const ro = new ResizeObserver(syncPlainLayout);
      ro.observe(wrap);
      return () => ro.disconnect();
    }
    syncMirrorLayout();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(syncMirrorLayout);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text, textareaRef, plainText, syncPlainLayout, syncMirrorLayout]);

  const handlePlainChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    queueMicrotask(syncPlainLayout);
  }, [onChange, syncPlainLayout]);

  const rounded = variant === 'inline' ? 'rounded-xl' : 'rounded-2xl';
  const padX = variant === 'inline' ? 'pl-2.5' : 'pl-3';
  const cellClass = `col-start-1 row-start-1 w-full min-w-0 max-w-full ${padX} pr-1 py-0.5 text-xs box-border`;
  const plainPadClass = `${padX} pr-1 py-0.5 text-xs w-full min-w-0 max-w-full`;

  const canSend = !!text.trim() && !submitting;

  const sendButton = (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!canSend}
      className={`flex-shrink-0 flex items-center justify-center w-6 h-6 mb-0.5 rounded-full transition-colors ${canSend ? 'text-[#F2B800]' : 'text-gray-300'}`}
      aria-label="返信を送信"
    >
      {submitting
        ? <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        : <SendHorizontal size={variant === 'inline' ? 15 : 16} strokeWidth={2.5} />}
    </button>
  );

  if (plainText) {
    return (
      <div
        className={`reply-composer-input-shell flex items-end gap-0.5 min-w-0 w-full ${rounded} py-0.5 pr-0.5`}
      >
        <div ref={plainWrapRef} className="relative flex-1 min-w-0 overflow-hidden min-h-[1.45em]">
          {/* フロー内ミラー: 折り返し後の高さを決める */}
          <div
            ref={plainMirrorRef}
            aria-hidden
            className={`invisible pointer-events-none ${plainPadClass}`}
            style={WRAP_STYLE}
          >
            {text || '\u00a0'}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handlePlainChange}
            onSelect={onSelect}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            wrap="soft"
            className={`shell-field absolute inset-0 block resize-none bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none ${plainPadClass}`}
            style={{ ...WRAP_STYLE, overflowX: 'hidden', overflowY: 'hidden' }}
          />
        </div>
        {sendButton}
      </div>
    );
  }

  return (
    <div
      className={`reply-composer-input-shell flex items-end gap-0.5 min-w-0 w-full ${rounded} py-0.5 pr-0.5`}
    >
      <div ref={wrapRef} className="relative flex-1 min-w-0 overflow-hidden min-h-[1.45em]">
        <div
          className="grid w-full min-w-0 h-full overflow-hidden"
          style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
        >
          <div
            ref={mirrorRef}
            aria-hidden
            className={`${cellClass} invisible pointer-events-none`}
            style={WRAP_STYLE}
          >
            {renderMentionText(text) || '\u00a0'}
          </div>
          <div
            ref={visibleRef}
            aria-hidden
            className={`${cellClass} pointer-events-none text-gray-800 overflow-hidden`}
            style={WRAP_STYLE}
          >
            {renderMentionText(text)}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={onChange}
            onSelect={onSelect}
            onScroll={e => { if (visibleRef.current) visibleRef.current.scrollTop = e.currentTarget.scrollTop; }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            wrap="soft"
            className={`shell-field ${cellClass} z-10 resize-none bg-transparent placeholder-gray-400 focus:outline-none`}
            style={{
              ...WRAP_STYLE,
              color: 'transparent',
              caretColor: '#374151',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>
      {sendButton}
    </div>
  );
}
