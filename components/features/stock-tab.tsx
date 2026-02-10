'use client';

import { useState, useEffect } from 'react';
import type { StockOrderData, ProductStockResponse } from '../../types/ipc';
import { useI18n } from '../../lib/i18n';

export default function StockTab() {
  const [stockOrders, setStockOrders] = useState<StockOrderData[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [excessStock, setExcessStock] = useState<ProductStockResponse[]>([]);
  const [isLoadingExcess, setIsLoadingExcess] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    loadStockOrders();
    loadExcessStock();
  }, []);

  async function loadStockOrders() {
    if (!window.electron) { setIsLoadingStock(false); return; }
    setIsLoadingStock(true);
    try {
      const result = await window.electron.getStockOrders();
      if (result.success) setStockOrders(result.data);
    } catch (err) {
      console.error('Failed to load stock orders:', err);
    } finally {
      setIsLoadingStock(false);
    }
  }

  async function loadExcessStock() {
    if (!window.electron) { setIsLoadingExcess(false); return; }
    setIsLoadingExcess(true);
    try {
      const result = await window.electron.getProductStock();
      if (result.success) setExcessStock(result.data.filter(s => s.stockBoxedAmount > 0));
    } catch (err) {
      console.error('Failed to load excess stock:', err);
    } finally {
      setIsLoadingExcess(false);
    }
  }

  async function handleShipOrder(orderId: string) {
    if (!window.electron) return;
    setShippingId(orderId);
    try {
      const result = await window.electron.updateOrder(orderId, { status: 'shipped' });
      if (result.success) {
        // Remove shipped order from local state
        setStockOrders(prev => prev.filter(o => o.orderId !== orderId));
      } else {
        alert(result.error || 'Failed to ship order');
      }
    } catch (err) {
      console.error('Failed to ship order:', err);
      alert('Failed to ship order');
    } finally {
      setShippingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('stock.title')}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('stock.subtitle')}</p>
        </div>
        <button onClick={() => { loadStockOrders(); loadExcessStock(); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">{t('common.refresh')}</button>
      </div>

      {/* Excess Stock Card — always visible */}
      {!isLoadingExcess && (
        <div className="mb-6">
          <ExcessStockCard items={excessStock} />
        </div>
      )}

      {isLoadingStock ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
        </div>
      ) : stockOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('stock.noData')}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('stock.noDataHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stockOrders.map(order => (
            <StockOrderCard
              key={order.orderId}
              order={order}
              onShip={() => handleShipOrder(order.orderId)}
              isShipping={shippingId === order.orderId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stock Order Card ────────────────────────────────────────

function StockOrderCard({ order, onShip, isShipping }: { order: StockOrderData; onShip: () => void; isShipping: boolean }) {
  const totalBoxesNeeded = order.products.reduce((s, p) => s + p.boxesNeeded, 0);
  const totalBoxesReady = order.products.reduce((s, p) => s + p.boxesReady, 0);
  const allComplete = totalBoxesReady >= totalBoxesNeeded;
  const { t } = useI18n();

  return (
    <div className={`rounded-xl border shadow-sm ${allComplete ? 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/10' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Order #{order.orderNumber}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{order.clientName}</p>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold tabular-nums ${allComplete ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>{totalBoxesReady}</span>
              <span className="text-lg text-zinc-400">/</span>
              <span className="text-3xl font-bold tabular-nums text-zinc-400 dark:text-zinc-500">{totalBoxesNeeded}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{t('stock.totalBoxes')}</p>
          </div>
          {allComplete ? (
            <button
              onClick={onShip}
              disabled={isShipping}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('stock.orderComplete')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {isShipping ? t('orders.shipping') : t('orders.ship')}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500" title={t('stock.orderIncomplete')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('stock.orderIncomplete')}
            </div>
          )}
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {order.products.map(product => {
          const done = product.boxesReady >= product.boxesNeeded;
          const progress = product.boxesNeeded > 0 ? Math.min(100, (product.boxesReady / product.boxesNeeded) * 100) : 0;
          return (
            <div key={product.productId} className="flex items-center gap-4 px-5 py-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.serialNumber} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{product.serialNumber}</p>
                <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className={`text-2xl font-bold tabular-nums ${done ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{product.boxesReady}</span>
                <span className="text-base text-zinc-400">/</span>
                <span className="text-2xl font-bold tabular-nums text-zinc-400 dark:text-zinc-500">{product.boxesNeeded}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Excess Stock Card ───────────────────────────────────────

function ExcessStockCard({ items }: { items: ProductStockResponse[] }) {
  const totalBoxes = items.reduce((sum, s) => sum + s.stockBoxedAmount, 0);
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/10">
      <div className="flex items-center justify-between border-b border-amber-200 px-5 py-3 dark:border-amber-900/50">
        <div>
          <h3 className="text-base font-bold text-amber-800 dark:text-amber-300">{t('stock.excessStock')}</h3>
          <p className="text-xs text-amber-600 dark:text-amber-500">{t('stock.excessSubtitle')}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{totalBoxes}</span>
          <p className="text-xs text-amber-500">{t('stock.totalBoxes')}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-amber-600/60 dark:text-amber-500/50">{t('stock.noExcess')}</p>
          <p className="text-xs text-amber-500/50 dark:text-amber-600/40 mt-0.5">{t('stock.noExcessHint')}</p>
        </div>
      ) : (
        <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
          {items.map(stock => (
            <div key={stock.id} className="flex items-center gap-4 px-5 py-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white dark:bg-zinc-700">
                {stock.product?.imageUrl ? (
                  <img src={stock.product.imageUrl} alt={stock.product?.serialNumber} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{stock.product?.serialNumber ?? 'Unknown'}</p>
                {stock.product?.label && (
                  <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 mt-0.5">{stock.product.label}</span>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{stock.stockBoxedAmount}</span>
                <p className="text-xs text-amber-500">box{stock.stockBoxedAmount !== 1 ? 'es' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
