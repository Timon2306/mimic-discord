import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDown, Copy, Check } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { SpooferLogEvent } from '@/types/spoofer';

interface ConsoleViewProps {
  logs: SpooferLogEvent[];
  onClear: () => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, onClear }) => {
  const { t, formatNumber } = useI18n();
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#161722] border border-[#232535] rounded-xl p-4 gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#5865F2]" />
          <h2 className="text-sm font-semibold text-white">
            {t('console.title')}
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            {t('console.entries', { count: formatNumber(logs.length) })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              autoScroll
                ? 'bg-[#1b1c28] border-[#5865F2]/40 text-[#5865F2]'
                : 'bg-[#1b1c28] border-white/10 text-neutral-400'
            }`}
            title={t('console.autoscroll')}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">{t('console.autoscroll')}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-[#1b1c28] border border-white/10 text-neutral-400 hover:text-white text-xs flex items-center gap-1 transition-all"
            title={t('console.copyTitle')}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline text-[11px]">{t('console.copy')}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg bg-[#1b1c28] border border-white/10 text-neutral-400 hover:text-red-400 text-xs flex items-center gap-1 transition-all"
            title={t('console.clearTitle')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">{t('console.clear')}</span>
          </button>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={logContainerRef}
        className="flex-1 bg-[#101117] border border-[#1d1f2b] rounded-lg p-3 font-mono text-xs overflow-y-auto space-y-1 text-[#d1d5db]"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
            {t('console.empty')}
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2 break-all">
              <span className="text-neutral-500 select-none flex-shrink-0">
                [{log.timestamp}]
              </span>
              <span
                className={`flex-shrink-0 select-none uppercase font-semibold text-[10px] px-1 rounded ${
                  log.level === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : log.level === 'warn'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : log.level === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-[#5865F2]/10 text-indigo-300 border border-[#5865F2]/20'
                }`}
              >
                {log.level}
              </span>
              <span className="text-neutral-200">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
