import React from 'react';
import { Settings, Shield, RefreshCw, Trash2, Info } from 'lucide-react';
import type { SpooferConfig } from '@/types/spoofer';

interface SettingsViewProps {
  config: SpooferConfig;
  onConfigChange: (updater: (prev: SpooferConfig) => SpooferConfig) => void;
  historyCount: number;
  onClearHistory: () => void;
  isDiscordRunning: boolean | null;
  onRecheckDiscord: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onConfigChange,
  historyCount,
  onClearHistory,
  isDiscordRunning,
  onRecheckDiscord,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#161722] border border-[#232535] rounded-xl p-5 gap-5 overflow-y-auto shadow-sm">
      <div className="pb-3 border-b border-white/5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#5865F2]" />
          Настройки приложения
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Параметры безопасности, детекции и истории эмуляции
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Toggle 1: Skip already spoofed */}
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

        {/* Discord Client Status Card */}
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

        {/* Clear History Card */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#1b1c28] border border-white/5">
          <div>
            <div className="text-xs font-semibold text-white">
              Локальная история эмуляций
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              В кэше сохранено: <span className="text-white font-mono">{historyCount}</span> уникальных игр.
            </div>
          </div>
          <button
            type="button"
            onClick={onClearHistory}
            className="py-1.5 px-3 rounded-lg bg-[#3d181e] hover:bg-[#521e27] text-white text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Сбросить историю</span>
          </button>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#14151f] border border-white/5 text-[11px] text-neutral-400">
          <Info className="w-4 h-4 text-[#5865F2] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white">Безопасный принцип работы</span>
            <p>
              mimic не использует токены и не инжектится в Discord.
              Игры эмулируются через нативные процессы с флагом <code>CREATE_NO_WINDOW</code>,
              а официальный клиент Discord сам распознает их через свои внутренние интервалы сканирования ОС.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
