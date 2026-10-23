import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  indicatorColor?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  indicatorColor,
  ...props
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-surface-100', className)}
      {...props}
    >
      <div
        className={cn(
          'h-full w-full flex-1 transition-all duration-300 ease-out rounded-full bg-gradient-to-r from-discord via-indigo-500 to-discord-light',
          indicatorColor
        )}
        style={{ transform: `translateX(-${100 - clampedValue}%)` }}
      />
    </div>
  );
};
