'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useI18n, LanguagePicker } from '../lib/i18n';
import ProductsTab from '../components/features/products-tab';
import ElementsTab from '../components/features/elements-tab';
import OrdersTab from '../components/features/orders-tab';
import ProductionTab from '../components/features/production-tab';
import InventoryTab from '../components/features/inventory-tab';
import StorageTab from '../components/features/storage-tab';
import StockTab from '../components/features/stock-tab';

// Main navigation tabs
const NAV_KEYS = ['Products', 'Elements', 'Orders', 'Inventory', 'Production', 'Storage', 'Stock'] as const;
type NavTab = (typeof NAV_KEYS)[number];

const NAV_I18N: Record<NavTab, string> = {
  Products: 'nav.products',
  Elements: 'nav.elements',
  Orders: 'nav.orders',
  Inventory: 'nav.inventory',
  Production: 'nav.production',
  Storage: 'nav.storage',
  Stock: 'nav.stock',
};

export default function Home() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [activeNav, setActiveNav] = useState<NavTab>('Products');
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number; error?: string } | null>(null);

  useEffect(() => {
    if (!window.electron) return;
    window.electron.getAppVersion().then(v => setAppVersion(v));
    const unsub = window.electron.onUpdateStatus((data) => setUpdateStatus(data));
    return unsub;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* ===== Top Bar ===== */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t('app.title')}</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguagePicker />
          {appVersion && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{t('app.version')}{appVersion}</span>
          )}
          {updateStatus?.status === 'available' && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              v{updateStatus.version} {t('app.updateDownloading')}
            </span>
          )}
          {updateStatus?.status === 'downloading' && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              {t('app.updateDownloading')} {updateStatus.percent}%
            </span>
          )}
          {updateStatus?.status === 'downloaded' && (
            <button
              onClick={() => window.electron?.quitAndInstall()}
              className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-950/60 transition-colors"
            >
              {t('app.updateRestart')} v{updateStatus.version}
            </button>
          )}
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('app.signedIn')} <span className="font-medium text-zinc-700 dark:text-zinc-200">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-red-400 dark:focus:ring-offset-zinc-900"
          >
            {t('app.logout')}
          </button>
        </div>
      </header>

      {/* ===== Main Navigation Tabs ===== */}
      <nav className="border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-1">
          {NAV_KEYS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveNav(tab)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeNav === tab
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              {t(NAV_I18N[tab] as any)}
              {activeNav === tab && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== Content Area ===== */}
      <main className="flex-1 overflow-y-auto">
        <div style={{ display: activeNav === 'Products' ? 'block' : 'none' }}><ProductsTab /></div>
        <div style={{ display: activeNav === 'Elements' ? 'block' : 'none' }}><ElementsTab /></div>
        <div style={{ display: activeNav === 'Orders' ? 'block' : 'none' }}><OrdersTab /></div>
        <div style={{ display: activeNav === 'Production' ? 'block' : 'none' }}><ProductionTab /></div>
        <div style={{ display: activeNav === 'Inventory' ? 'block' : 'none' }}><InventoryTab /></div>
        <div style={{ display: activeNav === 'Storage' ? 'block' : 'none' }}><StorageTab /></div>
        <div style={{ display: activeNav === 'Stock' ? 'block' : 'none' }}><StockTab /></div>
      </main>
    </div>
  );
}
