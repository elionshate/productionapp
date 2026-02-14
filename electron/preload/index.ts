import { contextBridge, ipcRenderer } from 'electron';

/**
 * Minimal preload for Client-Server architecture.
 * Exposes only the API port and native Electron operations to the renderer.
 * All data operations go through HTTP fetch to the local NestJS server.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** The port the local NestJS API server is listening on */
  getApiPort: (): Promise<number> => ipcRenderer.invoke('get-api-port'),

  /** Get app version */
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  /** Open native file picker for images, returns data URL or null */
  selectImage: (): Promise<{ success: boolean; data?: string | null; error?: string }> =>
    ipcRenderer.invoke('select-image'),

  /** Listen for auto-update status messages */
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on('update-status', handler);
    return () => { ipcRenderer.removeListener('update-status', handler); };
  },

  /** Quit app and install pending update (silent) */
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  /** Postpone auto-install countdown */
  postponeUpdate: () => ipcRenderer.invoke('postpone-update'),
});
