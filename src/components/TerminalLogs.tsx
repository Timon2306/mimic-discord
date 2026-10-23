import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDown } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ScrollArea } from './ui/ScrollArea';
import type { SpooferLogEvent } from '@/types/spoofer';

interface TerminalLogsProps {
  logs: SpooferLogEvent[];
  onClear: () => void;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs, onClear }) => {
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const getLevelColor = (level: SpooferLogEvent['level']) => {
    switch (level) {
      case 'success':
        return 'text-emerald-400';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-discord-red font-semibold';
      case 'info':
      default:
        return 'text-indigo-300';
    }
  };

  const getLevelBadge = (level: SpooferLogEvent['level']) => {
    switch (level) {
      case 'success':
        return 'OK';
      case 'warn':
        return 'WARN';
      case 'error':
        return 'ERR';
      case 'info':
      default:
        return 'INFO';
    }
  };

  return (
    <Card className="border-white/5 bg-surface-200/70 p-4 space-y-3 flex flex-col h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Live Execution Logs
          </h2>
          <span className="text-[11px] font-mono text-neutral-500">
            ({logs.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center text-[10px] font-mono bg-surface-100 rounded-md p-0.5 border border-border">
            {(['all', 'info', 'success', 'warn', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-0.5 rounded transition-all uppercase ${
                  filterLevel === lvl
                    ? 'bg-surface-50 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Auto Scroll Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`w-7 h-7 ${autoScroll ? 'text-discord-light bg-surface-100' : 'text-neutral-500'}`}
            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>

          {/* Clear Logs */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="w-7 h-7 text-neutral-400 hover:text-discord-red"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Logs Viewport */}
      <ScrollArea
        viewportRef={scrollViewportRef}
        className="flex-1 bg-surface-300/80 rounded-lg p-2.5 font-mono text-[11px] border border-border/80"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
            No log entries matching filter
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div key={log.id} className="leading-relaxed flex items-start gap-2 break-all">
                <span className="text-neutral-500 flex-shrink-0 select-none">
                  [{log.timestamp}]
                </span>
                <span
                  className={`flex-shrink-0 font-semibold select-none ${getLevelColor(
                    log.level
                  )}`}
                >
                  [{getLevelBadge(log.level)}]
                </span>
                <span className="text-neutral-300 flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
