'use client';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  variant?: 'use' | 'mood' | 'neutral';
}

const variantStyles = {
  use: {
    base: 'bg-[#F0EEFF] text-[#5B4FE8]',
    selected: 'bg-[#5B4FE8] text-white',
  },
  mood: {
    base: 'bg-[#EFFAF3] text-[#2D8A4E]',
    selected: 'bg-[#2D8A4E] text-white',
  },
  neutral: {
    base: 'bg-[#F2F1EF] text-[#555]',
    selected: 'bg-[#111] text-white',
  },
};

export function TagChip({
  label,
  selected = false,
  onClick,
  size = 'md',
  variant = 'neutral',
}: TagChipProps) {
  const styles = variantStyles[variant];
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-medium transition-all ${sizeClass} ${
        selected ? styles.selected : styles.base
      } ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
    >
      {label}
    </button>
  );
}
