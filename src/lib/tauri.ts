import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  SpooferConfig,
  SpooferTickEvent,
  SpooferLogEvent,
  SpooferStatusEvent,
  FetchProgressEvent,
  SpoofableGameItem,
  FetchGamesResponse,
  SpooferStateResponse,
} from '@/types/spoofer';

export const tauriApi = {
  // Commands
  startSpoofer: (config: SpooferConfig): Promise<void> => {
    return invoke('start_spoofer', { config });
  },

  pauseSpoofer: (): Promise<void> => {
    return invoke('pause_spoofer');
  },

  resumeSpoofer: (): Promise<void> => {
    return invoke('resume_spoofer');
  },

  stopSpoofer: (): Promise<void> => {
    return invoke('stop_spoofer');
  },

  fetchGames: (): Promise<FetchGamesResponse> => {
    return invoke('fetch_games');
  },

  getGamesList: (): Promise<SpoofableGameItem[]> => {
    return invoke('get_games_list');
  },

  checkDiscordRunning: (): Promise<boolean> => {
    return invoke('check_discord_status');
  },

  clearHistory: (): Promise<void> => {
    return invoke('clear_history');
  },

  exportHistory: (): Promise<string> => {
    return invoke('export_history');
  },

  importHistory: (jsonData: string): Promise<number> => {
    return invoke('import_history', { jsonData });
  },

  getSpooferState: (): Promise<SpooferStateResponse> => {
    return invoke('get_spoofer_state');
  },

  // Event Listeners
  onTick: (cb: (payload: SpooferTickEvent) => void): Promise<UnlistenFn> => {
    return listen<SpooferTickEvent>('spoofer_tick', (e) => cb(e.payload));
  },

  onLog: (cb: (payload: Omit<SpooferLogEvent, 'id'>) => void): Promise<UnlistenFn> => {
    return listen<Omit<SpooferLogEvent, 'id'>>('spoofer_log', (e) => cb(e.payload));
  },

  onStatus: (cb: (payload: SpooferStatusEvent) => void): Promise<UnlistenFn> => {
    return listen<SpooferStatusEvent>('spoofer_status', (e) => cb(e.payload));
  },

  onFetchProgress: (cb: (payload: FetchProgressEvent) => void): Promise<UnlistenFn> => {
    return listen<FetchProgressEvent>('fetch_progress', (e) => cb(e.payload));
  },
};
