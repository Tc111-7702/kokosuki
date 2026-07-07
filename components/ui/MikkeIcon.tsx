export function MikkeIcon({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="24" cy="26" r="17" fill="#F2B800"/>
      <circle cx="76" cy="26" r="17" fill="#F2B800"/>
      <circle cx="24" cy="26" r="10" fill="#E0A500"/>
      <circle cx="76" cy="26" r="10" fill="#E0A500"/>
      <circle cx="50" cy="57" r="41" fill="#F2B800"/>
      <circle cx="35" cy="49" r="7"  fill="#1a1a1a"/>
      <circle cx="65" cy="49" r="7"  fill="#1a1a1a"/>
      <circle cx="38" cy="46" r="2.5" fill="white"/>
      <circle cx="68" cy="46" r="2.5" fill="white"/>
      <ellipse cx="22" cy="66" rx="13" ry="9" fill="#FF9EB5" opacity="0.75"/>
      <ellipse cx="78" cy="66" rx="13" ry="9" fill="#FF9EB5" opacity="0.75"/>
      <ellipse cx="50" cy="60" rx="6"  ry="5" fill="#1a1a1a"/>
      <path d="M 39 72 Q 50 83 61 72" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
