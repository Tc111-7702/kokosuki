'use client';

/** home/search の py-4 相当：検索バー↔区切り線↔タグの上下余白 */
export const SEARCH_TAGS_DIVIDER_GAP = 16;

export function SearchTagsDivider({ bleed = 0 }: { bleed?: number }) {
  return (
    <div style={{
      marginLeft: -bleed,
      marginRight: -bleed,
      marginTop: SEARCH_TAGS_DIVIDER_GAP,
      marginBottom: SEARCH_TAGS_DIVIDER_GAP,
      borderTop: '1.5px solid #EDE9D8',
    }} />
  );
}

// 人気IPタグ（home/search・投稿フォーム共通）
export function PopularIpTagList({ ips, onIpClick, largeText = false, marginTop = 0, marginBottom = 0 }: {
  ips: string[];
  onIpClick: (ip: string) => void;
  largeText?: boolean;
  marginTop?: number;
  marginBottom?: number;
}) {
  if (ips.length === 0) return null;

  return (
    <div style={{ marginTop, marginBottom }}>
      <p style={{ fontSize: largeText ? 12 : 11, color: '#AAA', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>人気のIP</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {ips.map(ip => (
          <button
            key={ip}
            type="button"
            onMouseDown={e => { e.preventDefault(); onIpClick(ip); }}
            style={{
              padding: '5px 13px', borderRadius: 99, fontSize: largeText ? 14 : 13, fontWeight: 600,
              border: '1.5px solid #EDE9D8', background: 'white', color: '#555',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {ip}
          </button>
        ))}
      </div>
    </div>
  );
}
