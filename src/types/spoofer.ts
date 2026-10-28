export type SpooferStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';

export type SpoofMode = 'hybrid' | 'process_only' | 'rpc_only';

export type SpoofMethod = 'process' | 'rpc';

export interface ActiveGame {
  id: string;
  name: string;
  executable?: string;
  pid?: number;
  icon_hash?: string;
  method: 'process' | 'rpc';
}

export interface SpoofableGameItem {
  id: string;
  name: string;
  rel_path?: string | null;
  arguments?: string | null;
  icon_hash?: string;
  method: 'process' | 'rpc';
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
  process_count: number;
  rpc_count: number;
  history_process_count?: number;
  history_rpc_count?: number;
  is_loading: boolean;
}

export interface FetchGamesResponse {
  total: number;
  process_count: number;
  rpc_count: number;
  history_process_count?: number;
  history_rpc_count?: number;
}

export interface SpooferStateResponse {
  status: SpooferStatus;
  total_count: number;
  process_count: number;
  rpc_count: number;
  history_count: number;
  history_process_count?: number;
  history_rpc_count?: number;
}

export interface SpooferConfig {
  limit?: number | null;
  batch_size: number;
  hold_duration_secs: number;
  start_offset?: number;
  skip_previously_spoofed?: boolean;
  spoof_mode: SpoofMode;
  /** Opt-in beta: allows non-native categories (RPC / console / SDK) to be selected. */
  beta_enabled?: boolean;
  cooldown_enabled: boolean;
  cooldown_every_n_batches: number;
  cooldown_seconds: number;
  jitter_enabled: boolean;
}
