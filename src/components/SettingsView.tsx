import React, { useRef } from 'react';
import { Settings, Shield, RefreshCw, Trash2, Download, Upload, Cpu, Radio, Layers, Clock, Zap } from 'lucide-react';
import type { SpooferConfig, SpoofMode } from '@/types/spoofer';

interface SettingsViewProps {
  config: SpooferConfig;
  onConfigChange: (updater: (prev: SpooferConfig) => SpooferConfig) => void;
  historyCount: number;
  onClearHistory: () => void;
  onExportHistory?: () => void;
  onImportHistory?: (jsonText: string) => Promise<number>;
  isDiscordRunning: boolean | null;
  onRecheckDiscord: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onConfigChange,
  historyCount,
  onClearHistory,
  onExportHistory,
  onImportHistory,
  isDiscordRunning,
  onRecheckDiscord,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportHistory) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          await onImportHistory(text);
        } catch {
          // Handled in hook
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[#161722] border border-[#232535] rounded-xl p-5 gap-5 overflow-y-auto shadow-sm">
      <div className="pb-3 border-b border-white/5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#5865F2]" />
          Настройки приложения
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Параметры гибридной эмуляции, безопасности, умных кулдаунов и истории
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Section 1: Spoof Mode Selector */}
        <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#5865F2]" />
              Режим эмуляции (Spoof Mode)
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Выберите способ активации игр для профиля Discord
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Mode 1: Hybrid */}
            <button
              type="button"
              onClick={() =>
                onConfigChange((prev) => ({ ...prev, spoof_mode: 'hybrid' as SpoofMode }))
              }
              className={`p-2.5 rounded-lg border text-left transition-all ${
                config.spoof_mode === 'hybrid'
                  ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                  : 'bg-[#242636] border-white/5 text-neutral-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Гибридный
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">24k+</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Процессы для игр с .exe + нативный IPC для консольных и SDK игр.
              </div>
            </button>

            {/* Mode 2: Process Only */}
            <button
              type="button"
              onClick={() =>
                onConfigChange((prev) => ({ ...prev, spoof_mode: 'process_only' as SpoofMode }))
              }
              className={`p-2.5 rounded-lg border text-left transition-all ${
                config.spoof_mode === 'process_only'
                  ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-white'
                  : 'bg-[#242636] border-white/5 text-neutral-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  Процессы
                </span>
                <span className="text-[10px] font-mono text-blue-400 font-bold">~10.4k</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Только нативные процессы ОС (.exe на Windows, ELF на Linux).
              </div>
            </button>

            {/* Mode 3: RPC Only */}
            <button
              type="button"
              onClick={() =>
                onConfigChange((prev) => ({ ...prev, spoof_mode: 'rpc_only' as SpoofMode }))
              }
              className={`p-2.5 rounded-lg border text-left transition-all ${
                config.spoof_mode === 'rpc_only'
                  ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-white'
                  : 'bg-[#242636] border-white/5 text-neutral-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-purple-400" />
                  Остальные (RPC)
                </span>
                <span className="text-[10px] font-mono text-purple-400 font-bold">~14.4k</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Только игры без локального исполняемого файла (консоли, мобильные, SDK).
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Smart Cooldown & Rate Limit Protection */}
        <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Смарт-кулдауны (Защита от рейтлимитов Discord)
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Автоматически делает органическую паузу между батчами при длительной накрутке.
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.cooldown_enabled ?? true}
              onChange={(e) =>
                onConfigChange((prev) => ({
                  ...prev,
                  cooldown_enabled: e.target.checked,
                }))
              }
              className="w-5 h-5 rounded bg-[#242636] border-white/20 text-[#5865F2] focus:ring-[#5865F2] cursor-pointer"
            />
          </div>

          {config.cooldown_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Частота паузы:</span>
                  <span className="font-mono text-white">Каждые {config.cooldown_every_n_batches || 25} батчей</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={config.cooldown_every_n_batches || 25}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      cooldown_every_n_batches: Number(e.target.value),
                    }))
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#242636] accent-[#5865F2]"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span>Длительность паузы:</span>
                  <span className="font-mono text-emerald-400">{config.cooldown_seconds || 30} сек</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={config.cooldown_seconds || 30}
                  onChange={(e) =>
                    onConfigChange((prev) => ({
                      ...prev,
                      cooldown_seconds: Number(e.target.value),
                    }))
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#242636] accent-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Organic Jitter Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#1b1c28] border border-white/5">
          <div className="pr-4">
            <div className="text-xs font-semibold text-white">
              Органический джиттер задержки (+1..3 сек)
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Случайное небольшое отклонение времени удержания батча, чтобы поведение выглядело максимально естественно для серверов Discord.
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.jitter_enabled ?? false}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                jitter_enabled: e.target.checked,
              }))
            }
            className="w-5 h-5 rounded bg-[#242636] border-white/20 text-[#5865F2] focus:ring-[#5865F2] cursor-pointer"
          />
        </div>

        {/* Section 4: Skip already spoofed */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#1b1c28] border border-white/5">
          <div className="pr-4">
            <div className="text-xs font-semibold text-white">
              Пропускать ранее запущенные игры
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Исключает повторный запуск игр, которые уже были успешно эмулированы в предыдущих сессиях.
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.skip_previously_spoofed ?? true}
            onChange={(e) =>
              onConfigChange((prev) => ({
                ...prev,
                skip_previously_spoofed: e.target.checked,
              }))
            }
            className="w-5 h-5 rounded bg-[#242636] border-white/20 text-[#5865F2] focus:ring-[#5865F2] cursor-pointer"
          />
        </div>

        {/* Section 5: Discord Client Status Card */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#1b1c28] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#242636] text-[#5865F2]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                Статус клиента Discord
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {isDiscordRunning ? (
                  <span className="text-emerald-400 font-medium">
                    Десктопный клиент Discord активен
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    Discord не запущен. Запустите Discord для учета игр.
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRecheckDiscord}
            className="p-2 rounded-lg bg-[#242636] hover:bg-white/5 text-neutral-300 text-xs flex items-center gap-1.5 transition-all"
            title="Проверить статус"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Проверить</span>
          </button>
        </div>

        {/* Section 6: Backup & History Management */}
        <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">
                Управление историей эмуляций
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Сохранено в кэше: <span className="text-white font-mono font-bold">{historyCount}</span> уникальных игр.
              </div>
            </div>
            <button
              type="button"
              onClick={onClearHistory}
              disabled={historyCount === 0}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1.5 border border-red-500/20 disabled:opacity-40 transition-all"
              title="Очистить историю"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onExportHistory}
              disabled={historyCount === 0}
              className="flex-1 p-2 rounded-lg bg-[#242636] hover:bg-white/5 text-neutral-200 text-xs flex items-center justify-center gap-1.5 border border-white/10 disabled:opacity-40 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Экспорт бэкапа (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 p-2 rounded-lg bg-[#242636] hover:bg-white/5 text-neutral-200 text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Импорт бэкапа (JSON)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
