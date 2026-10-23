import React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  disabled = false,
  onChange,
  className,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-neutral-300">{label}</span>
        <span className="font-mono font-semibold text-discord-light bg-surface-100 px-2 py-0.5 rounded border border-border">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'w-full h-2 rounded-lg appearance-none cursor-pointer bg-surface-100 accent-discord disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-1 focus:ring-discord/50'
          )}
          style={{
            background: `linear-gradient(to right, #5865F2 0%, #6366f1 ${percentage}%, #1d1f2b ${percentage}%, #1d1f2b 100%)`,
          }}
        />
      </div>
    </div>
  );
};
