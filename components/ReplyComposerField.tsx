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

/** div の pre-wrap は末尾改行だけでは行が増えない。textarea のキャレット行と高さを揃える。 */
function mirrorContent(text: string, render: (t: string) => React.ReactNode): React.ReactNode {
  if (!text) return '\u00a0';
  return (
    <>
      {render(text)}
      {text.endsWith('\n') ? '\u00a0' : null}
    </>
  );
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

  // 親に固定高さ+overflow:hidden が付いたままだとミラーが潰れて高さが伸びない。
  // いったん auto にしてから中身の高さを測る。
  const measureHeight = (wrap: HTMLElement, mirror: HTMLElement) => {
    const prev = wrap.style.height;
    wrap.style.height = 'auto';
    const contentHeight = mirror.scrollHeight;
    wrap.style.height = prev;
    return contentHeight;
  };

  const applyHeight = (
    wrap: HTMLElement,
    textarea: HTMLTextAreaElement,
    contentHeight: number,
    visible?: HTMLElement | null,
  ) => {
    const capped = Math.min(Math.max(contentHeight, 1), MAX_HEIGHT_PX);
    wrap.style.height = `${capped}px`;
    const scrollable = contentHeight > MAX_HEIGHT_PX;
    textarea.style.overflowY = scrollable ? 'auto' : 'hidden';
    if (visible) visible.style.overflowY = scrollable ? 'auto' : 'hidden';
    // 非plain（mention）経路では textarea / 表示divがグリッドセルで内容高さ(143px等)まで伸び、
    // wrap(=capped)が下をクリップするだけで内部スクロールしない。明示的に capped へ固定して
    // 自前でスクロールできるようにする（plain経路は absolute inset-0 なので height は触らない）。
    if (visible) {
      textarea.style.height = scrollable ? `${capped}px` : '';
      visible.style.height = scrollable ? `${capped}px` : '';
    }
    if (!scrollable) {
      // 上限内なら先頭から全部見せる（改行直後に1行目が消えるのを防ぐ）
      textarea.scrollTop = 0;
      if (visible) visible.scrollTop = 0;
    } else {
      // 上限を超えたら、文末（入力中のカーソル）が見えるよう最下部にスクロールする。
      textarea.scrollTop = textarea.scrollHeight;
      if (visible) visible.scrollTop = visible.scrollHeight;
    }
  };

  const syncPlainLayout = useCallback(() => {
    const wrap = plainWrapRef.current;
    const mirror = plainMirrorRef.current;
    const textarea = textareaRef.current;
    if (!wrap || !mirror || !textarea) return;
    applyHeight(wrap, textarea, measureHeight(wrap, mirror));
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

    applyHeight(wrap, textarea, measureHeight(wrap, mirror), visible);
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

  const handleMirrorChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    queueMicrotask(syncMirrorLayout);
  }, [onChange, syncMirrorLayout]);

  const rounded = variant === 'inline' ? 'rounded-xl' : 'rounded-2xl';
  const padX = variant === 'inline' ? 'pl-2.5' : 'pl-3';
  // モバイルはグローバルの拡大防止で textarea が 16px 固定になる。表示divも 16px に揃える。
  // 上下 padding は少し広めにしてタップしやすくする。デスクトップは従来どおり小さめ。
  const cellClass = `col-start-1 row-start-1 w-full min-w-0 max-w-full ${padX} pr-1 py-1.5 text-[16px] md:py-0.5 md:text-xs box-border`;
  const plainPadClass = `${padX} pr-1 py-1.5 text-[16px] md:py-0.5 md:text-xs w-full min-w-0 max-w-full`;

  const canSend = !!text.trim() && !submitting;

  const sendButton = (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!canSend}
      className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-colors ${canSend ? 'text-[#F2B800]' : 'text-gray-300'}`}
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
        className={`reply-composer-input-shell flex items-center md:items-end gap-0.5 min-w-0 w-full ${rounded} py-1.5 md:py-0.5 pr-0.5`}
      >
        <div ref={plainWrapRef} className="relative flex-1 min-w-0 overflow-hidden min-h-[1.45em]">
          {/* フロー内ミラー: 折り返し後の高さを決める */}
          <div
            ref={plainMirrorRef}
            aria-hidden
            className={`invisible pointer-events-none ${plainPadClass}`}
            style={WRAP_STYLE}
          >
            {mirrorContent(text, (t) => t)}
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
            className={`shell-field absolute inset-0 block resize-none bg-transparent text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none ${plainPadClass}`}
            style={{ ...WRAP_STYLE, overflowX: 'hidden', overflowY: 'hidden' }}
          />
        </div>
        {sendButton}
      </div>
    );
  }

  return (
    <div
      className={`reply-composer-input-shell flex items-center md:items-end gap-0.5 min-w-0 w-full ${rounded} py-1.5 md:py-0.5 pr-0.5`}
    >
      <div ref={wrapRef} className="relative flex-1 min-w-0 overflow-hidden min-h-[1.45em]">
        <div
          className="grid w-full min-w-0 h-full overflow-hidden"
          style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
        >
          <div
            ref={mirrorRef}
            aria-hidden
            // self-start: グリッドの行高に引き伸ばされると scrollHeight が縮まらず、
            // backspace で入力欄が小さくならない不具合になるため、内容の高さだけを測る。
            className={`${cellClass} self-start invisible pointer-events-none`}
            style={WRAP_STYLE}
          >
            {mirrorContent(text, renderMentionText)}
          </div>
          <div
            ref={visibleRef}
            aria-hidden
            className={`${cellClass} pointer-events-none text-gray-800 dark:text-white overflow-hidden`}
            style={WRAP_STYLE}
          >
            {/* textarea 本体は文字色が透明なので placeholder も見えない。空のときはここで代わりに表示する。 */}
            {text
              ? mirrorContent(text, renderMentionText)
              : <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleMirrorChange}
            onSelect={onSelect}
            onScroll={e => {
              const ta = e.currentTarget;
              const v = visibleRef.current;
              if (!v) return;
              // textarea と表示用 div は高さが一致しないことがあるため、スクロール量を「比率」で同期する。
              // こうすると textarea が最下部のとき表示 div も確実に最下部（＝文末/カーソル）まで来る。
              const taMax = ta.scrollHeight - ta.clientHeight;
              const vMax = v.scrollHeight - v.clientHeight;
              v.scrollTop = taMax > 0 ? (ta.scrollTop / taMax) * vMax : 0;
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            wrap="soft"
            className={`shell-field ${cellClass} z-10 resize-none bg-transparent placeholder-gray-400 dark:placeholder-gray-500 caret-[#374151] dark:caret-gray-100 focus:outline-none`}
            style={{
              ...WRAP_STYLE,
              // 表示は上の visible div が担い、textarea 自体の文字は隠す。
              // iOS のダークモード自動調整で color:transparent が上書きされ「文字が二重」に
              // 見える問題を防ぐため WebkitTextFillColor も透明にする。
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>
      {sendButton}
    </div>
  );
}
