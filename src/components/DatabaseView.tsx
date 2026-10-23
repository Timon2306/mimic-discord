import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { tauriApi } from '@/lib/tauri';
import type { SpoofableGameItem } from '@/types/spoofer';

interface DatabaseViewProps {
  onRefresh: () => void;
  isFetching: boolean;
  historyCount?: number;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  onRefresh,
  isFetching,
}) => {
  const [games, setGames] = useState<SpoofableGameItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      try {
        setIsLoadingList(true);
        const list = await tauriApi.getGamesList();
        setGames(list);
      } catch (err) {
        console.error('Failed to load games list:', err);
      } finally {
        setIsLoadingList(false);
      }
    };
    loadGames();
  }, [isFetching]);

  const filteredGames = games.filter((game) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      game.name.toLowerCase().includes(term) ||
      game.rel_path.toLowerCase().includes(term) ||
      game.id.includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#161722] border border-[#232535] rounded-xl p-4 gap-3 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-white">
            БазаDetectable игр Discord
          </h2>
          <p className="text-xs text-neutral-400">
            {games.length.toLocaleString()} игр для Windows в официальной базе
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по названию или .exe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b1c28] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#5865F2]"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-[#1b1c28] border border-white/10 hover:bg-white/5 text-neutral-300 disabled:opacity-50"
            title="Обновить базу"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? 'animate-spin text-[#5865F2]' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Games Table List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoadingList ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-400">
            Загрузка списка игр...
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-400">
            Игры не найдены
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredGames.slice(0, 300).map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#1b1c28] border border-white/5 text-xs hover:border-[#5865F2]/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {game.icon_hash ? (
                    <img
                      src={`https://cdn.discordapp.com/app-icons/${game.id}/${game.icon_hash}.png?size=32`}
                      alt=""
                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-[#242738] flex items-center justify-center text-[#5865F2] flex-shrink-0 text-xs">
                      🎮
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">
                      {game.name}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400 truncate">
                      {game.rel_path}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-neutral-500 font-mono text-[10px]">
                  <span>ID: {game.id}</span>
                </div>
              </div>
            ))}
            {filteredGames.length > 300 && (
              <div className="text-center py-2 text-[11px] text-neutral-500 font-mono">
                Показано 300 из {filteredGames.length.toLocaleString()} игр. Уточните поиск для конкретной игры.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
