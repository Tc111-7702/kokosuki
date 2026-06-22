'use client';

import { MapPin, Heart, Flag } from 'lucide-react';
import type { FeedItem } from '@/lib/sunlit/types';
import { ipGradient } from '@/lib/sunlit/gacha-data';
import { Avatar } from './Avatar';

const STOCK_CONFIG_EXPORT = {
  in_stock:      { label: '在庫あり', bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  out_of_stock:  { label: '在庫なし', bg: '#FFF1F1', text: '#C41E1E', dot: '#EF4444' },
  not_available: { label: '取扱なし', bg: '#F5F5F4', text: '#78716C', dot: '#A8A29E' },
};

export function StockScrollCard({ item, onTap }: { item: FeedItem; onTap: () => void }) {
  const report = item.report!;
  const cfg = STOCK_CONFIG_EXPORT[report.status];
  const gr = ipGradient(item.machine.ipName);
  return (
    <div
      className="flex-shrink-0 relative rounded-[18px] overflow-hidden active:scale-95 transition-transform"
      style={{ width: 132, height: 188, cursor: 'pointer' }}
      onClick={onTap}
    >
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(150deg, ${gr.from} 0%, ${gr.to} 100%)` }} />
      <div className="absolute top-2 left-2">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.machine.ipName}</p>
        <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{item.machine.seriesName}</p>
        <div className="flex items-center gap-0.5 mt-1">
          <MapPin size={9} color="rgba(255,255,255,0.65)" />
          <span className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.spot.name}</span>
        </div>
      </div>
    </div>
  );
}

const RESULT_CONFIG_GRID = {
  hit:       { label: '神引き', bg: '#FFFAE0', text: '#92620A' },
  miss:      { label: '爆死',   bg: '#FFF1F1', text: '#C41E1E' },
  duplicate: { label: 'ダブり', bg: '#EEF2FF', text: '#3730A3' },
};

export function PullGridCard({ item, onTap, tall = false }: { item: FeedItem; onTap: () => void; tall?: boolean }) {
  const pull = item.pull!;
  const cfg  = RESULT_CONFIG_GRID[pull.result];
  const gr   = ipGradient(item.machine.ipName);
  return (
    <div
      className="rounded-[14px] overflow-hidden active:scale-[0.97] transition-transform bg-white"
      style={{ cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
      onClick={onTap}
    >
      {/* サムネイル */}
      <div className="relative w-full"
        style={{
          aspectRatio: tall ? '3/4' : '16/9',
          background: `linear-gradient(145deg, ${gr.from}, ${gr.to})`,
        }}>
        <div className={tall ? 'absolute top-2 left-2' : 'absolute top-1.5 left-1.5'}>
          <span className={`px-${tall ? '2' : '1.5'} py-0.5 rounded-full font-black`}
            style={{ fontSize: tall ? 9 : 8, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 pt-8"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
          <p className="font-black text-white leading-tight line-clamp-2"
            style={{ fontSize: tall ? 10 : 8 }}>
            {pull.itemName ?? item.machine.seriesName}
          </p>
        </div>
      </div>
      {/* カード下部 */}
      <div className="px-2 pt-1.5 pb-2">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
            style={{ background: '#F5F2E8', color: '#888' }}>{item.machine.ipName}</span>
          <p className="text-[11px] font-black text-[#111] leading-tight line-clamp-1">{pull.itemName ?? item.machine.seriesName}</p>
        </div>
        {pull.memo && (
          <p className="text-[10px] text-[#555] leading-snug line-clamp-2 mt-0.5">{pull.memo}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-0.5">
            <MapPin size={10} color="#BBB" />
            <span className="text-[10px] text-[#BBB] line-clamp-1">{item.spot.name}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Heart size={10} color="#DDD" />
            <span className="text-[10px] text-[#CCC]">{item.likeCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const RESULT_CONFIG = {
  hit:       { label: '神引き', bg: '#FFFAE0', text: '#92620A', border: '#FFCD31', dot: '#FFCD31' },
  miss:      { label: '爆死',   bg: '#FFF1F1', text: '#C41E1E', border: '#FECACA', dot: '#EF4444' },
  duplicate: { label: 'ダブり', bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', dot: '#818CF8' },
};
const STOCK_CONFIG = {
  in_stock:      { label: '在庫あり', bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  out_of_stock:  { label: '在庫なし', bg: '#FFF1F1', text: '#C41E1E', dot: '#EF4444' },
  not_available: { label: '取扱なし', bg: '#F5F5F4', text: '#78716C', dot: '#A8A29E' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'たった今';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

interface CardProps {
  item: FeedItem;
  onLike: () => void;
  onTap: () => void;
  onUser?: () => void; // プロフィール上では自分の投稿なので省略可
}

export function PullCard({ item, onLike, onTap, onUser }: CardProps) {
  const pull   = item.pull!;
  const cfg    = RESULT_CONFIG[pull.result];
  const hasImg = !!pull.imageUrl;
  return (
    <div className="mikke-feed-card w-full overflow-hidden text-left" onClick={onTap} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-0">
        <button onClick={(e) => { e.stopPropagation(); onUser?.(); }} className="flex items-center gap-2.5 active:opacity-70" style={{ cursor: onUser ? 'pointer' : 'default' }}>
          <Avatar name={item.userName} size={28} />
        </button>
        <div className="flex-1 min-w-0">
          <span onClick={(e) => { e.stopPropagation(); onUser?.(); }} className="text-[13px] font-bold text-[#111]" style={{ cursor: onUser ? 'pointer' : 'default' }}>{item.userName}</span>
          <span className="text-[11px] text-[#AAA] ml-1.5">{timeAgo(item.createdAt)}</span>
        </div>
        <div className="px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.text, border: `1.5px solid ${cfg.border}` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          {cfg.label}
        </div>
      </div>
      {hasImg && (() => { const gr = ipGradient(item.machine.ipName); return (
        <div className="mt-3 mx-3 rounded-xl overflow-hidden flex items-end p-3" style={{ aspectRatio: '16/9', background: `linear-gradient(145deg, ${gr.from}, ${gr.to})` }}>
          <span className="text-[11px] font-black text-white" style={{ opacity: 0.9 }}>{pull.itemName ?? item.machine.seriesName}</span>
        </div>
      ); })()}
      <div className="px-4 mt-3 pb-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#F5F2E8', color: '#888' }}>{item.machine.ipName}</span>
          <p className="text-[13px] font-bold text-[#111] leading-snug">{pull.itemName ?? item.machine.seriesName}</p>
        </div>
        {pull.memo && <p className="text-[13px] text-[#444] leading-relaxed">{pull.memo}</p>}
      </div>
      <div className="flex items-center justify-between px-4 py-3 mt-1" style={{ borderTop: '1px solid #F5F2E8' }}>
        <div className="flex items-center gap-1.5 text-[11px] text-[#AAA]">
          <MapPin size={11} /><span className="truncate max-w-[150px]">{item.spot.name}</span>
        </div>
        <div className="flex items-center gap-1.5 active:scale-90 transition-transform" style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onLike(); }}>
          <Heart size={16} fill={item.liked ? '#FF4D4D' : 'none'} color={item.liked ? '#FF4D4D' : '#D0CFCC'} />
          <span className="text-[12px] font-semibold" style={{ color: item.liked ? '#FF4D4D' : '#D0CFCC' }}>{item.likeCount}</span>
        </div>
      </div>
    </div>
  );
}

export function ReportCard({ item, onTap, onUser }: CardProps) {
  const report = item.report!;
  const cfg    = STOCK_CONFIG[report.status];
  return (
    <div className="mikke-feed-card w-full overflow-hidden text-left" onClick={onTap} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl" style={{ background: `linear-gradient(145deg, ${ipGradient(item.machine.ipName).from}, ${ipGradient(item.machine.ipName).to})` }} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full" style={{ background: cfg.dot, boxShadow: '0 0 0 2px white' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#F5F2E8', color: '#888' }}>{item.machine.ipName}</span>
          </div>
          <p className="text-[14px] font-bold text-[#111] leading-snug mb-1.5">{item.machine.seriesName}</p>
          <div className="flex items-center gap-1 text-[11px] text-[#AAA]">
            <MapPin size={10} /><span className="truncate">{item.spot.name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid #F5F2E8' }}>
        <button onClick={(e) => { e.stopPropagation(); onUser?.(); }} className="flex items-center gap-2 active:opacity-70" style={{ cursor: onUser ? 'pointer' : 'default' }}>
          <Avatar name={item.userName} size={20} />
          <span className="text-[11px] font-semibold text-[#999]">{item.userName}</span>
          <span className="text-[11px] text-[#CCC]">{timeAgo(item.createdAt)}</span>
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-[#CCC]">
          <Flag size={11} /><span>在庫報告</span>
        </div>
      </div>
    </div>
  );
}
