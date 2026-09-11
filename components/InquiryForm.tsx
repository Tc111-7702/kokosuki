'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INQUIRY_BODY_MAX } from '@/lib/inquiryStatus';
import { ReportSubmitSuccess } from '@/components/ReportSubmitSuccess';

export function InquiryForm() {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const resizeBody = useCallback(() => {
    const el = bodyRef.current;
    if (!el || window.matchMedia('(min-width: 768px)').matches) {
      if (el) el.style.height = '';
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeBody();
  }, [body, resizeBody]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => resizeBody();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [resizeBody]);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        window.alert('送信に失敗しました。時間をおいて再度お試しください。');
        return;
      }
      setShowSuccess(true);
    } catch {
      window.alert('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = body.trim().length > 0 && !submitting;

  return (
    <>
      {showSuccess && (
        <ReportSubmitSuccess title="お問い合わせを受け付けました" />
      )}
      <div className="w-full">
        <div className="max-w-3xl w-full mx-auto px-4 py-6 pb-8 md:px-10 md:py-8 md:pb-12">
          <p className="text-sm text-gray-500 mb-6">
            不具合のご報告・ご意見・ご質問など、お気軽にお書きください。
          </p>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 md:p-5 md:min-h-[240px] md:flex md:flex-col">
            <textarea
              ref={bodyRef}
              rows={1}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                queueMicrotask(resizeBody);
              }}
              maxLength={INQUIRY_BODY_MAX}
              placeholder="お問い合わせ内容を入力..."
              className={
                'scrollbar-hide w-full resize-none text-sm text-gray-800 leading-relaxed outline-none ' +
                'placeholder:text-gray-300 bg-transparent overflow-hidden md:flex-1 md:min-h-[200px]'
              }
            />
          </div>

          <div className="relative z-10 flex justify-center pt-6 md:pt-10">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={
                'min-w-[200px] px-8 py-3 rounded-full text-[15px] font-black transition-colors ' +
                (!canSubmit
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#F2B800] text-white hover:bg-[#E0A800] active:opacity-90')
              }
            >
              {submitting ? '送信中…' : '送信する'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
