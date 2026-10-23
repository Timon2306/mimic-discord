import React, { useState } from 'react';
import { Play, Pause, Square, Info } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import type { SpooferConfig, SpooferStatus } from '@/types/spoofer';

interface ControlPanelProps {
  status: SpooferStatus;
  totalAvailableGames: number;
  historyCount: number;
  onClearHistory: () => void;
  onStart: (config: SpooferConfig) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  totalAvailableGames,
  historyCount,
  onClearHistory,
  onStart,
  onPause,
  onResume,
  onStop,
}) => {
  const [limitPreset, setLimitPreset] = useState<number | 'all'>(25);
  const [batchSize, setBatchSize] = useState<number>(8);
  const [holdDurationSecs, setHoldDurationSecs] = useState<number>(15);
  const [skipPreviouslySpoofed, setSkipPreviouslySpoofed] = useState<boolean>(true);

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'finished' || status === 'error';

  const handleStart = () => {
    const limit = limitPreset === 'all' ? null : limitPreset;
    onStart({
      limit,
      batch_size: batchSize,
      hold_duration_secs: holdDurationSecs,
      skip_previously_spoofed: skipPreviouslySpoofed,
    });
  };

  const limitPresets: Array<{ label: string; value: number | 'all' }> = [
    { label: '1 игра (Тест)', value: 1 },
    { label: '5 игр (Уровень)', value: 5 },
    { label: '10 игр', value: 10 },
    { label: '25 игр', value: 25 },
    { label: 'Все игры', value: 'all' },
  ];

  return (
    <Card className="border-white/5 bg-surface-200/70 p-4 space-y-5">
      {/* Top Header: Controls Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Execution Controls
          </h2>
          <p className="text-xs text-neutral-400">
            Configure parallel batch size and duration
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isIdle && (
            <Button
              variant="primary"
              size="md"
              onClick={handleStart}
              className="bg-discord hover:bg-discord-hover text-white px-5 shadow-lg shadow-discord/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Spoofing</span>
            </Button>
          )}

          {isRunning && (
            <Button
              variant="warning"
              size="md"
              onClick={onPause}
              className="px-5 shadow-lg shadow-amber-500/20"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </Button>
          )}

          {isPaused && (
            <Button
              variant="primary"
              size="md"
              onClick={onResume}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 shadow-lg shadow-emerald-500/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </Button>
          )}

          <Button
            variant="danger"
            size="md"
            onClick={onStop}
            disabled={isIdle}
            className="px-4"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop</span>
          </Button>
        </div>
      </div>

      {/* Limit Presets Selector */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <label className="font-medium text-neutral-300">
            Target Games Count
          </label>
          <div className="flex items-center gap-3">
            {historyCount > 0 && (
              <span className="text-[11px] text-cyan-accent flex items-center gap-1 font-mono">
                <span>{historyCount.toLocaleString()} already spoofed</span>
                {isIdle && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-neutral-500 hover:text-discord-red underline ml-1"
                    title="Clear history"
                  >
                    reset
                  </button>
                )}
              </span>
            )}
            <span className="text-neutral-400 text-[11px]">
              {limitPreset === 'all'
                ? `All (${totalAvailableGames.toLocaleString()} games)`
                : `Selected: ${limitPreset.toLocaleString()} games`}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {limitPresets.map((preset) => {
            const isSelected = limitPreset === preset.value;
            return (
              <button
                key={String(preset.value)}
                type="button"
                disabled={!isIdle}
                onClick={() => setLimitPreset(preset.value)}
                className={`py-2 px-1 text-xs font-mono font-medium rounded-lg transition-all border text-center ${
                  isSelected
                    ? 'bg-discord text-white border-discord shadow-md shadow-discord/30 font-semibold'
                    : 'bg-surface-100 text-neutral-400 border-border hover:bg-surface-50 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skip Already Spoofed Checkbox */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-300/30 border border-border text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-300">
          <input
            type="checkbox"
            checked={skipPreviouslySpoofed}
            disabled={!isIdle}
            onChange={(e) => setSkipPreviouslySpoofed(e.target.checked)}
            className="w-4 h-4 rounded bg-surface-100 border-border text-discord focus:ring-discord/40 cursor-pointer"
          />
          <span className="font-medium">Skip previously spoofed games</span>
          <span className="text-[11px] text-neutral-500">
            (avoids repeating games across sessions)
          </span>
        </label>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
        {/* Batch Size Slider */}
        <div className="space-y-1.5 bg-surface-300/40 p-3 rounded-lg border border-border">
          <Slider
            label="Параллельных процессов (Множитель времени)"
            min={1}
            max={20}
            step={1}
            unit=" игр"
            value={batchSize}
            disabled={!isIdle}
            onChange={setBatchSize}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 pt-1">
            <Info className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span>⚡ Множитель: {batchSize} игр × 1 час = {batchSize} часов в значке времени!</span>
          </div>
        </div>

        {/* Hold Duration Slider & Presets */}
        <div className="space-y-2 bg-surface-300/40 p-3 rounded-lg border border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-300">Длительность сессии</span>
            <span className="font-mono text-cyan-accent font-semibold">
              {holdDurationSecs >= 60
                ? `${(holdDurationSecs / 60).toFixed(1)} мин (${holdDurationSecs} сек)`
                : `${holdDurationSecs} сек`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 py-1">
            <button
              type="button"
              disabled={!isIdle}
              onClick={() => setHoldDurationSecs(15)}
              className={`py-1 px-1 text-[11px] font-mono rounded border transition-all ${
                holdDurationSecs === 15
                  ? 'bg-discord text-white border-discord font-semibold'
                  : 'bg-surface-100 text-neutral-400 border-border hover:bg-surface-50'
              }`}
            >
              15с (Турбо)
            </button>
            <button
              type="button"
              disabled={!isIdle}
              onClick={() => setHoldDurationSecs(60)}
              className={`py-1 px-1 text-[11px] font-mono rounded border transition-all ${
                holdDurationSecs === 60
                  ? 'bg-discord text-white border-discord font-semibold'
                  : 'bg-surface-100 text-neutral-400 border-border hover:bg-surface-50'
              }`}
            >
              1 мин
            </button>
            <button
              type="button"
              disabled={!isIdle}
              onClick={() => setHoldDurationSecs(300)}
              className={`py-1 px-1 text-[11px] font-mono rounded border transition-all ${
                holdDurationSecs === 300
                  ? 'bg-discord text-white border-discord font-semibold'
                  : 'bg-surface-100 text-neutral-400 border-border hover:bg-surface-50'
              }`}
            >
              5 мин
            </button>
            <button
              type="button"
              disabled={!isIdle}
              onClick={() => setHoldDurationSecs(3600)}
              className={`py-1 px-1 text-[11px] font-mono rounded border transition-all ${
                holdDurationSecs === 3600
                  ? 'bg-discord text-white border-discord font-semibold'
                  : 'bg-surface-100 text-emerald-400 border-border hover:bg-surface-50'
              }`}
            >
              1 час
            </button>
          </div>

          <Slider
            label="Точная настройка"
            min={5}
            max={3600}
            step={holdDurationSecs < 60 ? 5 : 60}
            unit=" сек"
            value={holdDurationSecs}
            disabled={!isIdle}
            onChange={setHoldDurationSecs}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-0.5">
            <Info className="w-3 h-3 text-cyan-accent flex-shrink-0" />
            <span>15с для значка «Универсал», длинные сессии для фарма часов в «Время в играх».</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
