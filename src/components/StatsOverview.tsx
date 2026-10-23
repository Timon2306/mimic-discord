import React from 'react';
import { Layers, Activity, Clock, Zap } from 'lucide-react';
import { Card } from './ui/Card';
import { formatTime } from '@/lib/utils';
import type { SpooferTickEvent, SpooferStatus } from '@/types/spoofer';

interface StatsOverviewProps {
  tickData: SpooferTickEvent;
  totalAvailableGames: number;
  status: SpooferStatus;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  tickData,
  totalAvailableGames,
  status,
}) => {
  const targetTotal = tickData.total_games > 0 ? tickData.total_games : totalAvailableGames;
  const progressPercent =
    targetTotal > 0 ? Math.min(100, (tickData.current_index / targetTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Processed Games */}
      <Card className="flex flex-col justify-between border-white/5 bg-surface-200/60 p-3.5">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-medium">Processed</span>
          <Activity className="w-4 h-4 text-discord-light" />
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {tickData.current_index.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-neutral-400">
              / {targetTotal.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] font-mono text-discord-light mt-0.5">
            {progressPercent.toFixed(1)}% completed
          </div>
        </div>
      </Card>

      {/* 2. Active Processes */}
      <Card className="flex flex-col justify-between border-white/5 bg-surface-200/60 p-3.5">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-medium">Active Batch</span>
          <Layers className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {tickData.active_batch.length}
            </span>
            <span className="text-xs text-neutral-400">processes</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5 capitalize flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'running'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-neutral-500'
              }`}
            />
            {status}
          </div>
        </div>
      </Card>

      {/* 3. Estimated Remaining Time */}
      <Card className="flex flex-col justify-between border-white/5 bg-surface-200/60 p-3.5">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-medium">Estimated Time (ETA)</span>
          <Clock className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
            {status === 'running' || status === 'paused'
              ? formatTime(tickData.estimated_remaining_secs)
              : '--:--:--'}
          </div>
          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
            Elapsed: {formatTime(tickData.elapsed_secs)}
          </div>
        </div>
      </Card>

      {/* 4. Speed / Rate */}
      <Card className="flex flex-col justify-between border-white/5 bg-surface-200/60 p-3.5">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-xs font-medium">Processing Speed</span>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {tickData.games_per_minute > 0 ? tickData.games_per_minute.toFixed(0) : '0'}
            </span>
            <span className="text-xs text-neutral-400">games / min</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
            ~{((tickData.games_per_minute || 0) * 60).toFixed(0)} games/hr
          </div>
        </div>
      </Card>
    </div>
  );
};
