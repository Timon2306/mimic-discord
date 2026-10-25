import { useCallback, useEffect, useRef, useState } from 'react';
import { tauriApi } from '@/lib/tauri';

/** Repository link shown in the "star us" dialog. */
export const GITHUB_REPO_URL = 'https://github.com/Timon2306/mimic-discord';

/**
 * How many spoofed games must be reached before the dialog appears.
 * For local testing you can temporarily lower this value.
 */
export const STAR_PROMPT_THRESHOLD = 1000;

/** After "Поставил" the dialog stays hidden for 24 hours. */
const STAR_PROMPT_SNOOZE_MS = 24 * 60 * 60 * 1000;
const SNOOZE_STORAGE_KEY = 'mimic.star_prompt_snooze_until';

function readSnoozeUntil(): number {
  try {
    const raw = window.localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return 0;
    const until = Number(raw);
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}

function writeSnoozeUntil(until: number): void {
  try {
    window.localStorage.setItem(SNOOZE_STORAGE_KEY, String(until));
  } catch {
    // storage unavailable — the dialog will simply reappear next launch
  }
}

export function useStarPrompt(historyCount: number, pollIntervalMs = 5000) {
  const [spoofedGamesCount, setSpoofedGamesCount] = useState<number>(historyCount);
  const [snoozeUntil, setSnoozeUntil] = useState<number>(() => readSnoozeUntil());
  const [isHandled, setIsHandled] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  // Keep in sync with the global history counter even while a run is in progress.
  useEffect(() => {
    setSpoofedGamesCount(historyCount);
  }, [historyCount]);

  // Poll the backend so the threshold is detected mid-run, not only after a restart.
  useEffect(() => {
    isMountedRef.current = true;

    const syncHistory = async () => {
      try {
        const state = await tauriApi.getSpooferState();
        if (isMountedRef.current && typeof state.history_count === 'number') {
          setSpoofedGamesCount(state.history_count);
        }
      } catch {
        // outside tauri / mock mode — rely on the historyCount prop
      }
    };

    syncHistory();
    const interval = window.setInterval(syncHistory, pollIntervalMs);
    return () => {
      isMountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs]);

  const isOpen =
    !isHandled && spoofedGamesCount >= STAR_PROMPT_THRESHOLD && Date.now() >= snoozeUntil;

  const accept = useCallback(() => {
    const until = Date.now() + STAR_PROMPT_SNOOZE_MS;
    writeSnoozeUntil(until);
    setSnoozeUntil(until);
    setIsHandled(true);

    // Bring the dialog back once the 24h snooze has elapsed (if the app is still open).
    window.setTimeout(() => {
      writeSnoozeUntil(0);
      setSnoozeUntil(0);
      setIsHandled(false);
    }, STAR_PROMPT_SNOOZE_MS);
  }, []);

  const decline = useCallback(() => {
    // Just hide the dialog — the app keeps running.
    setIsHandled(true);
  }, []);

  const openRepo = useCallback(async () => {
    try {
      await tauriApi.openExternalUrl(GITHUB_REPO_URL);
    } catch (err) {
      console.warn('Failed to open GitHub link:', err);
    }
  }, []);

  return {
    isOpen,
    gamesCount: spoofedGamesCount,
    accept,
    decline,
    openRepo,
  };
}
