'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface CatItem  { id: string; name: string; count: number }
interface Section  { id: string; name: string; count: number; children: CatItem[] }
interface Props {
  selected: string[];
  onToggle: (ip: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function IpChoose({ selected, onToggle, onNext, onBack }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/gacha/wp-categories')
      .then(r => r.json())
      .then(data => setSections(data.sections ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#FFFFFF]">
      {/* ヘッダー（固定） */}
      <div className="shrink-0 px-6 pt-6 sm:pt-12 pb-2">
        <button onClick={onBack} className="self-start mb-3 sm:mb-6 w-9 h-9 rounded-full flex items-center justify-center sm:hidden" style={{ background: '#F0ECD8' }}>
          <ArrowLeft size={18} color="#555" />
        </button>
        <h2 className="text-2xl font-black text-[#111] mb-3 sm:mb-5">好きなIPは？</h2>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 32, height: 32, border: '3px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          sections.map((sec) => {
            const tags: CatItem[] = sec.children.length > 0 ? sec.children : [{ id: sec.id, name: sec.name, count: sec.count }];

            const tagBtn = (tag: CatItem) => {
              const active = selected.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.name)}
                  className="rounded-full font-bold transition-colors whitespace-nowrap"
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    ...(active
                      ? { background: '#F2B800', color: 'white' }
                      : { background: '#F0ECD8', color: '#666' })
                  }}
                >
                  {tag.name}
                </button>
              );
            };

            return (
              <div key={sec.id} className="mb-7">
                {/* セクションヘッダー */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[13px] font-black text-[#F2B800] whitespace-nowrap">{sec.name}</span>
                  <div className="flex-1 h-px" style={{ background: '#EDE9D8' }} />
                </div>

                {/* モバイル：3行に分けて横スクロール（各タグが自然幅） */}
                <div
                  className="sm:hidden"
                  style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 4, marginRight: -12 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 'max-content' }}>
                    {[0, 1, 2].map((rowIdx) => (
                      <div key={rowIdx} style={{ display: 'flex', gap: 5 }}>
                        {tags.filter((_, i) => i % 3 === rowIdx).map(tagBtn)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* デスクトップ：折り返し */}
                <div className="hidden sm:flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = selected.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => onToggle(tag.name)}
                        className="px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors whitespace-nowrap"
                        style={active
                          ? { background: '#F2B800', color: 'white' }
                          : { background: '#F0ECD8', color: '#666' }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* フッター（固定） */}
      <div className="shrink-0 px-6 pt-3 pb-8" style={{ borderTop: '1.5px solid #EDE9D8' }}>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="w-full py-4 rounded-2xl font-black text-[16px] transition-opacity"
          style={{ background: '#F2B800', color: 'white', opacity: selected.length === 0 ? 0.4 : 1 }}
        >
          次へ（{selected.length}件選択）
        </button>
        <button onClick={onBack} className="hidden sm:block mt-4 text-[13px] text-[#999] underline underline-offset-2 w-full text-center">
          戻る
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
