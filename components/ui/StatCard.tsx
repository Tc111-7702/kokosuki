'use client';

export function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '10px 12px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)', textAlign: 'center',
    }}>
      <p style={{ fontSize: 18, fontWeight: 900, margin: '0 0 2px', color: accent ?? '#1A1A1A' }}>{value}</p>
      <p style={{ fontSize: 10, color: '#AAA', fontWeight: 600, margin: 0, letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}
