import React from 'react';
import { Gamepad2, Terminal, Cpu } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type { ActiveGame, SpooferStatus } from '@/types/spoofer';

interface ActiveBatchMonitorProps {
  activeBatch: ActiveGame[];
  status: SpooferStatus;
}

export const ActiveBatchMonitor: React.FC<ActiveBatchMonitorProps> = ({
  activeBatch,
  status,
}) => {
  return (
    <Card className="border-white/5 bg-surface-200/70 p-4 space-y-3 flex flex-col h-[320px]">
      <div className="flex items-center justify-between pb-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-discord-light" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Active Batch Monitor
          </h2>
        </div>
        <Badge variant={status === 'running' ? 'success' : 'default'} className="text-[11px]">
          {activeBatch.length} Active Processes
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {activeBatch.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-500">
            <Cpu className="w-8 h-8 mb-2 opacity-30 text-neutral-400" />
            <p className="text-xs font-medium text-neutral-400">
              No processes currently running
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {status === 'running'
                ? 'Preparing next batch of executables...'
                : 'Click "Start Spoofing" to launch game processes'}
            </p>
          </div>
        ) : (
          activeBatch.map((game, idx) => (
            <div
              key={`${game.id}-${idx}`}
              className="group flex items-center justify-between p-2.5 rounded-lg bg-surface-100/80 border border-border hover:border-discord/30 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-50 text-discord-light flex-shrink-0">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white truncate group-hover:text-discord-light transition-colors">
                    {game.name}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-400 truncate">
                    {game.executable}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {game.pid && (
                  <span className="font-mono text-[10px] text-neutral-400 bg-surface-200 px-1.5 py-0.5 rounded border border-border">
                    PID {game.pid}
                  </span>
                )}
                <Badge variant="default" className="text-[10px] py-0 px-2 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
