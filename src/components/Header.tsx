import React from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, Sparkles, Database } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface HeaderProps {
  isDiscordRunning: boolean | null;
  isCheckingDiscord: boolean;
  onRefreshDiscord: () => void;
  totalGames: number;
  isFetchingGames: boolean;
  onFetchGames: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDiscordRunning,
  isCheckingDiscord,
  onRefreshDiscord,
  totalGames,
  isFetchingGames,
  onFetchGames,
}) => {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-4 select-none">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-surface-100 border border-discord/30 text-discord-light shadow-md">
          <Sparkles className="w-5 h-5 text-discord-light" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              mimic<span className="text-neutral-400 text-sm font-sans font-normal ml-1">v1.0</span>
            </h1>
            <Badge variant="default" className="text-[10px] uppercase font-mono py-0 text-discord-light border-discord/30">
              discord game spoofer
            </Badge>
          </div>
          <p className="text-xs text-neutral-400">
            Automated profile badge counter booster
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Discord Client Status */}
        <div
          onClick={onRefreshDiscord}
          className="cursor-pointer group"
          title="Click to recheck Discord status"
        >
          {isDiscordRunning ? (
            <Badge variant="success" className="py-1 px-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Discord Running</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="py-1 px-3">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{isCheckingDiscord ? 'Checking Discord...' : 'Discord Not Detected'}</span>
            </Badge>
          )}
        </div>

        {/* Database Sync Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFetchGames}
          disabled={isFetchingGames}
          className="text-xs h-8 border-border bg-surface-200/50 hover:bg-surface-100"
        >
          <Database className="w-3.5 h-3.5 text-discord-light" />
          <span>
            {totalGames > 0 ? `${totalGames.toLocaleString()} Games` : 'Load DB'}
          </span>
          <RefreshCw
            className={`w-3 h-3 text-neutral-400 ${isFetchingGames ? 'animate-spin text-discord-light' : ''}`}
          />
        </Button>
      </div>
    </header>
  );
};
