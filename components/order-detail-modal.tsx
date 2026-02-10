'use client';

import type { OrderResponse } from '../types/ipc';
import { useI18n } from '../lib/i18n';

interface OrderDetailModalProps {
  isOpen: boolean;
  order: OrderResponse | null;
  onClose: () => void;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export default function OrderDetailModal({ isOpen, order, onClose }: OrderDetailModalProps) {
  if (!isOpen || !order) return null;
  const { t } = useI18n();
  const statusLabels: Record<string, string> = {
    pending: t('orders.pending'),
    in_production: t('orders.inProduction'),
    shipped: t('orders.shipped'),
  };

  const totalBoxes = order.orderItems?.reduce((sum, item) => sum + item.boxesNeeded, 0) ?? 0;
  const totalUnits = order.orderItems?.reduce(
    (sum, item) => sum + item.boxesNeeded * (item.product?.unitsPerBox ?? 0),
    0
  ) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex w-full max-w-lg max-h-[80vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Order #{order.orderNumber}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {order.clientName} · {formatDate(order.createdAt)} · {statusLabels[order.status] || order.status}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Summary */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{order.orderItems?.length ?? 0}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('orders.products')}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{totalBoxes}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('common.boxes')}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{totalUnits}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('common.units')}</p>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('orders.notes')}</h3>
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {order.notes}
              </p>
            </div>
          )}

          {/* Order Items */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('orderDetail.productsInOrder')}
          </h3>
          {order.orderItems && order.orderItems.length > 0 ? (
            <div className="space-y-2">
              {order.orderItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {/* Landscape image */}
                  <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700">
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product?.serialNumber} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.product?.serialNumber || 'Unknown'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.product?.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.boxesNeeded} {item.boxesNeeded !== 1 ? t('common.boxes') : t('common.box')}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.boxesNeeded * (item.product?.unitsPerBox ?? 0)} {t('common.units')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">{t('orderDetail.noProducts')}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
