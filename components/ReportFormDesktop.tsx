'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getReportReasonsForTarget,
  isUserReportTarget,
  type ReportTargetType,
} from '@/lib/reportReasons';

interface Props {
  targetType: ReportTargetType;
  targetId: string;
}

export function ReportFormDesktop({ targetType, targetId }: Props) {
  const router = useRouter();
  const reasons = useMemo(() => getReportReasonsForTarget(targetType), [targetType]);
  const isUserReport = isUserReportTarget(targetType);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [detailDraft, setDetailDraft] = useState('');
  const [detailSaved, setDetailSaved] = useState<string | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const toggleReason = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSaveDetail = () => {
    const trimmed = detailDraft.trim();
    setDetailSaved(trimmed || null);
    setIsEditingDetail(false);
  };

  const handleEditDetail = () => {
    setDetailDraft(detailSaved ?? '');
    setIsEditingDetail(true);
  };

  const handleSubmit = async () => {
    if (selectedKeys.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      const detail = isEditingDetail
        ? (detailDraft.trim() || undefined)
        : (detailSaved ?? undefined);

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reasonKeys: [...selectedKeys],
          detail,
        }),
      });
      if (res.status === 409) {
        window.alert('この内容はすでに通報済みです。');
        return;
      }
      if (!res.ok) {
        window.alert('送信に失敗しました。時間をおいて再度お試しください。');
        return;
      }
      router.back();
    } catch {
      window.alert('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hidden md:flex flex-col flex-1 min-h-0">
      <div className="max-w-5xl w-full mx-auto px-10 py-8 flex flex-col flex-1 min-h-0">
        <p className="text-sm text-gray-500 mb-6">
          {isUserReport ? 'アカウントの通報' : '投稿の通報'}
          <span className="mx-2 text-gray-300">|</span>
          該当する理由をすべて選択し、必要に応じて詳細を記入してください。
        </p>

        <div className="grid grid-cols-2 gap-10 flex-1 min-h-0">
          {/* 項目1: 理由選択 */}
          <section className="flex flex-col min-h-0">
            <h2 className="text-[15px] font-black text-gray-900 mb-1">項目1 — 理由選択</h2>
            <p className="text-xs text-gray-400 mb-4">該当するものをすべてチェック</p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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

          {/* 項目2: 自由記述 */}
          <section className="flex flex-col min-h-0">
            <h2 className="text-[15px] font-black text-gray-900 mb-1">項目2 — 自由記述</h2>
            <p className="text-xs text-gray-400 mb-4">管理者に伝えたいことがあれば記入（任意）</p>
            <div className="flex-1 flex flex-col min-h-[360px]">
              <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 min-h-[320px] flex flex-col">
                {isEditingDetail ? (
                  <textarea
                    value={detailDraft}
                    onChange={(e) => setDetailDraft(e.target.value)}
                    placeholder="詳細を入力..."
                    className="flex-1 w-full min-h-[280px] resize-none text-sm text-gray-800 leading-relaxed outline-none placeholder:text-gray-300"
                  />
                ) : detailSaved ? (
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {detailSaved}
                  </p>
                ) : (
                  <p className="text-sm text-gray-300">（未入力）</p>
                )}
              </div>
              <div className="flex justify-end mt-3">
                {isEditingDetail ? (
                  <button
                    type="button"
                    onClick={handleSaveDetail}
                    className="px-5 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    保存
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditDetail}
                    className="px-5 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    編集
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-center pt-10 pb-6 flex-shrink-0">
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
  );
}
