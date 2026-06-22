const USER_COLORS = [
  '#5B4FE8', '#2D8A4E', '#C0392B', '#1A6E9E',
  '#8E44AD', '#D35400', '#27AE60', '#2980B9',
];

export function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
}
