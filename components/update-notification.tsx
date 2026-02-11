'use client';

import { useEffect, useState } from 'react';

interface UpdateStatus {
  status: 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
  error?: string;
}

export default function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.onUpdateStatus) {
      // Set up listener for update status changes
      window.electron.onUpdateStatus((status: any) => {
        console.log('[UpdateNotification] Status:', status);
        setUpdateStatus(status);
      });
    }
  }, []);

  const handleInstallUpdate = async () => {
    try {
      setIsInstalling(true);
      console.log('[UpdateNotification] Installing update...');
      await window.electron?.quitAndInstall();
    } catch (error) {
      console.error('[UpdateNotification] Install failed:', error);
      setIsInstalling(false);
    }
  };

  // Don't show notification if no update or already up to date
  if (!updateStatus || updateStatus.status === 'up-to-date') {
    return null;
  }

  // Error state
  if (updateStatus.status === 'error') {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">Update Check Failed</p>
        <p className="text-sm">{updateStatus.error || 'Failed to check for updates'}</p>
      </div>
    );
  }

  // Update available
  if (updateStatus.status === 'available') {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">Update Available</p>
        <p className="text-sm mb-3">
          Version {updateStatus.version || 'new'} is available. Downloading in background...
        </p>
        <div className="text-xs text-blue-100">Downloading...</div>
      </div>
    );
  }

  // Downloading
  if (updateStatus.status === 'downloading') {
    const percent = updateStatus.percent || 0;
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">Downloading Update</p>
        <div className="bg-blue-700 rounded-full h-2 mb-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm">{percent}% downloaded</p>
      </div>
    );
  }

  // Downloaded and ready to install
  if (updateStatus.status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">Update Ready to Install</p>
        <p className="text-sm mb-4">
          Version {updateStatus.version || 'new'} has been downloaded and is ready to install.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleInstallUpdate}
            disabled={isInstalling}
            className="flex-1 bg-white text-green-600 px-3 py-2 rounded font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isInstalling ? 'Installing...' : 'Restart & Install'}
          </button>
          <button
            onClick={() => setUpdateStatus(null)}
            disabled={isInstalling}
            className="px-3 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  return null;
}
