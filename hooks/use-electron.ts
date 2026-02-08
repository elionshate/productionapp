import { useEffect, useState } from 'react';
import type { ElectronAPI } from '../types/ipc';

/**
 * React Hook: useElectron
 * 
 * Provides type-safe access to Electron IPC from React components.
 * 
 * Usage:
 * ```tsx
 * const electron = useElectron();
 * 
 * async function loadOrders() {
 *   const result = await electron.getOrders();
 *   if (result.success) {
 *     setOrders(result.data);
 *   } else {
 *     console.error(result.error);
 *   }
 * }
 * ```
 * 
 * Architecture:
 * - NEVER import Prisma Client in React components
 * - ALL database operations go through IPC (window.electron)
 * - Electron Main Process handles ALL database queries
 * - This pattern is REQUIRED for static Next.js export
 */
export function useElectron(): ElectronAPI {
  const [electron, setElectron] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    // Ensure we're running in Electron
    if (typeof window !== 'undefined' && window.electron) {
      setElectron(window.electron);
    } else {
      console.warn('[useElectron] window.electron is not available. Are you running in Electron?');
    }
  }, []);

  // Return a proxy that throws helpful errors if not initialized
  if (!electron) {
    return new Proxy({} as ElectronAPI, {
      get() {
        throw new Error(
          '[useElectron] Electron API not available. Ensure you are running this app in Electron.'
        );
      },
    });
  }

  return electron;
}

/**
 * Direct access to Electron API (for non-hook usage)
 * Use this in non-React contexts (e.g., utility functions)
 * 
 * Example:
 * ```ts
 * import { getElectronAPI } from '@/hooks/use-electron';
 * 
 * const electron = getElectronAPI();
 * const result = await electron.getOrders();
 * ```
 */
export function getElectronAPI(): ElectronAPI {
  if (typeof window === 'undefined' || !window.electron) {
    throw new Error(
      '[getElectronAPI] Electron API not available. Ensure you are running this app in Electron.'
    );
  }
  return window.electron;
}
