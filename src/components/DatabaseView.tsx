import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Layers, Cpu, Radio, Gamepad2 } from 'lucide-react';
import { tauriApi } from '@/lib/tauri';
import type { SpoofableGameItem } from '@/types/spoofer';

interface DatabaseViewProps {
  onRefresh: () => void;
  isFetching: boolean;
  historyCount?: number;
}

type FilterType = 'all' | 'process' | 'rpc';

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  onRefresh,
  isFetching,
}) => {
  const [games, setGames] = useState<SpoofableGameItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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

  const processCount = games.filter((g) => g.method === 'process').length;
  const rpcCount = games.filter((g) => g.method === 'rpc').length;

  const filteredGames = games.filter((game) => {
    // 1. Method filter
    if (activeFilter === 'process' && game.method !== 'process') return false;
    if (activeFilter === 'rpc' && game.method !== 'rpc') return false;

    // 2. Search term
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      game.name.toLowerCase().includes(term) ||
      (game.rel_path && game.rel_path.toLowerCase().includes(term)) ||
      game.id.includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#161722] border border-[#232535] rounded-xl p-4 gap-3 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5865F2]" />
            Каталог Detectable игр Discord
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {games.length.toLocaleString()} игр в базе ({processCount.toLocaleString()} процессов + {rpcCount.toLocaleString()} Discord RPC)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по названию, ID или .exe..."
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            activeFilter === 'all'
              ? 'bg-[#5865F2]/20 border-[#5865F2] text-white font-semibold'
              : 'bg-[#1b1c28] border-white/5 text-neutral-400 hover:text-white'
          }`}
        >
          <span>Все</span>
          <span className="font-mono text-[10px] opacity-75">
            ({games.length.toLocaleString()})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('process')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            activeFilter === 'process'
              ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa] font-semibold'
              : 'bg-[#1b1c28] border-white/5 text-neutral-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3 h-3" />
          <span>Нативные процессы</span>
          <span className="font-mono text-[10px] opacity-75">
            ({processCount.toLocaleString()})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('rpc')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            activeFilter === 'rpc'
              ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#a78bfa] font-semibold'
              : 'bg-[#1b1c28] border-white/5 text-neutral-400 hover:text-white'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>Discord RPC / Консоли</span>
          <span className="font-mono text-[10px] opacity-75">
            ({rpcCount.toLocaleString()})
          </span>
        </button>
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
                    <div className="w-6 h-6 rounded bg-[#242738] flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="w-3.5 h-3.5 text-[#5865F2]" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="font-medium text-white truncate flex items-center gap-2">
                      <span className="truncate">{game.name}</span>
                      {game.method === 'process' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">
                          PROCESS
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
                          RPC
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400 truncate">
                      {game.rel_path ? game.rel_path : 'Discord SDK / Console Activity'}
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
