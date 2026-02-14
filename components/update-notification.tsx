'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';

interface UpdateStatus {
  status: 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
  error?: string;
}

export default function UpdateNotification() {
  const { t } = useI18n();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.onUpdateStatus) {
      // Set up listener for update status changes — store cleanup function
      const unsubscribe = window.electron.onUpdateStatus((status: any) => {
        console.log('[UpdateNotification] Status:', status);
        setUpdateStatus(status);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
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
        <p className="font-bold mb-2">{t('update.checkFailed')}</p>
        <p className="text-sm">{updateStatus.error || t('update.checkFailedMsg')}</p>
      </div>
    );
  }

  // Update available
  if (updateStatus.status === 'available') {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">{t('update.available')}</p>
        <p className="text-sm mb-3">
          {updateStatus.version || 'new'} {t('update.availableMsg')}
        </p>
        <div className="text-xs text-blue-100">{t('update.downloading')}</div>
      </div>
    );
  }

  // Downloading
  if (updateStatus.status === 'downloading') {
    const percent = updateStatus.percent || 0;
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">{t('update.downloadingTitle')}</p>
        <div className="bg-blue-700 rounded-full h-2 mb-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm">{percent}% {t('update.downloaded')}</p>
      </div>
    );
  }

  // Downloaded and ready to install
  if (updateStatus.status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">{t('update.readyTitle')}</p>
        <p className="text-sm mb-4">
          {updateStatus.version || 'new'} {t('update.readyMsg')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleInstallUpdate}
            disabled={isInstalling}
            className="flex-1 bg-white text-green-600 px-3 py-2 rounded font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isInstalling ? t('update.installing') : t('update.restartInstall')}
          </button>
          <button
            onClick={() => setUpdateStatus(null)}
            disabled={isInstalling}
            className="px-3 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {t('update.later')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
