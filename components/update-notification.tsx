'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useI18n } from '../lib/i18n';

interface UpdateStatus {
  status: 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
  error?: string;
}

const AUTO_INSTALL_SECONDS = 10;

export default function UpdateNotification() {
  const { t } = useI18n();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.onUpdateStatus) {
      const unsubscribe = window.electron.onUpdateStatus((status: any) => {
        console.log('[UpdateNotification] Status:', status);
        setUpdateStatus(status);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, []);

  // Start countdown when update is downloaded
  useEffect(() => {
    if (updateStatus?.status === 'downloaded') {
      setCountdown(AUTO_INSTALL_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [updateStatus?.status]);

  // Auto-install when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && !isInstalling) {
      setIsInstalling(true);
      console.log('[UpdateNotification] Auto-installing update...');
      window.electron?.quitAndInstall();
    }
  }, [countdown, isInstalling]);

  const handlePostpone = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    setUpdateStatus(null);
    window.electron?.postponeUpdate();
    console.log('[UpdateNotification] User postponed update');
  }, []);

  const handleInstallNow = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsInstalling(true);
    console.log('[UpdateNotification] Installing update now...');
    await window.electron?.quitAndInstall();
  }, []);

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

  // Downloaded and ready to install — auto-installs with countdown
  if (updateStatus.status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
        <p className="font-bold mb-2">{t('update.readyTitle')}</p>
        <p className="text-sm mb-3">
          {updateStatus.version || 'new'} {t('update.readyMsg')}
        </p>
        {countdown !== null && countdown > 0 && (
          <p className="text-sm mb-3 text-green-100">
            {t('update.autoInstallIn')} {countdown}s...
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleInstallNow}
            disabled={isInstalling}
            className="flex-1 bg-white text-green-600 px-3 py-2 rounded font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isInstalling ? t('update.installing') : t('update.restartInstall')}
          </button>
          <button
            onClick={handlePostpone}
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
