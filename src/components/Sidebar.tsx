import React from 'react';
import { LayoutDashboard, Gamepad2, Terminal, Settings } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export type ActiveTab = 'dashboard' | 'database' | 'console' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDiscordRunning: boolean | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isDiscordRunning,
}) => {
  const { t } = useI18n();

  const navItems = [
    { id: 'dashboard' as const, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'database' as const, label: t('nav.database'), icon: Gamepad2 },
    { id: 'console' as const, label: t('nav.console'), icon: Terminal },
    { id: 'settings' as const, label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="w-56 bg-[#111218] flex flex-col justify-between p-4 border-r border-white/5 select-none flex-shrink-0">
      <div className="space-y-6">
        {/* App Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <img
            src="/mimic.png"
            alt="mimic"
            className="w-8 h-8 rounded-lg object-contain drop-shadow"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <span className="text-base font-bold text-white tracking-wide">
              mimic
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDiscordRunning ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-[10px] text-neutral-400 font-mono">
                {isDiscordRunning ? t('sidebar.discordOn') : t('sidebar.discordOff')}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1f212d] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#5865F2]' : 'text-neutral-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-2 text-[11px] text-neutral-500 font-mono border-t border-white/5 pt-3">
        v1.2.0 • mimic-discord
      </div>
    </aside>
  );
};
