import React, { useState, useEffect } from 'react';
import { Sidebar, type ActiveTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { DatabaseView } from '@/components/DatabaseView';
import { ConsoleView } from '@/components/ConsoleView';
import { SettingsView } from '@/components/SettingsView';
import { useDiscordStatus } from '@/hooks/useDiscordStatus';
import { useSpooferEvents } from '@/hooks/useSpooferEvents';
import type { SpooferConfig } from '@/types/spoofer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [config, setConfig] = useState<SpooferConfig>({
    limit: null,
    batch_size: 8,
    hold_duration_secs: 15,
    skip_previously_spoofed: true,
  });

  const {
    isRunning: isDiscordRunning,
    refetch: recheckDiscord,
  } = useDiscordStatus();

  const {
    status,
    errorMessage,
    tickData,
    logs,
    totalDatabaseGames,
    historyCount,
    isFetchingDatabase,
    actions,
  } = useSpooferEvents();

  // Load database on start if empty
  useEffect(() => {
    actions.fetchGames();
  }, []);

  const handleStart = () => {
    actions.start(config);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0e14] text-foreground select-none font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDiscordRunning={isDiscordRunning}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden min-w-0 bg-[#0e0f16]">
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              status={status}
              tickData={tickData}
              totalAvailableGames={totalDatabaseGames}
              historyCount={historyCount}
              logs={logs}
              config={config}
              onConfigChange={setConfig}
              onStart={handleStart}
              onPause={actions.pause}
              onResume={actions.resume}
              onStop={actions.stop}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseView
              onRefresh={actions.fetchGames}
              isFetching={isFetchingDatabase}
              historyCount={historyCount}
            />
          )}

          {activeTab === 'console' && (
            <ConsoleView logs={logs} onClear={actions.clearLogs} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={config}
              onConfigChange={setConfig}
              historyCount={historyCount}
              onClearHistory={actions.clearHistory}
              isDiscordRunning={isDiscordRunning}
              onRecheckDiscord={recheckDiscord}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
