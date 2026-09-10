'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getReportReasonsForTarget,
  isUserReportTarget,
  type ReportTargetType,
} from '@/lib/reportReasons';
import { ReportSubmitSuccess } from '@/components/ReportSubmitSuccess';

interface Props {
  targetType: ReportTargetType;
  targetId: string;
}

export function ReportFormDesktop({ targetType, targetId }: Props) {
  const router = useRouter();
  const reasons = useMemo(() => getReportReasonsForTarget(targetType), [targetType]);
  const isUserReport = isUserReportTarget(targetType);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.report) return;
        setSelectedKeys(new Set(d.report.reasonKeys as string[]));
        if (d.report.detail) setDetail(d.report.detail as string);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [targetType, targetId]);

  const toggleReason = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedKeys.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reasonKeys: [...selectedKeys],
          detail: detail.trim() || undefined,
        }),
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

  if (loading) {
    return (
      <div className="hidden md:flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#F2B800] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    {showSuccess && <ReportSubmitSuccess />}
    <div className="hidden md:block w-full">
      <div className="max-w-5xl w-full mx-auto px-10 py-8 pb-12">
        <p className="text-sm text-gray-500 mb-6">
          {isUserReport ? 'アカウントの通報' : '投稿の通報'}
          <span className="mx-2 text-gray-300">|</span>
          該当する理由をすべて選択し、必要に応じて詳細を記入してください。
        </p>

        <div className="grid grid-cols-2 gap-10 items-stretch">
          <section className="flex flex-col">
            <h2 className="text-[15px] font-black text-gray-900 mb-1">項目1 — 理由選択</h2>
            <p className="text-xs text-gray-400 mb-4">該当するものをすべてチェック</p>
            <div className="space-y-2 pr-2 flex-1">
              {reasons.map((r) => {
                const checked = selectedKeys.has(r.key);
                return (
                  <label
                    key={r.key}
                    className={
                      'flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ' +
                      (checked
                        ? 'border-[#F2B800] bg-[#FFFBEB]'
                        : 'border-gray-200 bg-white hover:border-gray-300')
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReason(r.key)}
                      className="mt-0.5 w-4 h-4 accent-[#F2B800] flex-shrink-0"
                    />
                    <span className="text-sm text-gray-800 leading-snug">{r.name}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col">
            <h2 className="text-[15px] font-black text-gray-900 mb-1">項目2 — 自由記述</h2>
            <p className="text-xs text-gray-400 mb-4">管理者に伝えたいことがあれば記入（任意）</p>
            <div className="flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white p-5 overflow-hidden flex flex-col">
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="詳細を入力..."
                className="scrollbar-hide flex-1 w-full min-h-0 resize-none text-sm text-gray-800 leading-relaxed outline-none placeholder:text-gray-300 bg-transparent overflow-hidden"
              />
            </div>
          </section>
        </div>

        <div className="relative z-10 flex justify-center pt-10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedKeys.size === 0 || submitting}
            className={
              'min-w-[200px] px-8 py-3 rounded-full text-[15px] font-black transition-colors ' +
              (selectedKeys.size === 0 || submitting
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
