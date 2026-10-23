import React from 'react';
import { Progress } from './ui/Progress';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percent = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className="space-y-1.5 bg-surface-200/50 p-3 rounded-xl border border-white/5">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-neutral-300 flex items-center gap-2">
          <span>Overall Progress</span>
          {percent >= 100 && (
            <span className="text-[10px] text-emerald-400 font-mono font-semibold uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Completed
            </span>
          )}
        </span>
        <span className="font-mono font-semibold text-white">
          {percent.toFixed(2)}%
        </span>
      </div>
      <Progress value={percent} className="h-2.5" />
    </div>
  );
};
