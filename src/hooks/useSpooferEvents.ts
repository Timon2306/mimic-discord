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
  const [processGamesCount, setProcessGamesCount] = useState<number>(0);
  const [rpcGamesCount, setRpcGamesCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [historyProcessCount, setHistoryProcessCount] = useState<number>(0);
  const [historyRpcCount, setHistoryRpcCount] = useState<number>(0);
  const [isFetchingDatabase, setIsFetchingDatabase] = useState<boolean>(false);

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
          setTotalDatabaseGames(payload.total_fetched);
          setProcessGamesCount(payload.process_count);
          setRpcGamesCount(payload.rpc_count);
          if (payload.history_process_count !== undefined) {
            setHistoryProcessCount(payload.history_process_count);
          }
          if (payload.history_rpc_count !== undefined) {
            setHistoryRpcCount(payload.history_rpc_count);
          }
          setIsFetchingDatabase(payload.is_loading);
        });

        // Initialize state snapshot from Rust
        try {
          const state = await tauriApi.getSpooferState();
          setStatus(state.status);
          setTotalDatabaseGames(state.total_count);
          setProcessGamesCount(state.process_count);
          setRpcGamesCount(state.rpc_count);
          setHistoryCount(state.history_count || 0);
          if (state.history_process_count !== undefined) {
            setHistoryProcessCount(state.history_process_count);
          }
          if (state.history_rpc_count !== undefined) {
            setHistoryRpcCount(state.history_rpc_count);
          }
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
      addLog('info', 'Загрузка официальной базы игр Discord...');
      const res = await tauriApi.fetchGames();
      setTotalDatabaseGames(res.total);
      setProcessGamesCount(res.process_count);
      setRpcGamesCount(res.rpc_count);
      addLog(
        'success',
        `База обновлена: всего ${res.total.toLocaleString()} игр (${res.process_count.toLocaleString()} нативных процессов + ${res.rpc_count.toLocaleString()} Discord RPC).`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Ошибка загрузки базы: ${msg}`);
    } finally {
      setIsFetchingDatabase(false);
    }
  }, [addLog]);

  const clearHistory = useCallback(async () => {
    try {
      await tauriApi.clearHistory();
      setHistoryCount(0);
      addLog('info', 'История эмулированных игр очищена.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Ошибка очистки истории: ${msg}`);
    }
  }, [addLog]);

  const exportHistory = useCallback(async () => {
    try {
      const json = await tauriApi.exportHistory();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mimic-history-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog('success', 'История успешно экспортирована в файл JSON.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Ошибка экспорта истории: ${msg}`);
    }
  }, [addLog]);

  const importHistory = useCallback(
    async (jsonData: string) => {
      try {
        const added = await tauriApi.importHistory(jsonData);
        const state = await tauriApi.getSpooferState();
        setHistoryCount(state.history_count);
        addLog('success', `Импортировано ${added} новых записей в историю.`);
        return added;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog('error', `Ошибка импорта истории: ${msg}`);
        throw e;
      }
    },
    [addLog]
  );

  return {
    status,
    errorMessage,
    tickData,
    logs,
    totalDatabaseGames,
    processGamesCount,
    rpcGamesCount,
    historyCount,
    historyProcessCount,
    historyRpcCount,
    isFetchingDatabase,
    actions: {
      start,
      pause,
      resume,
      stop,
      fetchGames,
      clearLogs,
      clearHistory,
      exportHistory,
      importHistory,
      addLog,
    },
  };
}
