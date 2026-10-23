import React from 'react';
import { Gamepad2 } from 'lucide-react';
import type { SpooferStatus, SpooferTickEvent, SpooferLogEvent, SpooferConfig } from '@/types/spoofer';

interface DashboardViewProps {
  status: SpooferStatus;
  tickData: SpooferTickEvent;
  totalAvailableGames: number;
  processGamesCount?: number;
  rpcGamesCount?: number;
  historyCount: number;
  historyProcessCount?: number;
  historyRpcCount?: number;
  logs: SpooferLogEvent[];
  config: SpooferConfig;
  onConfigChange: (updater: (prev: SpooferConfig) => SpooferConfig) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  status,
  tickData,
  totalAvailableGames,
  processGamesCount,
  rpcGamesCount,
  historyCount,
  historyProcessCount,
  historyRpcCount,
  logs,
  config,
  onConfigChange,
  onStart,
  onPause,
  onResume,
  onStop,
}) => {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'finished' || status === 'error';

  const currentModeTotal = React.useMemo(() => {
    if (config.spoof_mode === 'process_only') return processGamesCount || 0;
    if (config.spoof_mode === 'rpc_only') return rpcGamesCount || 0;
    return totalAvailableGames;
  }, [config.spoof_mode, processGamesCount, rpcGamesCount, totalAvailableGames]);

  const currentModeHistory = React.useMemo(() => {
    if (config.spoof_mode === 'process_only') return historyProcessCount ?? 0;
    if (config.spoof_mode === 'rpc_only') return historyRpcCount ?? 0;
    return historyCount ?? 0;
  }, [config.spoof_mode, historyProcessCount, historyRpcCount, historyCount]);

  const idleGamesRemaining = React.useMemo(() => {
    if (!config.skip_previously_spoofed) return currentModeTotal;
    return Math.max(0, currentModeTotal - currentModeHistory);
  }, [currentModeTotal, config.skip_previously_spoofed, currentModeHistory]);

  const idleEstimatedSecs = React.useMemo(() => {
    if (idleGamesRemaining <= 0 || config.batch_size <= 0) return 0;
    const batches = Math.ceil(idleGamesRemaining / config.batch_size);
    return batches * config.hold_duration_secs;
  }, [idleGamesRemaining, config.batch_size, config.hold_duration_secs]);

  const totalTarget = (isRunning || isPaused) && tickData.total_games > 0
    ? tickData.total_games
    : (config.skip_previously_spoofed ? idleGamesRemaining : currentModeTotal);
  const currentDone = tickData.current_index;
  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((currentDone / totalTarget) * 100)) : 0;

  // Format ETA to Russian string like "~18 минут" or "< 1 минуты"
  const formatEtaRussian = (seconds: number): string => {
    if (isNaN(seconds) || seconds <= 0 || !isFinite(seconds)) return '~0 минут';
    const mins = Math.ceil(seconds / 60);
    if (mins < 60) {
      return `~${mins} минут`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `~${hours} ч ${remMins} мин`;
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden pr-1">
      {/* 1. TOP STATUS CARD */}
      <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 shadow-sm flex flex-col gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-white">СТАТУС:</span>
          {isRunning && (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              АКТИВНО{' '}
              <span className="text-xs font-normal text-neutral-400">
                (Запущено {tickData.active_batch.length} процессов)
              </span>
            </span>
          )}
          {isPaused && (
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              ПАУЗА{' '}
              <span className="text-xs font-normal text-neutral-400">
                (Процессы приостановлены)
              </span>
            </span>
          )}
          {isIdle && (
            <span className="text-neutral-400 font-bold flex items-center gap-1.5">
              ОЖИДАНИЕ{' '}
              <span className="text-xs font-normal text-neutral-500">
                (Нажмите «СТАРТ» для запуска)
              </span>
            </span>
          )}
        </div>

        {/* Big Progress Bar Pill */}
        <div className="relative w-full h-8 rounded-full bg-[#1b1c28] border border-white/5 overflow-hidden flex items-center justify-center">
          <div
            className="absolute left-0 top-0 bottom-0 bg-[#5865F2] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
          <span className="relative z-10 font-mono text-xs font-bold text-white drop-shadow">
            {progressPercent}%
          </span>
        </div>

        {/* Subtitle */}
        <div className="text-center text-xs text-neutral-400">
          {isRunning || isPaused ? (
            <>
              {currentDone} из {totalTarget} игр эмулировано
              {currentModeHistory > 0 && ` (${currentModeHistory} в истории)`}
            </>
          ) : (
            <>
              {currentModeTotal} игр в категории ({idleGamesRemaining} к запуску
              {currentModeHistory > 0 && config.skip_previously_spoofed && `, ${currentModeHistory} уже пройдено`})
            </>
          )}
        </div>
      </div>

      {/* 2. MIDDLE TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Left Card: Управление батчами */}
        <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 flex flex-col justify-between shadow-sm min-h-0 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Управление батчами
              </h2>
            </div>

            {/* Selector: Источник / Тип игр */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300">Какие игры запускать:</span>
                <span className="font-mono text-[10px] text-discord-light font-semibold">
                  {config.spoof_mode === 'rpc_only'
                    ? 'Остальные (RPC / Консоли)'
                    : config.spoof_mode === 'process_only'
                    ? 'Только процессы (ОС .exe)'
                    : 'Все игры (Гибридный режим)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  disabled={!isIdle}
                  onClick={() => onConfigChange((prev) => ({ ...prev, spoof_mode: 'hybrid' }))}
                  className={`py-1.5 px-1.5 text-[11px] rounded border transition-all text-center flex flex-col items-center justify-center ${
                    config.spoof_mode === 'hybrid'
                      ? 'bg-[#5865F2] text-white border-[#5865F2] font-semibold shadow-sm'
                      : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
                  }`}
                  title="Все доступные игры (процессы + RPC)"
                >
                  <span>Все {totalAvailableGames > 0 ? `(${totalAvailableGames})` : ''}</span>
                  <span className="text-[9px] opacity-75 font-mono">Гибрид</span>
                </button>

                <button
                  type="button"
                  disabled={!isIdle}
                  onClick={() => onConfigChange((prev) => ({ ...prev, spoof_mode: 'rpc_only' }))}
                  className={`py-1.5 px-1.5 text-[11px] rounded border transition-all text-center flex flex-col items-center justify-center ${
                    config.spoof_mode === 'rpc_only'
                      ? 'bg-[#8b5cf6] text-white border-[#8b5cf6] font-semibold shadow-sm'
                      : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
                  }`}
                  title="Остальные игры без локального файла (консольные, мобильные, SDK)"
                >
                  <span className="text-[#e9d5ff]">Остальные {rpcGamesCount && rpcGamesCount > 0 ? `(${rpcGamesCount})` : '(RPC)'}</span>
                  <span className="text-[9px] opacity-75 font-mono">Консоли / SDK</span>
                </button>

                <button
                  type="button"
                  disabled={!isIdle}
                  onClick={() => onConfigChange((prev) => ({ ...prev, spoof_mode: 'process_only' }))}
                  className={`py-1.5 px-1.5 text-[11px] rounded border transition-all text-center flex flex-col items-center justify-center ${
                    config.spoof_mode === 'process_only'
                      ? 'bg-[#3b82f6] text-white border-[#3b82f6] font-semibold shadow-sm'
                      : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
                  }`}
                  title="Только классические процессы (.exe)"
                >
                  <span className="text-[#bfdbfe]">Только ОС {processGamesCount && processGamesCount > 0 ? `(${processGamesCount})` : '(.exe)'}</span>
                  <span className="text-[9px] opacity-75 font-mono">Процессы</span>
                </button>
              </div>
            </div>

            {/* Slider 1: Размер батча */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300">
                  Параллельных процессов:
                </span>
                <span className="font-mono font-bold text-[#5865F2]">
                  {config.batch_size}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={config.batch_size}
                disabled={!isIdle}
                onChange={(e) =>
                  onConfigChange((prev) => ({
                    ...prev,
                    batch_size: Number(e.target.value),
                  }))
                }
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#242636] accent-[#5865F2] disabled:opacity-50"
              />
            </div>

            {/* Slider 2: Время удержания */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300">
                  Время удержания:
                </span>
                <span className="font-mono font-bold text-[#22c55e]">
                  {config.hold_duration_secs >= 60
                    ? `${(config.hold_duration_secs / 60).toFixed(1)} мин (${config.hold_duration_secs}с)`
                    : `${config.hold_duration_secs} сек`}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[
                  { label: '15с (Турбо)', val: 15 },
                  { label: '1 мин', val: 60 },
                  { label: '5 мин', val: 300 },
                  { label: '1 час (Фарм)', val: 3600 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    disabled={!isIdle}
                    onClick={() =>
                      onConfigChange((prev) => ({
                        ...prev,
                        hold_duration_secs: preset.val,
                      }))
                    }
                    className={`py-1 text-[10px] font-mono rounded border transition-all ${
                      config.hold_duration_secs === preset.val
                        ? 'bg-[#5865F2] text-white border-[#5865F2] font-semibold'
                        : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={5}
                max={3600}
                step={config.hold_duration_secs < 60 ? 5 : 60}
                value={config.hold_duration_secs}
                disabled={!isIdle}
                onChange={(e) =>
                  onConfigChange((prev) => ({
                    ...prev,
                    hold_duration_secs: Number(e.target.value),
                  }))
                }
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#242636] accent-[#5865F2] disabled:opacity-50 mt-1"
              />
            </div>

            {/* Buttons Row */}
            <div className="flex items-center gap-2.5 pt-1">
              {isIdle && (
                <button
                  type="button"
                  onClick={onStart}
                  className="flex-1 py-2 px-4 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-discord/20 active:scale-[0.98]"
                >
                  Старт
                </button>
              )}

              {isRunning && (
                <button
                  type="button"
                  onClick={onPause}
                  className="flex-1 py-2 px-4 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-discord/20 active:scale-[0.98]"
                >
                  Пауза
                </button>
              )}

              {isPaused && (
                <button
                  type="button"
                  onClick={onResume}
                  className="flex-1 py-2 px-4 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                >
                  Продолжить
                </button>
              )}

              <button
                type="button"
                onClick={onStop}
                disabled={isIdle}
                className="flex-1 py-2 px-4 rounded-lg bg-[#3d181e] hover:bg-[#521e27] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Стоп
              </button>
            </div>
          </div>

          {/* Quick Stats below buttons */}
          <div className="pt-3 border-t border-white/5 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Успешно:</span>
              <span className="font-mono font-medium text-white">{currentDone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Ошибок:</span>
              <span className="font-mono font-medium text-white">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Оставшееся время:</span>
              <span className="font-mono font-medium text-neutral-300">
                {isRunning || isPaused
                  ? formatEtaRussian(tickData.estimated_remaining_secs)
                  : `${formatEtaRussian(idleEstimatedSecs)} (расчёт)`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Список запущенных фейковых процессов */}
        <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 flex flex-col shadow-sm min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-shrink-0">
            <h2 className="text-sm font-semibold text-white">
              Активные процессы
            </h2>
            <span className="text-[11px] font-mono text-neutral-400">
              {tickData.active_batch.length} шт.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-1.5 min-h-0">
            {tickData.active_batch.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 text-xs p-4">
                <Gamepad2 className="w-8 h-8 opacity-25 mb-1.5" />
                <span>Нет активных процессов</span>
                <span className="text-[10px] text-neutral-600 mt-0.5">
                  {isRunning ? 'Загрузка следующего батча...' : 'Нажмите «СТАРТ» для запуска'}
                </span>
              </div>
            ) : (
              tickData.active_batch.map((game, idx) => (
                <div
                  key={`${game.id}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#1a1c29] border border-white/5 text-xs hover:border-discord/30 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {/* Game Icon */}
                    {game.icon_hash ? (
                      <img
                        src={`https://cdn.discordapp.com/app-icons/${game.id}/${game.icon_hash}.png?size=32`}
                        alt=""
                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                        onError={(e) => {
                          // Fallback to svg on image load error
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-[#242738] flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="w-3 h-3 text-[#5865F2]" />
                      </div>
                    )}
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-white truncate mr-1.5">
                        {game.name}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 truncate">
                        {game.method === 'rpc' ? (
                          <span className="text-[#a78bfa] font-semibold bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-1 py-0.5 rounded text-[10px]">
                            RPC
                          </span>
                        ) : (
                          `(${game.executable ? game.executable.split(/[\\/]/).pop() : 'exe'})`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Green status indicator dot */}
                  <div className="flex items-center flex-shrink-0 pl-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM LOGS CONSOLE */}
      <div className="bg-[#101117] border border-[#1d1f2b] rounded-lg p-3 h-36 flex flex-col font-mono text-[11px] shadow-inner flex-shrink-0">
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-[#d1d5db]">
          {logs.length === 0 ? (
            <div className="text-neutral-500 italic">Ожидание событий...</div>
          ) : (
            logs.slice(-30).map((log) => (
              <div key={log.id} className="leading-snug truncate">
                <span className="text-neutral-500 mr-1.5">[{log.timestamp}]</span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-red-400'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : log.level === 'success'
                      ? 'text-emerald-400'
                      : 'text-neutral-300'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
