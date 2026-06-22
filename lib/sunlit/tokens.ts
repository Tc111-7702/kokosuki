export const COLORS = {
  cream: '#F7F5EE',
  mist: '#EDF3EE',
  mistDark: '#DDE8DF',
  sage: '#5A7A5C',
  sageLight: '#EAF0EB',
  forest: '#3A5F3C',
  sun: '#E8D44D',
  sunLight: '#FEF9E3',
  charcoal: '#1C1C1A',
  ink: '#111111',
  line: '#E8E6DF',
  card: '#FFFFFF',
  cardAlt: '#FAFAF7',
  muted: '#999999',
  mutedLight: '#BBBBBB',
} as const;

export type StatusLevel = {
  level: 1 | 2 | 3 | 4;
  title: string;
  emoji: string;
  desc: string;
  color: string;
};

export function computeStatus(postCount: number): StatusLevel {
  if (postCount >= 20) return { level: 4, title: '案内人', emoji: '🧭', desc: 'エリアの語り部', color: COLORS.sun };
  if (postCount >= 10) return { level: 3, title: '開拓者', emoji: '🗺️', desc: '新しい場所を切り拓く', color: COLORS.sage };
  if (postCount >= 4) return { level: 2, title: '記録者', emoji: '📖', desc: '記録を積み重ねている', color: COLORS.forest };
  return { level: 1, title: '散歩者', emoji: '🚶', desc: 'まだ歩き始め', color: COLORS.muted };
}
