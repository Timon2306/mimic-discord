import { useState, useEffect, useCallback, useRef } from 'react';
import { tauriApi } from '@/lib/tauri';
import type {
  SpooferStatus,
  SpooferTickEvent,
  SpooferLogEvent,
  SpooferConfig,
} from '@/types/spoofer';

const MAX_LOGS = 600;

export function useSpooferEvents() {
  const [status, setStatus] = useState<SpooferStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tickData, setTickData] = useState<SpooferTickEvent>({
    current_index: 0,
    total_games: 0,
    active_batch: [],
    elapsed_secs: 0,
    estimated_remaining_secs: 0,
    games_per_minute: 0,
  });

  const [logs, setLogs] = useState<SpooferLogEvent[]>([]);
  const [totalDatabaseGames, setTotalDatabaseGames] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [isFetchingDatabase, setIsFetchingDatabase] = useState<boolean>(false);

  // Keep ref for logs to avoid stale closures in listeners
  const logIdCounter = useRef(0);

  const addLog = useCallback(
    (level: SpooferLogEvent['level'], message: string, timestamp?: string) => {
      const time =
        timestamp ||
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      logIdCounter.current += 1;
      const newLog: SpooferLogEvent = {
        id: `log-${Date.now()}-${logIdCounter.current}`,
        timestamp: time,
        level,
        message,
      };

      setLogs((prev) => {
        const updated = [...prev, newLog];
        if (updated.length > MAX_LOGS) {
          return updated.slice(updated.length - MAX_LOGS);
        }
        return updated;
      });
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Listen to Tauri events
  useEffect(() => {
    let unlistenTick: (() => void) | undefined;
    let unlistenLog: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    let unlistenFetch: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenTick = await tauriApi.onTick((payload) => {
          setTickData(payload);
        });

        unlistenLog = await tauriApi.onLog((payload) => {
          addLog(payload.level, payload.message, payload.timestamp);
        });

        unlistenStatus = await tauriApi.onStatus((payload) => {
          setStatus(payload.status);
          if (payload.status === 'error' && payload.message) {
            setErrorMessage(payload.message);
          } else if (payload.status !== 'error') {
            setErrorMessage(null);
          }
        });

        unlistenFetch = await tauriApi.onFetchProgress((payload) => {
          setTotalDatabaseGames(payload.win32_count);
          setIsFetchingDatabase(payload.is_loading);
        });

        // Initialize state snapshot from Rust
        try {
          const state = await tauriApi.getSpooferState();
          setStatus(state.status);
          setTotalDatabaseGames(state.win32_count);
          setHistoryCount(state.history_count || 0);
        } catch {
          // outside tauri / mock mode
        }
      } catch (err) {
        console.warn('Tauri event listener setup failed:', err);
      }
    };

    setupListeners();

    return () => {
      unlistenTick?.();
      unlistenLog?.();
      unlistenStatus?.();
      unlistenFetch?.();
    };
  }, [addLog]);

  // Actions
  const start = useCallback(
    async (config: SpooferConfig) => {
      try {
        setErrorMessage(null);
        setStatus('running');
        await tauriApi.startSpoofer(config);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMessage(msg);
        setStatus('error');
        addLog('error', `Failed to start: ${msg}`);
      }
    },
    [addLog]
  );

  const pause = useCallback(async () => {
    try {
      setStatus('paused');
      await tauriApi.pauseSpoofer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Failed to pause: ${msg}`);
    }
  }, [addLog]);

  const resume = useCallback(async () => {
    try {
      setStatus('running');
      await tauriApi.resumeSpoofer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Failed to resume: ${msg}`);
    }
  }, [addLog]);

  const stop = useCallback(async () => {
    try {
      setStatus('idle');
      setTickData((prev) => ({
        ...prev,
        active_batch: [],
      }));
      await tauriApi.stopSpoofer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Failed to stop: ${msg}`);
    }
  }, [addLog]);

  const fetchGames = useCallback(async () => {
    try {
      setIsFetchingDatabase(true);
      addLog('info', 'Fetching latest detectable applications from Discord API...');
      const res = await tauriApi.fetchGames();
      setTotalDatabaseGames(res.win32);
      addLog(
        'success',
        `Database updated: ${res.win32.toLocaleString()} Windows games loaded (from ${res.total.toLocaleString()} total apps).`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Failed to fetch Discord database: ${msg}`);
    } finally {
      setIsFetchingDatabase(false);
    }
  }, [addLog]);

  const clearHistory = useCallback(async () => {
    try {
      await tauriApi.clearHistory();
      setHistoryCount(0);
      addLog('info', 'Spoofer history cleared.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Failed to clear history: ${msg}`);
    }
  }, [addLog]);

  return {
    status,
    errorMessage,
    tickData,
    logs,
    totalDatabaseGames,
    historyCount,
    isFetchingDatabase,
    actions: {
      start,
      pause,
      resume,
      stop,
      fetchGames,
      clearLogs,
      clearHistory,
      addLog,
    },
  };
}
