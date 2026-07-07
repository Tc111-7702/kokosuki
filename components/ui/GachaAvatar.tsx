'use client';

export function GachaAvatar({ imageUrl, gradientFrom, gradientTo, name, size = 40 }: {
  imageUrl: string | null; gradientFrom: string; gradientTo: string; name: string; size?: number;
}) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      {imageUrl && (
        <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}
