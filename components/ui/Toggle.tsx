'use client';

type ToggleSize = 'md' | 'sm' | 'xs' | 'xsm' | 'xxs';

const DIMS: Record<ToggleSize, { w: number; h: number; knob: number; pad: number }> = {
  md: { w: 51, h: 31, knob: 27, pad: 2 },
  sm: { w: 44, h: 26, knob: 20, pad: 3 },
  xs: { w: 36, h: 22, knob: 18, pad: 2 },
  xsm: { w: 32, h: 20, knob: 16, pad: 2 },
  xxs: { w: 28, h: 17, knob: 13, pad: 2 },
};

export function Toggle({
  on,
  onClick,
  color = '#34C759',
  offColor = '#E5E5EA',
  size = 'md',
  disabled = false,
  ariaLabel,
  title,
}: {
  on: boolean;
  onClick: () => void;
  color?: string;
  offColor?: string;
  size?: ToggleSize;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}) {
  const d = DIMS[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative', width: d.w, height: d.h, borderRadius: 999, border: 'none', flexShrink: 0,
        background: on ? color : offColor,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s', verticalAlign: 'middle',
      }}
    >
      <span
        className="toggle-knob"
        style={{
          position: 'absolute', top: d.pad, left: on ? d.w - d.knob - d.pad : d.pad,
          width: d.knob, height: d.knob, borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
