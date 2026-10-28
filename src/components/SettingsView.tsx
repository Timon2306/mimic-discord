import React, { useRef, useState } from 'react';
import {
  Settings,
  Shield,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Cpu,
  Radio,
  Layers,
  Clock,
  Zap,
  Languages,
  FlaskConical,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
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
  const { t, language, setLanguage, formatNumber } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBetaWarningOpen, setIsBetaWarningOpen] = useState(false);

  const isBetaEnabled = Boolean(config.beta_enabled);

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

  const confirmBeta = () => {
    onConfigChange((prev) => ({ ...prev, beta_enabled: true }));
    setIsBetaWarningOpen(false);
  };

  const disableBeta = () => {
    onConfigChange((prev) => ({
      ...prev,
      beta_enabled: false,
      spoof_mode: 'process_only' as SpoofMode,
    }));
    setIsBetaWarningOpen(false);
  };

  const modeCards: Array<{
    id: SpoofMode;
    title: string;
    description: string;
    badge: string;
    icon: React.ReactNode;
    activeClass: string;
  }> = [
    {
      id: 'hybrid',
      title: t('settings.modeHybrid'),
      description: t('settings.modeHybridDesc'),
      badge: '24k+',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      activeClass: 'bg-[#5865F2]/20 border-[#5865F2] text-white',
    },
    {
      id: 'process_only',
      title: t('settings.modeProcess'),
      description: t('settings.modeProcessDesc'),
      badge: '~10.4k',
      icon: <Cpu className="w-3.5 h-3.5 text-blue-400" />,
      activeClass: 'bg-[#3b82f6]/20 border-[#3b82f6] text-white',
    },
    {
      id: 'rpc_only',
      title: t('settings.modeRpc'),
      description: t('settings.modeRpcDesc'),
      badge: '~14.4k',
      icon: <Radio className="w-3.5 h-3.5 text-purple-400" />,
      activeClass: 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-white',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#161722] border border-[#232535] rounded-xl p-5 gap-5 overflow-y-auto shadow-sm">
      <div className="pb-3 border-b border-white/5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#5865F2]" />
          {t('settings.title')}
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Section 0: Language */}
        <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-[#5865F2]" />
              {t('settings.language')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {t('settings.languageDesc')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'en' as const, label: t('settings.languageEn'), hint: 'English' },
              { id: 'ru' as const, label: t('settings.languageRu'), hint: 'Русский' },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLanguage(option.id)}
                className={`px-3 py-2 rounded-lg border text-left transition-all ${
                  language === option.id
                    ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                    : 'bg-[#242636] border-white/5 text-neutral-300 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-semibold">{option.label}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  {option.id.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Beta (unlocks non-native categories) */}
        <div
          className={`p-3.5 rounded-lg border space-y-3 ${
            isBetaEnabled
              ? 'bg-amber-400/[0.06] border-amber-400/30'
              : 'bg-[#1b1c28] border-white/5'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                {t('settings.betaTitle')}
                <span className="text-[9px] font-mono font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/25">
                  BETA
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {t('settings.betaDesc')}
              </div>
            </div>

            <input
              type="checkbox"
              checked={isBetaEnabled}
              onChange={() => {
                if (isBetaEnabled) {
                  disableBeta();
                } else {
                  setIsBetaWarningOpen(true);
                }
              }}
              className="w-5 h-5 flex-shrink-0 rounded bg-[#242636] border-white/20 text-amber-400 focus:ring-amber-400 cursor-pointer"
            />
          </div>

          {isBetaEnabled ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] font-semibold text-amber-200">
                    {t('settings.betaOn')}
                  </div>
                  <div className="text-[10px] text-amber-200/70 mt-0.5">
                    {t('settings.betaWarningShort')}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-neutral-300 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span className="font-medium">{t('settings.modeTitle')}</span>
                  <span className="text-neutral-500">— {t('settings.modeDesc')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {modeCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() =>
                        onConfigChange((prev) => ({ ...prev, spoof_mode: card.id }))
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        config.spoof_mode === card.id
                          ? card.activeClass
                          : 'bg-[#242636] border-white/5 text-neutral-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5">
                          {card.icon}
                          {card.title}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {card.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {card.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : isBetaWarningOpen ? (
            <div className="rounded-lg border border-amber-400/40 bg-[#241f14] p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-amber-200">
                    {t('settings.betaWarningTitle')}
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-300 mt-1">
                    {t('settings.betaWarningBody')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmBeta}
                  className="flex-1 py-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-[11px] font-semibold text-amber-100 hover:bg-amber-400/30 transition-all"
                >
                  {t('settings.betaEnable')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBetaWarningOpen(false)}
                  className="flex-1 py-1.5 rounded-lg bg-[#242636] border border-white/10 text-[11px] text-neutral-300 hover:text-white transition-all"
                >
                  {t('settings.betaCancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-[#15161f] px-3 py-2">
              <Lock className="w-3.5 h-3.5 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-neutral-400">
                <span className="text-neutral-300">{t('settings.betaOffHint')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Smart Cooldown & Rate Limit Protection */}
        <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {t('settings.cooldown')}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {t('settings.cooldownDesc')}
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
                  <span>{t('settings.cooldownEvery')}</span>
                  <span className="font-mono text-white">
                    {t('settings.cooldownEveryValue', {
                      count: config.cooldown_every_n_batches || 25,
                    })}
                  </span>
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
                  <span>{t('settings.cooldownDuration')}</span>
                  <span className="font-mono text-emerald-400">
                    {t('settings.cooldownDurationValue', {
                      count: config.cooldown_seconds || 30,
                    })}
                  </span>
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
              {t('settings.jitter')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {t('settings.jitterDesc')}
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
              {t('settings.skip')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {t('settings.skipDesc')}
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
                {t('settings.discordStatus')}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {isDiscordRunning ? (
                  <span className="text-emerald-400 font-medium">
                    {t('settings.discordRunning')}
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    {t('settings.discordNotRunning')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRecheckDiscord}
            className="p-2 rounded-lg bg-[#242636] hover:bg-white/5 text-neutral-300 text-xs flex items-center gap-1.5 transition-all"
            title={t('settings.check')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('settings.check')}</span>
          </button>
        </div>

        {/* Section 6: Backup & History Management */}
        <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">
                {t('settings.historyTitle')}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {t('settings.historyCount', { count: formatNumber(historyCount) })}
              </div>
            </div>
            <button
              type="button"
              onClick={onClearHistory}
              disabled={historyCount === 0}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1.5 border border-red-500/20 disabled:opacity-40 transition-all"
              title={t('settings.clear')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('settings.clear')}</span>
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
              <span>{t('settings.export')}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 p-2 rounded-lg bg-[#242636] hover:bg-white/5 text-neutral-200 text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('settings.import')}</span>
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
