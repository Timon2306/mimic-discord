export type SpooferStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';

export interface ActiveGame {
  id: string;
  name: string;
  executable: string;
  pid?: number;
  icon_hash?: string;
}

export interface SpoofableGameItem {
  id: string;
  name: string;
  rel_path: string;
  icon_hash?: string;
}

export interface SpooferTickEvent {
  current_index: number;
  total_games: number;
  active_batch: ActiveGame[];
  elapsed_secs: number;
  estimated_remaining_secs: number;
  games_per_minute: number;
}

export interface SpooferLogEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface SpooferStatusEvent {
  status: SpooferStatus;
  message?: string;
}

export interface FetchProgressEvent {
  total_fetched: number;
  win32_count: number;
  is_loading: boolean;
}

export interface SpooferConfig {
  limit?: number | null;
  batch_size: number;
  hold_duration_secs: number;
  start_offset?: number;
  skip_previously_spoofed?: boolean;
}
