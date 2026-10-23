import { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '@/lib/tauri';

export function useDiscordStatus(pollIntervalMs = 5000) {
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      const running = await tauriApi.checkDiscordRunning();
      setIsRunning(running);
    } catch {
      // In dev browser environment or if IPC not ready
      setIsRunning(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkStatus, pollIntervalMs]);

  return { isRunning, isChecking, refetch: checkStatus };
}
