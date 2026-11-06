import React, { useEffect, useMemo, useState } from 'react';
import { Search, Timer, Plus, X, Gamepad2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { tauriApi } from '@/lib/tauri';
import type { SpoofableGameItem, SpooferStatus, SpooferTickEvent } from '@/types/spoofer';

/** Same limit as the backend, which runs the whole farm as one batch. */
const MAX_FARM_GAMES = 20;
const MAX_SEARCH_RESULTS = 100;
const FARM_GAMES_STORAGE_KEY = 'mimic.farm_game_ids';

const FARM_DURATION_STORAGE_KEY = 'mimic.farm_duration_secs';

const DURATION_PRESETS: Array<number | null> = [null, 3600, 7200, 14400, 28800];

function readSavedDuration(): number | null {
  try {
    const saved = Number(window.localStorage.getItem(FARM_DURATION_STORAGE_KEY));
    return DURATION_PRESETS.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}

function writeSavedDuration(durationSecs: number | null): void {
  try {
    window.localStorage.setItem(FARM_DURATION_STORAGE_KEY, String(durationSecs ?? 0));
  } catch {
    // storage unavailable — the timer just falls back to "until stopped"
  }
}

function readSavedGameIds(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FARM_GAMES_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeSavedGameIds(ids: string[]): void {
  try {
    window.localStorage.setItem(FARM_GAMES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable — the selection just won't survive a restart
  }
}

function exeBasename(game: SpoofableGameItem): string | null {
  if (game.method !== 'process' || !game.rel_path) return null;
  return game.rel_path.split(/[\\/]/).pop()?.toLowerCase() || null;
}

function formatClock(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

interface FarmViewProps {
  status: SpooferStatus;
  tickData: SpooferTickEvent;
  isFarmRun: boolean;
  isBetaEnabled: boolean;
  excludeAdult: boolean;
  isFetching: boolean;
  onStart: (gameIds: string[], durationSecs: number | null) => void;
  onStop: () => void;
}

const GameIcon: React.FC<{ game: SpoofableGameItem }> = ({ game }) =>
  game.icon_hash ? (
    <img
      src={`https://cdn.discordapp.com/app-icons/${game.id}/${game.icon_hash}.png?size=32`}
      alt=""
      className="w-6 h-6 rounded object-cover flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  ) : (
    <div className="w-6 h-6 rounded bg-[#242738] flex items-center justify-center flex-shrink-0">
      <Gamepad2 className="w-3.5 h-3.5 text-[#5865F2]" />
    </div>
  );

export const FarmView: React.FC<FarmViewProps> = ({
  status,
  tickData,
  isFarmRun,
  isBetaEnabled,
  excludeAdult,
  isFetching,
  onStart,
  onStop,
}) => {
  const { t, formatNumber } = useI18n();
  const [games, setGames] = useState<SpoofableGameItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(readSavedGameIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [durationSecs, setDurationSecs] = useState<number | null>(readSavedDuration);

  const isIdle = status === 'idle' || status === 'finished' || status === 'error';
  const isFarming = !isIdle && isFarmRun;

  useEffect(() => {
    tauriApi
      .getGamesList()
      .then(setGames)
      .catch((err) => console.error('Failed to load games list:', err));
  }, [isFetching]);

  useEffect(() => {
    writeSavedGameIds(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    writeSavedDuration(durationSecs);
  }, [durationSecs]);

  // With beta off the backend only runs native games, so only those are offered.
  // 18+ games are hidden too when the settings checkbox is on.
  const availableGames = useMemo(
    () =>
      games.filter(
        (g) => (isBetaEnabled || g.method === 'process') && !(excludeAdult && g.adult)
      ),
    [games, isBetaEnabled, excludeAdult]
  );

  const selectedGames = useMemo(
    () =>
      selectedIds
        .map((id) => availableGames.find((g) => g.id === id))
        .filter((g): g is SpoofableGameItem => Boolean(g)),
    [selectedIds, availableGames]
  );

  const usedExes = useMemo(
    () => new Set(selectedGames.map(exeBasename).filter(Boolean)),
    [selectedGames]
  );

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return availableGames
      .filter((g) => !selectedIds.includes(g.id))
      .filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          (g.rel_path && g.rel_path.toLowerCase().includes(term)) ||
          g.id.includes(term)
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [searchTerm, availableGames, selectedIds]);

  const isFull = selectedGames.length >= MAX_FARM_GAMES;
  const activeIds = new Set(tickData.active_batch.map((g) => g.id));

  const durationLabel = (preset: number | null) =>
    preset === null
      ? t('farm.untilStopped')
      : t('farm.durationHours', { count: preset / 3600 });

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden pr-1">
      {/* Status and controls */}
      <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 shadow-sm flex flex-col gap-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#5865F2]" />
            {t('farm.title')}
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">{t('farm.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="grid grid-cols-5 gap-1 flex-1">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={String(preset)}
                type="button"
                disabled={!isIdle}
                onClick={() => setDurationSecs(preset)}
                className={`py-1.5 px-1 text-[11px] rounded border transition-all disabled:opacity-50 ${
                  durationSecs === preset
                    ? 'bg-[#5865F2] text-white border-[#5865F2] font-semibold'
                    : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
                }`}
              >
                {durationLabel(preset)}
              </button>
            ))}
          </div>

          {isFarming ? (
            <div className="flex items-center gap-3">
              <div className="text-xs text-neutral-400 whitespace-nowrap">
                {t('farm.elapsed')}{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {formatClock(tickData.elapsed_secs)}
                </span>
                {durationSecs !== null && (
                  <>
                    {' · '}
                    {t('farm.left')}{' '}
                    <span className="font-mono font-bold text-white">
                      {formatClock(tickData.estimated_remaining_secs)}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onStop}
                className="py-2 px-6 rounded-lg bg-[#3d181e] hover:bg-[#521e27] text-white font-semibold text-xs uppercase tracking-wider transition-all"
              >
                {t('dashboard.stop')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isIdle || selectedGames.length === 0}
              onClick={() => onStart(selectedGames.map((g) => g.id), durationSecs)}
              className="py-2 px-6 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('farm.start')}
            </button>
          )}
        </div>

        {!isIdle && !isFarmRun && (
          <div className="text-[11px] text-amber-400">{t('farm.busy')}</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Fixed game set */}
        <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 flex flex-col shadow-sm min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-shrink-0">
            <h3 className="text-sm font-semibold text-white">{t('farm.selected')}</h3>
            <span className="text-[11px] font-mono text-neutral-400">
              {selectedGames.length}/{MAX_FARM_GAMES}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-1.5 min-h-0">
            {selectedGames.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-neutral-500 p-4">
                {t('farm.emptySelection')}
              </div>
            ) : (
              selectedGames.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1b1c28] border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GameIcon game={game} />
                    <span className="font-medium text-white truncate">{game.name}</span>
                  </div>
                  {isFarming ? (
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        activeIds.has(game.id) ? 'bg-emerald-500' : 'bg-neutral-600'
                      }`}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!isIdle}
                      onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== game.id))}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 flex-shrink-0 disabled:opacity-40"
                      title={t('farm.remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Game search */}
        <div className="bg-[#161722] border border-[#232535] rounded-xl p-4 flex flex-col shadow-sm min-h-0 overflow-hidden">
          <div className="relative flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('database.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b1c28] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#5865F2]"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-1.5 min-h-0">
            {searchResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-neutral-500 p-4">
                {searchTerm.trim()
                  ? t('database.empty')
                  : t('farm.searchHint', { count: formatNumber(availableGames.length) })}
              </div>
            ) : (
              searchResults.map((game) => {
                const exe = exeBasename(game);
                const hasExeConflict = exe !== null && usedExes.has(exe);
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1b1c28] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GameIcon game={game} />
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{game.name}</div>
                        {hasExeConflict && (
                          <div className="text-[10px] text-amber-400 truncate">
                            {t('farm.exeConflict', { exe })}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isIdle || isFull || hasExeConflict}
                      onClick={() => setSelectedIds((prev) => [...prev, game.id])}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={t('farm.add')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
