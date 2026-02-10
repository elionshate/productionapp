'use client';

import { useState, useEffect, useMemo } from 'react';
import OrderCard from '../order-card';
import CreateOrderModal from '../create-order-modal';
import OrderItemsModal from '../order-items-modal';
import OrderDetailModal from '../order-detail-modal';
import type { OrderResponse } from '../../types/ipc';
import { useI18n } from '../../lib/i18n';

export default function OrdersTab() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [orderItemsModal, setOrderItemsModal] = useState<{ orderId: string; orderNumber: number } | null>(null);
  const [orderDetailModal, setOrderDetailModal] = useState<OrderResponse | null>(null);
  const [editOrderModal, setEditOrderModal] = useState<OrderResponse | null>(null);
  const { t } = useI18n();

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (orderStatusFilter !== 'All') {
      filtered = filtered.filter(o => o.status === orderStatusFilter);
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      filtered = filtered.filter(o =>
        o.clientName.toLowerCase().includes(q) ||
        String(o.orderNumber).includes(q)
      );
    }
    return filtered;
  }, [orders, orderStatusFilter, orderSearch]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    if (!window.electron) { setIsLoadingOrders(false); return; }
    setIsLoadingOrders(true);
    try {
      const result = await window.electron.getOrders();
      if (result.success) setOrders(result.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  function handleOrderCreated(order: { id: string; orderNumber: number; clientName: string }) {
    setShowCreateOrder(false);
    setOrderItemsModal({ orderId: order.id, orderNumber: order.orderNumber });
  }

  async function handleOrderItemsDone() {
    setOrderItemsModal(null);
    await loadOrders();
  }

  async function handleStartProduction(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.updateOrder(id, { status: 'in_production' });
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'in_production' } : o));
        // Show auto-deduction feedback if stock was applied
        const items = result.data.orderItems ?? [];
        const applied = items.filter(i => i.boxesAssembled && i.boxesAssembled > 0);
        if (applied.length > 0) {
          const details = applied.map(i => `${i.product?.serialNumber ?? 'Product'}: ${i.boxesAssembled} box${i.boxesAssembled !== 1 ? 'es' : ''} from stock`).join('\n');
          alert(`Stock auto-applied:\n${details}`);
        }
      } else {
        alert(result.error || 'Cannot start production');
        await loadOrders();
      }
    } catch (err) {
      console.error('Failed to start production:', err);
    }
  }

  async function handleShipOrder(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.updateOrder(id, { status: 'shipped' });
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped', shippedAt: new Date() } : o));
      } else {
        alert(result.error || 'Cannot ship order');
      }
    } catch (err) {
      console.error('Failed to ship order:', err);
    }
  }

  async function handleDeleteOrder(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteOrder(id);
      if (result.success) {
        setOrders(prev => prev.filter(o => o.id !== id));
      } else {
        alert(result.error || 'Failed to delete order');
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      throw err;
    }
  }

  async function handleOrderClick(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.getOrderById(id);
      if (result.success && result.data) {
        setOrderDetailModal(result.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'pending', 'in_production', 'shipped'].map(status => {
            const labels: Record<string, string> = { All: t('common.all'), pending: t('orders.pending'), in_production: t('orders.inProduction'), shipped: t('orders.shipped') };
            const count = status === 'All' ? orders.length : orders.filter(o => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setOrderStatusFilter(status)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  orderStatusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {labels[status]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={() => setShowCreateOrder(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('orders.newOrder')}
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoadingOrders ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {orders.length === 0 ? t('orders.noOrders') : t('orders.noMatch')}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {orders.length === 0 ? t('orders.noOrdersHint') : t('orders.noMatchHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStartProduction={handleStartProduction}
              onShip={handleShipOrder}
              onDelete={handleDeleteOrder}
              onClick={handleOrderClick}
              onEdit={(o) => {
                if (o.status === 'shipped') return;
                setEditOrderModal(o);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateOrderModal
        isOpen={showCreateOrder}
        onClose={() => setShowCreateOrder(false)}
        onCreated={handleOrderCreated}
      />

      <OrderItemsModal
        isOpen={!!orderItemsModal}
        orderId={orderItemsModal?.orderId || null}
        orderNumber={orderItemsModal?.orderNumber || 0}
        onClose={() => { setOrderItemsModal(null); loadOrders(); }}
        onDone={handleOrderItemsDone}
      />

      <OrderDetailModal
        isOpen={!!orderDetailModal}
        order={orderDetailModal}
        onClose={() => setOrderDetailModal(null)}
      />

      {editOrderModal && (
        <EditOrderModal
          order={editOrderModal}
          onClose={() => setEditOrderModal(null)}
          onSaved={() => { setEditOrderModal(null); loadOrders(); }}
        />
      )}
    </div>
  );
}

// ── Edit Order Modal ────────────────────────────────────────

function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: OrderResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(order.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.updateOrder(order.id, { notes });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || 'Failed to update order');
      }
    } catch {
      alert('Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('orders.editOrder')}</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Order #{order.orderNumber} — {order.clientName}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">{t('orders.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('orders.notes')}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
