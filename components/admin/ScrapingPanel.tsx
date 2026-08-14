'use client';

import { useEffect, useRef, useState } from 'react';
import type { ScheduleConfig } from '@/lib/scrapeSchedule';

type ScrapeType = 'gacha' | 'phone';

interface Props {
  initialGacha: ScheduleConfig;
  initialPhone: ScheduleConfig;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const TYPE_LABELS: Record<ScrapeType, string> = { gacha: 'ガチャ', phone: '店舗電話番号' };

// ✓ で単一選択するチェックボタン
function CheckOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold transition-colors"
      style={{
        background: active ? '#FFF8E1' : '#F4F1E4',
        color: active ? '#111' : '#999',
        border: active ? '1.5px solid #F2B800' : '1.5px solid transparent',
      }}
    >
      <span
        className="flex items-center justify-center text-[11px]"
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: active ? '#F2B800' : '#fff',
          border: active ? '1.5px solid #F2B800' : '1.5px solid #D8D2BE',
          color: '#fff',
        }}
      >
        {active ? '✓' : ''}
      </span>
      {children}
    </button>
  );
}

export function ScrapingPanel({ initialGacha, initialPhone }: Props) {
  const [type, setType] = useState<ScrapeType>('gacha');

  // 予約設定を useState で管理（対象ごと・サーバー保存値で初期化＝前回の履歴が残る）
  const [schedules, setSchedules] = useState<Record<ScrapeType, ScheduleConfig>>({
    gacha: initialGacha,
    phone: initialPhone,
  });
  const current = schedules[type];
  const patchSchedule = (patch: Partial<ScheduleConfig>) =>
    setSchedules((s) => ({ ...s, [type]: { ...s[type], ...patch } }));

  // 保存済み（予約ボタン成功時のみ更新）＝「現在の設定」表示用
  const [savedSchedules, setSavedSchedules] = useState<Record<ScrapeType, ScheduleConfig>>({
    gacha: initialGacha,
    phone: initialPhone,
  });
  const saved = savedSchedules[type];
  const fmtSchedule = (c: ScheduleConfig) => `${c.everyWeeks}週ごと・${DAY_LABELS[c.dayOfWeek]}曜・${c.atTime}`;

  const [logs, setLogs] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'settings' | 'terminal'>('settings'); // モバイル用

  const termRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  // 共通: API を叩いてレスポンス（ストリーム/テキスト）をターミナルへ流す。成功可否を返す。
  const callApi = async (mode: 'immediate' | 'scheduled'): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setLogs(mode === 'scheduled' ? '予約を保存中…\n' : '');
    setTab('terminal');
    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          mode,
          everyWeeks: current.everyWeeks,
          dayOfWeek: current.dayOfWeek,
          atTime: current.atTime,
        }),
      });
      if (!res.body) {
        setLogs((await res.text().catch(() => '')) || '(応答を取得できませんでした)');
        return res.ok;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setLogs((l) => l + decoder.decode(value, { stream: true }));
      }
      return res.ok;
    } catch (e) {
      setLogs((l) => l + `\n[通信エラー] ${String(e)}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // 即時実行：アラートで確認してから実行（途中停止不可）
  const runImmediate = () => {
    const ok = window.confirm(
      `「${TYPE_LABELS[type]}」のスクレイピングを即時実行します。\n開始すると途中で停止できません。実行してよろしいですか？`,
    );
    if (!ok) return;
    callApi('immediate');
  };

  // 予約：設定を保存（worker が起動時に読み込む）。成功時のみ「現在の設定」表示を更新。
  const saveSchedule = async () => {
    const t = type;
    const snapshot = current;
    const ok = await callApi('scheduled');
    if (ok) setSavedSchedules((s) => ({ ...s, [t]: snapshot }));
  };

  const settings = (
    <div className="flex flex-col gap-5">
      {/* ① 対象（✓ で一方のみ） */}
      <div>
        <p className="text-[12px] font-bold mb-2" style={{ color: '#888' }}>① 対象</p>
        <div className="flex flex-wrap gap-2">
          <CheckOption active={type === 'gacha'} onClick={() => setType('gacha')}>ガチャ</CheckOption>
          <CheckOption active={type === 'phone'} onClick={() => setType('phone')}>店舗電話番号</CheckOption>
        </div>
      </div>

      {/* ② 即時実行 */}
      <div>
        <p className="text-[12px] font-bold mb-2" style={{ color: '#888' }}>② 即時実行</p>
        <button
          type="button"
          onClick={runImmediate}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl font-black text-white text-[15px] active:opacity-80"
          style={{ background: busy ? '#D8C98A' : '#F2B800' }}
        >
          {busy ? '実行中…' : '即時実行'}
        </button>
      </div>

      {/* ③ 予約 */}
      <div className="rounded-2xl p-4" style={{ background: '#FBFAF0', border: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <p className="text-[12px] font-bold" style={{ color: '#888' }}>③ 予約</p>
          <p className="text-[12px] font-bold" style={{ color: '#F2B800' }}>現在: {fmtSchedule(saved)}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[12px] mb-1.5" style={{ color: '#AAA' }}>頻度</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((w) => (
                <CheckOption key={w} active={current.everyWeeks === w} onClick={() => patchSchedule({ everyWeeks: w })}>
                  {w}週ごと
                </CheckOption>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] mb-1.5" style={{ color: '#AAA' }}>実行曜日</p>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((d, i) => (
                <CheckOption key={i} active={current.dayOfWeek === i} onClick={() => patchSchedule({ dayOfWeek: i })}>
                  {d}
                </CheckOption>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] mb-1.5" style={{ color: '#AAA' }}>実行時刻</p>
            <input
              type="time"
              value={current.atTime}
              onChange={(e) => patchSchedule({ atTime: e.target.value })}
              className="px-3 py-2.5 rounded-xl text-[14px] outline-none"
              style={{ background: 'white', border: '1.5px solid #EDE9D8' }}
            />
          </div>

          <button
            type="button"
            onClick={saveSchedule}
            disabled={busy}
            className="w-full py-3 rounded-2xl font-black text-[15px] active:opacity-80"
            style={{ background: busy ? '#EFEFEF' : '#111', color: busy ? '#AAA' : '#fff' }}
          >
            予約
          </button>
        </div>
      </div>
    </div>
  );

  const terminal = (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setLogs('')}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
          style={{ background: '#3A3A3A', color: busy ? '#666' : '#DDD', cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          リセット
        </button>
      </div>
      <div
        ref={termRef}
        className="w-full flex-1 min-h-0 overflow-y-scroll rounded-xl p-3 font-mono text-[12px] leading-relaxed"
        style={{
          background: '#1E1E1E',
          color: '#D4D4D4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          scrollbarColor: '#6B6B6B #1E1E1E',
          scrollbarWidth: 'thin',
        }}
      >
        {logs || <span style={{ color: '#666' }}>ここに実行ログが表示されます。</span>}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* モバイル: タブ切替（黄色く光る下線タブ） */}
      <div className="flex mb-3 lg:hidden" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        {([
          { key: 'settings', label: 'スクレイピング設定' },
          { key: 'terminal', label: 'ターミナル' },
        ] as const).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative flex-1 pb-2.5 text-[13px] font-bold transition-colors"
              style={{ color: active ? '#F2B800' : '#AAA' }}
            >
              {t.label}
              {active && (
                <span
                  className="absolute left-0 right-0 bottom-0"
                  style={{ height: 3, borderRadius: 3, background: '#F2B800', boxShadow: '0 0 8px 1px rgba(242,184,0,0.75)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* デスクトップ: 左=設定 / 右=ターミナル の2ペイン。
          ターミナルは設定列と同じ高さに固定（絶対配置でセルいっぱいに敷く）。
          ログが増えても高さは変わらず、内部スクロールで最新を最下部に表示。 */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-stretch">
        <div className={tab === 'settings' ? 'block' : 'hidden lg:block'}>{settings}</div>
        <div className={`${tab === 'terminal' ? 'block' : 'hidden lg:block'} relative h-[60vh] lg:h-auto`}>
          <div className="h-full lg:absolute lg:inset-0">{terminal}</div>
        </div>
      </div>
    </div>
  );
}
